---
title: "认证 API 实现"
description: "Iwan Station Gin 文档：认证 API 实现。"
---

# 认证 API 实现

::: tip 阅读建议
本页既有完整代码，也有接口调用示例。建议按“注册 -> 登录 -> 获取信息 -> 修改密码”的顺序阅读，并结合下方的 `curl` 与原始 HTTP 示例交叉理解接口设计。
:::

## 页面导航

[[toc]]

## 学习目标

完成本章后，你将：
- ✅ 实现用户注册接口
- ✅ 实现用户登录接口
- ✅ 实现获取用户信息接口
- ✅ 实现密码修改接口

## 认证 API 概览

```
POST   /api/v1/auth/register    # 用户注册
POST   /api/v1/auth/login       # 用户登录
GET    /api/v1/auth/info        # 获取用户信息
POST   /api/v1/auth/logout      # 用户登出
POST   /api/v1/auth/refresh     # 刷新 Token
POST   /api/v1/auth/password    # 修改密码
```

## 用户注册接口

### Service 层实现

```go
// internal/service/auth.go
package service

import (
	"context"
	"errors"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/pkg/crypt"
	"iwan-station-gin/internal/repository"
)

var (
	ErrUserAlreadyExists = errors.New("username already exists")
	ErrEmailAlreadyExists = errors.New("email already exists")
)

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname" binding:"required"`
	Email    string `json:"email" binding:"omitempty,email"`
}

// Register 用户注册
func (s *AuthService) Register(ctx context.Context, req *RegisterRequest) error {
	// 1. 检查用户名是否已存在
	existUser, _ := s.repos.User.FindByUsername(ctx, req.Username)
	if existUser != nil {
		return ErrUserAlreadyExists
	}

	// 2. 检查邮箱是否已存在（如果提供）
	if req.Email != "" {
		existUser, _ = s.repos.User.FindByEmail(ctx, req.Email)
		if existUser != nil {
			return ErrEmailAlreadyExists
		}
	}

	// 3. 加密密码
	hashedPassword, err := crypt.HashPassword(req.Password)
	if err != nil {
		return err
	}

	// 4. 创建用户
	user := &model.User{
		Username: req.Username,
		Password: hashedPassword,
		Nickname: req.Nickname,
		Email:    req.Email,
		Status:   1, // 默认启用
	}

	return s.repos.User.Create(ctx, user)
}
```

### API 层实现

```go
// internal/api/v1/auth.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register 用户注册
// @Summary 用户注册
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body service.RegisterRequest true "注册信息"
// @Success 200 {object} response.Response
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	// 解析请求
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service
	if err := h.authService.Register(c.Request.Context(), &req); err != nil {
		// 处理业务错误
		if errors.Is(err, service.ErrUserAlreadyExists) {
			response.ErrorWithMessage(c, "用户名已存在", 400)
			return
		}
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			response.ErrorWithMessage(c, "邮箱已被使用", 400)
			return
		}
		response.Error(c, response.InternalServerError)
		return
	}

	response.SuccessWithMessage(c, nil, "注册成功")
}
```

### 请求示例

::: code-group

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "nickname": "测试用户",
    "email": "test@example.com"
  }'
```

```http
POST /api/v1/auth/register HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "nickname": "测试用户",
  "email": "test@example.com"
}
```

:::

### 响应示例

```json
{
  "code": 200,
  "message": "注册成功",
  "data": null
}
```

## 用户登录接口

### Service 层实现

```go
// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token      string      `json:"token"`
	ExpireTime int64       `json:"expire_time"`
	User       *model.User `json:"user"`
	Roles      []string    `json:"roles"`
	Permissions []string   `json:"permissions"`
}

// Login 用户登录
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// 1. 验证用户凭据
	user, err := s.repos.Auth.ValidateUser(ctx, req.Username, req.Password, crypt.ComparePassword)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidCredentials) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	// 2. 检查用户状态
	if user.Status != 1 {
		return nil, errors.New("用户账号已被禁用")
	}

	// 3. 生成 JWT Token
	token, err := s.jwtMgr.GenerateToken(user.ID, user.Username)
	if err != nil {
		s.logger.Error("Failed to generate token",
			s.logger.With("error", err),
			s.logger.With("user_id", user.ID))
		return nil, err
	}

	// 4. 获取用户角色
	roles, err := s.repos.User.GetRoles(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to get user roles",
			s.logger.With("error", err),
			s.logger.With("user_id", user.ID))
		roles = []*model.Role{} // 不影响登录流程
	}

	roleCodes := make([]string, len(roles))
	for i, role := range roles {
		roleCodes[i] = role.Code
	}

	// 5. 获取用户权限
	permissions, err := s.getUserPermissions(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to get user permissions",
			s.logger.With("error", err),
			s.logger.With("user_id", user.ID))
		permissions = []string{} // 不影响登录流程
	}

	// 6. 清除密码
	user.Password = ""

	// 7. 记录登录日志
	s.logLogin(ctx, user, true, "")

	return &LoginResponse{
		Token:      token,
		ExpireTime: time.Now().Add(24 * time.Hour).Unix(),
		User:       user,
		Roles:      roleCodes,
		Permissions: permissions,
	}, nil
}

// getUserPermissions 获取用户权限
func (s *AuthService) getUserPermissions(ctx context.Context, userID uint64) ([]string, error) {
	roleIDs, err := s.repos.User.GetRoleIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	return s.repos.Menu.GetPermissions(ctx, roleIDs)
}

// logLogin 记录登录日志
func (s *AuthService) logLogin(ctx context.Context, user *model.User, success bool, errMsg string) {
	// 实现登录日志记录
	// ...
}
```

