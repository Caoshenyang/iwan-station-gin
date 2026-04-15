# 分层架构设计

## 学习目标

完成本章后，你将：
- ✅ 理解四层架构的设计原理
- ✅ 掌握各层的职责划分
- ✅ 学会层间数据传递模式
- ✅ 了解错误处理最佳实践

## 什么是分层架构？

分层架构是将应用程序按职责划分为多个层次，每层只与相邻层通信。对于从 Java Spring 转过来的开发者，这是熟悉的模式：

```
┌─────────────────────────────────────────┐
│         API Layer (Handler)             │  ← 接收 HTTP 请求
├─────────────────────────────────────────┤
│         Service Layer                   │  ← 业务逻辑处理
├─────────────────────────────────────────┤
│         Repository Layer                │  ← 数据访问
├─────────────────────────────────────────┤
│         Model Layer                     │  ← 数据模型
└─────────────────────────────────────────┘
```

## 四层架构详解

### 与 Spring Boot 对照

| Spring Boot | Go | 职责 |
|-------------|-----|------|
| @Controller | Handler/API | 处理 HTTP 请求/响应 |
| @Service | Service | 业务逻辑 |
| Repository/Mapper | Repository | 数据访问 |
| Entity/DTO | Model/Struct | 数据结构 |

## 第一层：API 层（Handler）

### 职责

- 接收和验证 HTTP 请求
- 调用 Service 层处理业务
- 返回 HTTP 响应
- 不包含业务逻辑

### 示例代码

创建 `internal/api/v1/user.go`：

```go
package v1

import (
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserHandler 用户 API 处理器
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler 创建用户处理器
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// ListRequest 获取用户列表请求
type ListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=10"`
	Keyword  string `form:"keyword"`
}

// List 获取用户列表
// @Summary 获取用户列表
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} response.Response
// @Router /api/v1/user/list [get]
func (h *UserHandler) List(c *gin.Context) {
	// 解析请求参数
	var req ListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service 层
	users, total, err := h.userService.List(c.Request.Context(), req.Page, req.PageSize, req.Keyword)
	if err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	// 返回响应
	response.Success(c, gin.H{
		"list":  users,
		"total": total,
	})
}

// GetByIDRequest 获取用户详情请求
type GetByIDRequest struct {
	ID uint64 `uri:"id" binding:"required"`
}

// GetByID 获取用户详情
func (h *UserHandler) GetByID(c *gin.Context) {
	// 解析 URI 参数
	var req GetByIDRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service 层
	user, err := h.userService.GetByID(c.Request.Context(), req.ID)
	if err != nil {
		response.Error(c, response.NotFound)
		return
	}

	response.Success(c, user)
}

// CreateRequest 创建用户请求
type CreateRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname"`
	Email    string `json:"email" binding:"omitempty,email"`
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	// 解析请求体
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service 层
	user := &model.User{
		Username: req.Username,
		Password: req.Password,
		Nickname: req.Nickname,
		Email:    req.Email,
		Status:   1,
	}

	if err := h.userService.Create(c.Request.Context(), user); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, user)
}

// UpdateRequest 更新用户请求
type UpdateRequest struct {
	ID       uint64 `uri:"id" binding:"required"`
	Nickname string `json:"nickname"`
	Email    string `json:"email" binding:"omitempty,email"`
	Status   int    `json:"status"`
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	// 解析 URI 参数
	var uriReq GetByIDRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 解析请求体
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service 层
	user := &model.User{
		BaseModel: model.BaseModel{ID: uriReq.ID},
		Nickname:  req.Nickname,
		Email:     req.Email,
		Status:    req.Status,
	}

	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, nil)
}

// Delete 删除用户
func (h *UserHandler) Delete(c *gin.Context) {
	// 解析 URI 参数
	var req GetByIDRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 调用 Service 层
	if err := h.userService.Delete(c.Request.Context(), req.ID); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, nil)
}
```

### API 层最佳实践

1. **只处理 HTTP 相关逻辑**：参数解析、响应格式化
2. **不包含业务逻辑**：业务逻辑放在 Service 层
3. **统一的响应格式**：使用 response 包
4. **参数验证**：使用 binding 标签

## 第二层：Service 层

### 职责

- 实现业务逻辑
- 事务管理
- 调用 Repository 层
- 数据转换和验证

### 示例代码

创建 `internal/service/user.go`：

```go
package service

import (
	"context"
	"errors"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/pkg/crypt"
	"iwan-station-gin/internal/repository"
)

