---
title: "认证中间件"
description: "中间件是在请求处理前后执行的函数，类似于 Java Servlet Filter 或 Spring Interceptor。"
---

# 认证中间件

## 学习目标

完成本章后，你将：
- ✅ 理解 Gin 中间件的工作原理
- ✅ 实现 JWT Token 验证
- ✅ 学会用户上下文传递
- ✅ 掌握可选认证中间件

## 什么是中间件？

中间件是在请求处理前后执行的函数，类似于 Java Servlet Filter 或 Spring Interceptor。

### 与 Java 对比

| Java (Spring) | Go (Gin) | 说明 |
|---------------|----------|------|
| Filter | Middleware | 请求/响应拦截 |
| Interceptor | Middleware | 方法调用拦截 |
| @PreAuthorize | Middleware | 权限检查 |

### 中间件执行流程

```
请求 → 中间件1 → 中间件2 → Handler → 中间件2 → 中间件1 → 响应
         ↓           ↓                              ↑           ↑
        Before      Before                        After       After
```

## JWT 认证中间件

### 中间件结构

```go
// internal/middleware/auth.go
package middleware

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/pkg/jwt"
	"iwan-station-gin/internal/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT 认证中间件
type AuthMiddleware struct {
	jwtMgr *jwt.Manager
}

// NewAuthMiddleware 创建认证中间件
func NewAuthMiddleware(jwtMgr *jwt.Manager) *AuthMiddleware {
	return &AuthMiddleware{
		jwtMgr: jwtMgr,
	}
}
```

### 必需认证中间件

```go
// Authenticate 验证 JWT Token
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 从 Header 获取 Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, response.Unauthorized)
			c.Abort()
			return
		}

		// 2. 检查 Bearer 前缀
		const prefix = "Bearer "
		if len(authHeader) < len(prefix) || authHeader[:len(prefix)] != prefix {
			response.Error(c, response.InvalidToken)
			c.Abort()
			return
		}

		// 3. 提取 Token
		token := authHeader[len(prefix):]
		if token == "" {
			response.Error(c, response.InvalidToken)
			c.Abort()
			return
		}

		// 4. 解析 Token
		claims, err := m.jwtMgr.ParseToken(token)
		if err != nil {
			if err == jwt.ErrTokenExpired {
				response.Error(c, response.TokenExpired)
			} else {
				response.Error(c, response.InvalidToken)
			}
			c.Abort()
			return
		}

		// 5. 设置用户上下文
		v1.SetUserContext(c, claims)

		// 6. 继续处理请求
		c.Next()
	}
}
```

### 可选认证中间件

```go
// OptionalAuth 可选认证
// 允许没有 Token 的请求通过，如果有 Token 则解析
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 尝试获取 Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next() // 没有 Token，直接放行
			return
		}

		// 2. 检查 Bearer 前缀
		const prefix = "Bearer "
		if len(authHeader) < len(prefix) || authHeader[:len(prefix)] != prefix {
			c.Next() // 格式不对，直接放行
			return
		}

		// 3. 提取并解析 Token
		token := authHeader[len(prefix):]
		claims, err := m.jwtMgr.ParseToken(token)
		if err == nil {
			// Token 有效，设置用户上下文
			v1.SetUserContext(c, claims)
		}
		// Token 无效也放行，由业务层决定

		c.Next()
	}
}
```

## 用户上下文管理

### 上下文键定义

```go
// internal/api/v1/context.go
package v1

import (
	"iwan-station-gin/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
)

// 上下文键
const (
	UserIDKey   = "user_id"
	UsernameKey = "username"
	ClaimsKey   = "claims"
	RolesKey    = "roles"
)

// SetUserContext 设置用户上下文
func SetUserContext(c *gin.Context, claims *jwt.Claims) {
	c.Set(UserIDKey, claims.UserID)
	c.Set(UsernameKey, claims.Username)
	c.Set(ClaimsKey, claims)
}

// GetUserIDFromContext 从上下文获取用户 ID
func GetUserIDFromContext(c *gin.Context) uint64 {
	if userID, exists := c.Get(UserIDKey); exists {
		if id, ok := userID.(uint64); ok {
			return id
		}
	}
	return 0
}

// GetUsernameFromContext 从上下文获取用户名
func GetUsernameFromContext(c *gin.Context) string {
	if username, exists := c.Get(UsernameKey); exists {
		if name, ok := username.(string); ok {
			return name
		}
	}
	return ""
}

// GetClaimsFromContext 从上下文获取 Claims
func GetClaimsFromContext(c *gin.Context) *jwt.Claims {
	if claims, exists := c.Get(ClaimsKey); exists {
		if c, ok := claims.(*jwt.Claims); ok {
			return c
		}
	}
	return nil
}
```