### API 层实现

```go
// Login 用户登录
// @Summary 用户登录
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body service.LoginRequest true "登录信息"
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	// 解析请求
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service
	resp, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		response.ErrorWithMessage(c, err.Error(), 401)
		return
	}

	response.Success(c, resp)
}
```

### 请求示例

::: code-group

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

```http
POST /api/v1/auth/login HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

:::

### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expire_time": 1713206400,
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "管理员",
      "email": "admin@example.com",
      "avatar": "",
      "status": 1,
      "created_at": "2024-01-01 00:00:00"
    },
    "roles": ["admin"],
    "permissions": ["user:list", "user:create", "user:update", "user:delete"]
  }
}
```

## 获取用户信息接口

### Service 层实现

```go
// GetUserInfo 获取用户信息
func (s *AuthService) GetUserInfo(ctx context.Context, userID uint64) (*LoginResponse, error) {
	// 1. 查询用户
	user, err := s.repos.User.FindByID(ctx, userID)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	// 2. 获取角色
	roles, err := s.repos.User.GetRoles(ctx, user.ID)
	if err != nil {
		roles = []*model.Role{}
	}

	roleCodes := make([]string, len(roles))
	for i, role := range roles {
		roleCodes[i] = role.Code
	}

	// 3. 获取权限
	permissions, err := s.getUserPermissions(ctx, user.ID)
	if err != nil {
		permissions = []string{}
	}

	// 4. 清除密码
	user.Password = ""

	return &LoginResponse{
		User:        user,
		Roles:       roleCodes,
		Permissions: permissions,
	}, nil
}
```

### API 层实现

```go
// GetInfo 获取用户信息
// @Summary 获取用户信息
// @Tags 认证
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/info [get]
func (h *AuthHandler) GetInfo(c *gin.Context) {
	// 从上下文获取用户ID（由认证中间件设置）
	userID := GetUserIDFromContext(c)
	if userID == 0 {
		response.Error(c, response.Unauthorized)
		return
	}

	// 调用 Service
	userInfo, err := h.authService.GetUserInfo(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, response.NotFound)
		return
	}

	response.Success(c, userInfo)
}
```

### 请求示例

::: code-group

```bash
curl -X GET http://localhost:8080/api/v1/auth/info \
  -H "Authorization: Bearer YOUR_TOKEN"
```

```http
GET /api/v1/auth/info HTTP/1.1
Host: localhost:8080
Authorization: Bearer YOUR_TOKEN
```

:::

## 修改密码接口

### Service 层实现

```go
// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword 修改密码
func (s *AuthService) ChangePassword(ctx context.Context, userID uint64, req *ChangePasswordRequest) error {
	// 1. 查询用户
	user, err := s.repos.User.FindByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}

	// 2. 验证旧密码
	if !crypt.ComparePassword(user.Password, req.OldPassword) {
		return errors.New("原密码错误")
	}

	// 3. 加密新密码
	hashedPassword, err := crypt.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	// 4. 更新密码
	user.Password = hashedPassword
	return s.repos.User.Update(ctx, user)
}
```

### API 层实现

```go
// ChangePassword 修改密码
// @Summary 修改密码
// @Tags 认证
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body service.ChangePasswordRequest true "密码信息"
// @Success 200 {object} response.Response
// @Router /api/v1/auth/password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	// 获取用户ID
	userID := GetUserIDFromContext(c)
	if userID == 0 {
		response.Error(c, response.Unauthorized)
		return
	}

	// 解析请求
	var req service.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service
	if err := h.authService.ChangePassword(c.Request.Context(), userID, &req); err != nil {
		response.ErrorWithMessage(c, err.Error(), 400)
		return
	}

	response.SuccessWithMessage(c, nil, "密码修改成功")
}
```