var (
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrUserNotFound      = errors.New("user not found")
)

// UserService 用户业务逻辑
type UserService struct {
	repos *repository.Repositories
}

// NewUserService 创建用户服务
func NewUserService(repos *repository.Repositories) *UserService {
	return &UserService{
		repos: repos,
	}
}

// List 获取用户列表
func (s *UserService) List(ctx context.Context, page, pageSize int, keyword string) ([]*model.User, int64, error) {
	// 参数验证
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 调用 Repository 层
	users, err := s.repos.User.List(ctx, keyword, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	// 获取总数
	total, err := s.repos.User.Count(ctx, keyword)
	if err != nil {
		return nil, 0, err
	}

	// 清除密码
	for _, user := range users {
		user.Password = ""
	}

	return users, total, nil
}

// GetByID 根据 ID 获取用户
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	user, err := s.repos.User.FindByID(ctx, id)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// 清除密码
	user.Password = ""

	return user, nil
}

// Create 创建用户
func (s *UserService) Create(ctx context.Context, user *model.User) error {
	// 业务逻辑：检查用户名是否存在
	existUser, err := s.repos.User.FindByUsername(ctx, user.Username)
	if err == nil && existUser != nil {
		return ErrUserAlreadyExists
	}

	// 业务逻辑：加密密码
	hashedPassword, err := crypt.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword

	// 设置默认状态
	if user.Status == 0 {
		user.Status = 1
	}

	// 调用 Repository 层
	return s.repos.User.Create(ctx, user)
}

// Update 更新用户
func (s *UserService) Update(ctx context.Context, user *model.User) error {
	// 检查用户是否存在
	existUser, err := s.repos.User.FindByID(ctx, user.ID)
	if err != nil {
		return ErrUserNotFound
	}

	// 业务逻辑：不允许修改用户名和密码
	user.Username = existUser.Username
	user.Password = existUser.Password

	// 调用 Repository 层
	return s.repos.User.Update(ctx, user)
}

// Delete 删除用户
func (s *UserService) Delete(ctx context.Context, id uint64) error {
	// 检查用户是否存在
	_, err := s.repos.User.FindByID(ctx, id)
	if err != nil {
		return ErrUserNotFound
	}

	// 业务逻辑：不允许删除管理员
	if id == 1 {
		return errors.New("cannot delete admin user")
	}

	// 调用 Repository 层
	return s.repos.User.Delete(ctx, id)
}
```

### Service 层最佳实践

1. **业务逻辑集中**：所有业务规则在这里实现
2. **事务管理**：复杂操作使用数据库事务
3. **错误包装**：定义业务错误类型
4. **数据验证**：在持久化前验证数据

## 第三层：Repository 层

### 职责

- 封装数据访问逻辑
- 与数据库交互
- 提供 CRUD 操作
- 不包含业务逻辑

### 示例代码

创建 `internal/repository/user.go`：

```go
package repository