### 在 Handler 中使用

```go
// internal/api/v1/user.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// GetProfile 获取当前用户资料
func (h *UserHandler) GetProfile(c *gin.Context) {
	// 从上下文获取用户 ID
	userID := GetUserIDFromContext(c)
	if userID == 0 {
		response.Error(c, response.Unauthorized)
		return
	}

	// 调用 Service
	user, err := h.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, response.NotFound)
		return
	}

	response.Success(c, user)
}

// UpdateProfile 更新当前用户资料
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	// 获取用户 ID
	userID := GetUserIDFromContext(c)

	// 解析请求
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 更新用户信息
	if err := h.userService.UpdateProfile(c.Request.Context(), userID, &req); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, nil)
}
```

## 路由中使用中间件

### 全局中间件

```go
// internal/router/router.go
package router

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/middleware"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// Setup 设置路由
func Setup(
	r *gin.Engine,
	services *service.Services,
	authMiddleware *middleware.AuthMiddleware,
	permMiddleware *middleware.PermissionMiddleware,
) {
	// 全局中间件
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())

	// 健康检查（无需认证）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 组
	v1Group := r.Group("/api/v1")
	{
		// 认证路由（公开）
		auth := v1Group.Group("/auth")
		{
			auth.POST("/register", handlers.Auth.Register)
			auth.POST("/login", handlers.Auth.Login)
		}

		// 需要认证的路由
		authenticated := v1Group.Group("")
		authenticated.Use(authMiddleware.Authenticate())
		{
			// 用户信息
			authenticated.GET("/auth/info", handlers.Auth.GetInfo)
			authenticated.POST("/auth/logout", handlers.Auth.Logout)

			// 用户管理（需要认证 + 权限）
			users := authenticated.Group("/user")
			users.Use(permMiddleware.CheckPermission())
			{
				users.GET("/list", handlers.User.List)
				users.GET("/:id", handlers.User.GetByID)
				users.POST("", handlers.User.Create)
				users.PUT("/:id", handlers.User.Update)
				users.DELETE("/:id", handlers.User.Delete)
			}
		}
	}
}
```

### 分组路由

```go
// 公开路由
public := r.Group("/api/v1/public")
{
	public.GET("/articles", handlers.Article.List)
	public.GET("/articles/:id", handlers.Article.GetByID)
}

// 认证路由
auth := r.Group("/api/v1")
auth.Use(authMiddleware.Authenticate())
{
	auth.GET("/user/profile", handlers.User.GetProfile)
}

// 管理员路由
admin := r.Group("/api/v1/admin")
admin.Use(authMiddleware.Authenticate())
admin.Use(permMiddleware.RequireRole("admin"))
{
	admin.GET("/users", handlers.Admin.ListUsers)
	admin.DELETE("/users/:id", handlers.Admin.DeleteUser)
}
```

## 常用中间件

### CORS 中间件

```go
// internal/middleware/cors.go
package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		origin := c.Request.Header.Get("Origin")

		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
		c.Header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")
		c.Header("Access-Control-Allow-Credentials", "true")

		// 放行所有 OPTIONS 方法
		if method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

### 请求 ID 中间件

```go
// internal/middleware/request_id.go
package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const RequestIDKey = "request_id"