### 请求示例

::: code-group

```bash
curl -X POST http://localhost:8080/api/v1/auth/password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "oldpass123",
    "new_password": "newpass456"
  }'
```

```http
POST /api/v1/auth/password HTTP/1.1
Host: localhost:8080
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "old_password": "oldpass123",
  "new_password": "newpass456"
}
```

:::

## 路由注册

```go
// internal/router/auth.go
package router

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes 注册认证路由
func RegisterAuthRoutes(
	r *gin.Engine,
	authHandler *v1.AuthHandler,
	authMiddleware *middleware.AuthMiddleware,
) {
	authGroup := r.Group("/api/v1/auth")
	{
		// 公开接口
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)

		// 需要认证的接口
		authenticated := authGroup.Group("")
		authenticated.Use(authMiddleware.Authenticate())
		{
			authenticated.GET("/info", authHandler.GetInfo)
			authenticated.POST("/logout", authHandler.Logout)
			authenticated.POST("/password", authHandler.ChangePassword)
			authenticated.POST("/refresh", authHandler.RefreshToken)
		}
	}
}
```

## 统一响应格式

```go
// internal/pkg/response/response.go
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// 预定义错误码
const (
	Success             = 200
	InvalidParams       = 400
	Unauthorized        = 401
	TokenExpired        = 401
	InvalidToken        = 401
	Forbidden           = 403
	NotFound            = 404
	InternalServerError = 500
)

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    Success,
		Message: "success",
		Data:    data,
	})
}

// SuccessWithMessage 成功响应（带消息）
func SuccessWithMessage(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    Success,
		Message: message,
		Data:    data,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int) {
	message := getErrorMessage(code)
	c.JSON(getHTTPStatus(code), Response{
		Code:    code,
		Message: message,
	})
}

// ErrorWithMessage 错误响应（自定义消息）
func ErrorWithMessage(c *gin.Context, message string, code int) {
	c.JSON(getHTTPStatus(code), Response{
		Code:    code,
		Message: message,
	})
}

func getErrorMessage(code int) string {
	messages := map[int]string{
		InvalidParams:       "参数验证失败",
		Unauthorized:        "未授权",
		TokenExpired:        "Token 已过期",
		InvalidToken:        "Token 无效",
		Forbidden:           "无权限访问",
		NotFound:            "资源不存在",
		InternalServerError: "服务器内部错误",
	}
	if msg, ok := messages[code]; ok {
		return msg
	}
	return "未知错误"
}

func getHTTPStatus(code int) int {
	statusMap := map[int]int{
		InvalidParams:       http.StatusBadRequest,
		Unauthorized:        http.StatusUnauthorized,
		TokenExpired:        http.StatusUnauthorized,
		InvalidToken:        http.StatusUnauthorized,
		Forbidden:           http.StatusForbidden,
		NotFound:            http.StatusNotFound,
		InternalServerError: http.StatusInternalServerError,
	}
	if status, ok := statusMap[code]; ok {
		return status
	}
	return http.StatusOK
}
```

## 测试

### 单元测试

```go
// internal/service/auth_test.go
package service_test

import (
	"context"
	"testing"
	"iwan-station-gin/internal/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock 模拟测试
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func TestAuthService_Login(t *testing.T) {
	// 设置 mock
	mockRepo := new(MockUserRepository)
	mockRepo.On("FindByUsername", mock.Anything, "admin").Return(&model.User{
		ID:       1,
		Username: "admin",
		Password: "$2a$10$...", // 加密后的密码
	}, nil)

	// 创建 Service
	authService := service.NewAuthService(repos, cfg, logger)

	// 测试登录
	resp, err := authService.Login(context.Background(), &service.LoginRequest{
		Username: "admin",
		Password: "admin123",
	})

	// 断言
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, "admin", resp.User.Username)
}
```

## 最佳实践

### ✅ 应该做的

1. **密码加密**：永远不要存储明文密码
2. **输入验证**：在 API 和 Service 层都验证
3. **错误处理**：区分不同类型的错误
4. **日志记录**：记录登录等敏感操作
5. **统一响应**：使用统一的响应格式

### ❌ 不应该做的

1. **返回敏感信息**：不要在响应中包含密码
2. **硬编码错误消息**：使用预定义的错误码
3. **忽略错误**：始终检查和处理错误
4. **过度信任客户端**：服务端必须验证所有输入

## 下一步

认证 API 实现完成后，让我们学习「[认证中间件](./auth-middleware)」