import (
	"context"
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// UserRepository 用户数据访问
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建用户仓库
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create 创建用户
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// FindByID 根据 ID 查找用户
func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername 根据用户名查找用户
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// List 获取用户列表
func (r *UserRepository) List(ctx context.Context, keyword string, limit, offset int) ([]*model.User, error) {
	var users []*model.User
	query := r.db.WithContext(ctx).Model(&model.User{})

	// 关键词搜索
	if keyword != "" {
		query = query.Where("username LIKE ? OR nickname LIKE ? OR email LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	err := query.Limit(limit).Offset(offset).Find(&users).Error
	return users, err
}

// Count 统计用户数量
func (r *UserRepository) Count(ctx context.Context, keyword string) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.User{})

	if keyword != "" {
		query = query.Where("username LIKE ? OR nickname LIKE ? OR email LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	err := query.Count(&count).Error
	return count, err
}

// Update 更新用户
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// Delete 删除用户（软删除）
func (r *UserRepository) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// GetRoles 获取用户角色
func (r *UserRepository) GetRoles(ctx context.Context, userID uint64) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.WithContext(ctx).
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error
	return roles, err
}

// GetRoleIDs 获取用户角色 ID 列表
func (r *UserRepository) GetRoleIDs(ctx context.Context, userID uint64) ([]uint64, error) {
	var roleIDs []uint64
	err := r.db.WithContext(ctx).
		Model(&model.UserRole{}).
		Where("user_id = ?", userID).
		Pluck("role_id", &roleIDs).Error
	return roleIDs, err
}
```

### Repository 层最佳实践

1. **只处理数据访问**：不包含业务逻辑
2. **使用 Context**：支持超时和取消
3. **返回领域对象**：返回 Model 而不是数据库实体
4. **方法命名清晰**：Create, Find, Update, Delete

## 第四层：Model 层

### 职责

- 定义数据结构
- 数据库映射
- 数据验证规则

### 示例代码

创建 `internal/model/user.go`：

```go
package model

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel 基础模型
type BaseModel struct {
	ID        uint64         `gorm:"primary_key;auto_increment" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// User 用户模型
type User struct {
	BaseModel
	Username string `gorm:"type:varchar(50);uniqueIndex;not null" json:"username" binding:"required"`
	Password string `gorm:"type:varchar(255);not null" json:"-" binding:"required,min=6"`
	Nickname string `gorm:"type:varchar(50)" json:"nickname" binding:"required"`
	Email    string `gorm:"type:varchar(100);uniqueIndex" json:"email" binding:"omitempty,email"`
	Phone    string `gorm:"type:varchar(20)" json:"phone"`
	Avatar   string `gorm:"type:varchar(255)" json:"avatar"`
	Status   int    `gorm:"type:tinyint;default:1;comment:1=active,0=disabled" json:"status"`
	Remark   string `gorm:"type:varchar(255)" json:"remark"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
```

## 层间数据传递

### 请求流转

```
HTTP Request
    ↓
API Layer (解析请求)
    ↓
Service Layer (业务逻辑)
    ↓
Repository Layer (数据访问)
    ↓
Database
    ↓
Repository Layer (返回数据)
    ↓
Service Layer (处理数据)
    ↓
API Layer (格式化响应)
    ↓
HTTP Response
```

### Context 传递

所有层都应该接受 `context.Context` 参数：

```go
// API 层
func (h *UserHandler) GetByID(c *gin.Context) {
    user, err := h.userService.GetByID(c.Request.Context(), id)
    // ...
}

// Service 层
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
    return s.repos.User.FindByID(ctx, id)
}

// Repository 层
func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
    return r.db.WithContext(ctx).First(&user, id).Error
}
```

## 错误处理

### 错误传播原则

```
Repository 层 → 返回原始错误
Service 层 → 包装为业务错误
API 层 → 转换为 HTTP 状态码
```

### 示例

```go
// Repository 层：返回数据库错误
func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, id).Error
    return &user, err  // 返回原始错误
}

// Service 层：包装为业务错误
var ErrUserNotFound = errors.New("user not found")

func (s *UserService) GetByID(ctx context.Context, id uint64) (*User, error) {
    user, err := s.repos.User.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, err
    }
    return user, nil
}

// API 层：转换为 HTTP 响应
func (h *UserHandler) GetByID(c *gin.Context) {
    user, err := h.userService.GetByID(c.Request.Context(), id)
    if err != nil {
        if errors.Is(err, service.ErrUserNotFound) {
            response.Error(c, response.NotFound)
        } else {
            response.Error(c, response.InternalServerError)
        }
        return
    }
    response.Success(c, user)
}
```

## 依赖注入

### 手动注入示例

```go
// main.go
func main() {
    // 初始化数据库
    db := database.InitMySQL(cfg)

    // 初始化 Repository 层
    userRepo := repository.NewUserRepository(db)
    roleRepo := repository.NewRoleRepository(db)
    repos := &repository.Repositories{
        User: userRepo,
        Role: roleRepo,
    }

    // 初始化 Service 层
    userService := service.NewUserService(repos)
    authService := service.NewAuthService(repos, cfg)

    // 初始化 API 层
    userHandler := v1.NewUserHandler(userService)
    authHandler := v1.NewAuthHandler(authService)

    // 注册路由
    r := gin.Default()
    v1.SetupUserRoutes(r, userHandler)
}
```

## 最佳实践总结

### ✅ 应该做的

1. **保持层次清晰**：不要跨层调用
2. **单一职责**：每层只做自己的事
3. **接口抽象**：层之间通过接口通信
4. **Context 传递**：支持超时和取消
5. **错误处理**：逐层包装和转换

### ❌ 不应该做的

1. **API 层包含业务逻辑**：业务逻辑放在 Service 层
2. **Service 层直接访问数据库**：通过 Repository 层
3. **Repository 层包含业务规则**：只负责数据访问
4. **跨层调用**：API 不应直接调用 Repository

## 下一步

理解分层架构后，让我们学习「[依赖注入](./dependency-injection.html)」