// RequestID 请求 ID 中间件
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 Header 获取或生成新的
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set(RequestIDKey, requestID)
		c.Header("X-Request-ID", requestID)

		c.Next()
	}
}
```

### 日志中间件

```go
// internal/middleware/logger.go
package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger 日志中间件
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 开始时间
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 计算延迟
		latency := time.Since(start)

		// 获取请求 ID
		requestID, _ := c.Get(RequestIDKey)

		// 记录日志
		logger.Info("HTTP Request",
			zap.Any("request_id", requestID),
			zap.Int("status", c.Writer.Status()),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", c.ClientIP()),
			zap.String("user-agent", c.Request.UserAgent()),
			zap.Duration("latency", latency),
		)
	}
}
```

### 恢复中间件

```go
// internal/middleware/recovery.go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery 恢复中间件
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 记录 panic
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
				)

				// 返回 500
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "Internal Server Error",
				})
				c.Abort()
			}
		}()

		c.Next()
	}
}
```

## 中间件执行顺序

### 示例：认证 + 权限检查

```go
// 路由定义
admin := r.Group("/api/v1/admin")
admin.Use(
	middleware.CORS(),              // 1. CORS
	middleware.RequestID(),         // 2. 请求 ID
	middleware.Logger(logger),      // 3. 日志
	authMiddleware.Authenticate(),  // 4. 认证
	permMiddleware.RequireRole("admin"), // 5. 权限检查
)
{
	admin.GET("/users", handlers.Admin.ListUsers)
}
```

### 执行流程

```
请求
  ↓
1. CORS 处理
  ↓
2. 生成请求 ID
  ↓
3. 记录请求开始
  ↓
4. 验证 JWT Token
  ↓
5. 检查用户角色
  ↓
6. 执行 Handler
  ↓
7. 返回响应
  ↓
8. 记录请求完成
  ↓
响应
```

## 错误处理

### 自定义错误响应

```go
// 处理 Token 过期
if err == jwt.ErrTokenExpired {
	response.Error(c, response.TokenExpired)
	c.Abort()
	return
}

// 处理无效 Token
if err != nil {
	response.Error(c, response.InvalidToken)
	c.Abort()
	return
}

// 处理未认证
if userID == 0 {
	response.Error(c, response.Unauthorized)
	c.Abort()
	return
}
```

### 中间件中的错误

```go
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// ... 验证逻辑

		// 发生错误时
		if err != nil {
			// 记录错误日志
			logger.Error("Authentication failed",
				zap.Error(err),
				zap.String("token", token),
			)

			// 返回错误响应
			response.Error(c, response.Unauthorized)

			// 中止请求
			c.Abort()
			return
		}

		c.Next()
	}
}
```

## 测试中间件

### 单元测试

```go
// internal/middleware/auth_test.go
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"iwan-station-gin/internal/middleware"
	"iwan-station-gin/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthMiddleware_Authenticate(t *testing.T) {
	// 设置 Gin 为测试模式
	gin.SetMode(gin.TestMode)

	// 创建 JWT Manager
	jwtMgr := jwt.NewManager(jwt.Config{
		Secret:     "test-secret",
		ExpireTime: 24,
		Issuer:     "test",
	})

	// 生成测试 Token
	token, _ := jwtMgr.GenerateToken(1, "testuser")

	// 创建中间件
	authMiddleware := middleware.NewAuthMiddleware(jwtMgr)

	// 测试用例
	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{
			name:       "有效 Token",
			token:      token,
			wantStatus: 200,
		},
		{
			name:       "无 Token",
			token:      "",
			wantStatus: 401,
		},
		{
			name:       "无效 Token",
			token:      "invalid-token",
			wantStatus: 401,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 创建测试路由
			r := gin.New()
			r.Use(authMiddleware.Authenticate())
			r.GET("/test", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "success"})
			})

			// 创建请求
			req := httptest.NewRequest("GET", "/test", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}

			// 执行请求
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			// 断言
			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
```

## 最佳实践

### ✅ 应该做的

1. **使用上下文传递数据**：不要使用全局变量
2. **尽早返回错误**：不要让请求继续传播
3. **记录认证失败**：便于安全审计
4. **支持可选认证**：某些接口需要
5. **设置合理的过期时间**：平衡安全性和用户体验

### ❌ 不应该做的

1. **在中间件中处理业务逻辑**：中间件只做拦截
2. **忽略错误处理**：始终检查 Token 验证结果
3. **硬编码密钥**：从配置文件读取
4. **过度使用 c.Abort()**：只在必要时中止

## 下一步

认证中间件完成后，让我们学习「[Casbin 权限集成](../chapter-5/casbin-integration)」


