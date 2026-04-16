---
title: "权限中间件"
description: "权限中间件在认证之后执行，用于检查用户是否有权限访问特定资源。"
---

# 权限中间件

## 学习目标

完成本章后，你将：
- ✅ 实现基于 Casbin 的权限检查
- ✅ 掌握角色验证中间件
- ✅ 学会权限缓存优化
- ✅ 了解前端权限对接

## 权限中间件概述

权限中间件在认证之后执行，用于检查用户是否有权限访问特定资源。

```
请求 → 认证中间件（我是谁？）→ 权限中间件（我能做什么？）→ Handler
```

## Casbin 权限中间件

### 基础实现

```go
// internal/middleware/permission.go
package middleware

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PermissionMiddleware 权限中间件
type PermissionMiddleware struct {
	casbinService *service.CasbinService
	logger        *zap.Logger
}

// NewPermissionMiddleware 创建权限中间件
func NewPermissionMiddleware(
	casbinService *service.CasbinService,
	logger *zap.Logger,
) *PermissionMiddleware {
	return &PermissionMiddleware{
		casbinService: casbinService,
		logger:        logger,
	}
}

// RequirePermission 检查权限
func (m *PermissionMiddleware) RequirePermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户角色
		roles, exists := c.Get("roles")
		if !exists || len(roles.([]string)) == 0 {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		userRoles, ok := roles.([]string)
		if !ok {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		// 2. 获取请求路径和方法
		path := c.FullPath() // 使用路由路径，不是请求路径
		method := c.Request.Method

		// 3. 检查权限
		allowed := false
		for _, role := range userRoles {
			hasPermission, err := m.casbinService.CheckPermission(
				c.Request.Context(),
				role,
				path,
				method,
			)

			if err != nil {
				m.logger.Error("Permission check failed",
					zap.Error(err),
					zap.String("role", role),
					zap.String("path", path),
					zap.String("method", method),
				)
				continue
			}

			if hasPermission {
				allowed = true
				break
			}
		}

		// 4. 处理结果
		if !allowed {
			m.logger.Warn("Permission denied",
				zap.Strings("roles", userRoles),
				zap.String("path", path),
				zap.String("method", method),
				zap.String("ip", c.ClientIP()),
			)
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
```

### 使用示例

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
	// 公开路由
	public := r.Group("/api/v1")
	{
		public.POST("/auth/login", handlers.Auth.Login)
		public.POST("/auth/register", handlers.Auth.Register)
	}

	// 需要认证的路由
	authenticated := r.Group("/api/v1")
	authenticated.Use(authMiddleware.Authenticate())
	{
		// 获取用户信息（无需额外权限）
		authenticated.GET("/auth/info", handlers.Auth.GetInfo)

		// 用户管理（需要权限检查）
		users := authenticated.Group("/user")
		users.Use(permMiddleware.RequirePermission())
		{
			users.GET("/list", handlers.User.List)
			users.GET("/:id", handlers.User.GetByID)
			users.POST("", handlers.User.Create)
			users.PUT("/:id", handlers.User.Update)
			users.DELETE("/:id", handlers.User.Delete)
		}
	}
}
```

## 角色验证中间件

### 基于角色的验证

```go
// RequireRole 检查用户是否拥有指定角色
func (m *PermissionMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户角色
		userRoles, exists := c.Get("roles")
		if !exists {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		userRoleList, ok := userRoles.([]string)
		if !ok || len(userRoleList) == 0 {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		// 2. 检查是否拥有所需角色
		hasRole := false
		for _, requiredRole := range roles {
			for _, userRole := range userRoleList {
				if userRole == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		// 3. 处理结果
		if !hasRole {
			m.logger.Warn("Role check failed",
				zap.Strings("required_roles", roles),
				zap.Strings("user_roles", userRoleList),
			)
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin 检查是否是管理员
func (m *PermissionMiddleware) RequireAdmin() gin.HandlerFunc {
	return m.RequireRole("admin")
}
```

### 使用示例

```go
// 管理员专用路由
admin := r.Group("/api/v1/admin")
admin.Use(authMiddleware.Authenticate())
admin.Use(permMiddleware.RequireAdmin())
{
	admin.GET("/system/config", handlers.Admin.GetConfig)
	admin.POST("/system/config", handlers.Admin.UpdateConfig)
}

// 管理员或编辑可访问
content := r.Group("/api/v1/content")
content.Use(authMiddleware.Authenticate())
content.Use(permMiddleware.RequireRole("admin", "editor"))
{
	content.POST("/publish", handlers.Content.Publish)
}
```

## 权限缓存优化

### Redis 缓存实现

```go
// internal/service/casbin_cache.go
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// CachedCasbinService 带缓存的权限服务
type CachedCasbinService struct {
	casbinService *CasbinService
	redis         *redis.Client
	logger        *zap.Logger
	cacheTTL      time.Duration
}

// NewCachedCasbinService 创建带缓存的权限服务
func NewCachedCasbinService(
	casbinService *CasbinService,
	redis *redis.Client,
	logger *zap.Logger,
) *CachedCasbinService {
	return &CachedCasbinService{
		casbinService: casbinService,
		redis:         redis,
		logger:        logger,
		cacheTTL:      time.Hour, // 缓存1小时
	}
}

// CheckPermission 检查权限（带缓存）
func (s *CachedCasbinService) CheckPermission(ctx context.Context, role, path, method string) (bool, error) {
	// 1. 生成缓存键
	cacheKey := fmt.Sprintf("permission:%s:%s:%s", role, path, method)

	// 2. 尝试从缓存获取
	cached, err := s.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var allowed bool
		if err := json.Unmarshal([]byte(cached), &allowed); err == nil {
			return allowed, nil
		}
	}

	// 3. 缓存未命中，查询 Casbin
	allowed, err := s.casbinService.CheckPermission(ctx, role, path, method)
	if err != nil {
		return false, err
	}

	// 4. 更新缓存
	if err := s.setCache(ctx, cacheKey, allowed); err != nil {
		s.logger.Warn("Failed to cache permission", zap.Error(err))
	}

	return allowed, nil
}

// setCache 设置缓存
func (s *CachedCasbinService) setCache(ctx context.Context, key string, value bool) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, key, data, s.cacheTTL).Err()
}

// InvalidateCache 使缓存失效
func (s *CachedCasbinService) InvalidateCache(ctx context.Context, role string) error {
	// 删除该角色的所有权限缓存
	iter := s.redis.Scan(ctx, 0, fmt.Sprintf("permission:%s:*", role), 0).Iterator()
	for iter.Next(ctx) {
		if err := s.redis.Del(ctx, iter.Val()).Err(); err != nil {
			s.logger.Error("Failed to delete cache key", zap.Error(err))
		}
	}
	return iter.Err()
}

// InvalidateAll 使所有缓存失效
func (s *CachedCasbinService) InvalidateAll(ctx context.Context) error {
	iter := s.redis.Scan(ctx, 0, "permission:*", 0).Iterator()
	for iter.Next(ctx) {
		if err := s.redis.Del(ctx, iter.Val()).Err(); err != nil {
			s.logger.Error("Failed to delete cache key", zap.Error(err))
		}
	}
	return iter.Err()
}
```

### 策略变更时清除缓存

```go
// AddPolicy 添加策略（清除缓存）
func (s *CachedCasbinService) AddPolicy(ctx context.Context, role, path, method string) error {
	// 添加策略
	if err := s.casbinService.AddPolicy(ctx, role, path, method); err != nil {
		return err
	}

	// 清除该角色的缓存
	return s.InvalidateCache(ctx, role)
}

// RemovePolicy 删除策略（清除缓存）
func (s *CachedCasbinService) RemovePolicy(ctx context.Context, role, path, method string) error {
	// 删除策略
	if err := s.casbinService.RemovePolicy(ctx, role, path, method); err != nil {
		return err
	}

	// 清除该角色的缓存
	return s.InvalidateCache(ctx, role)
}
```

## 用户权限获取

### 登录时返回权限

```go
// internal/service/auth.go - 修改登录方法

// Login 用户登录
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// ... 验证用户

	// 获取用户角色
	roles, err := s.repos.User.GetRoles(ctx, user.ID)
	// ...

	// 获取用户权限（从菜单表）
	permissions, err := s.menuService.GetUserPermissions(ctx, user.ID)
	if err != nil {
		permissions = []string{} // 不影响登录
	}

	return &LoginResponse{
		Token:       token,
		User:        user,
		Roles:       roleCodes,
		Permissions: permissions, // 返回给前端
	}, nil
}
```

### 获取用户菜单

```go
// internal/api/v1/menu.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// MenuHandler 菜单处理器
type MenuHandler struct {
	menuService *service.MenuService
}

// NewMenuHandler 创建菜单处理器
func NewMenuHandler(menuService *service.MenuService) *MenuHandler {
	return &MenuHandler{menuService: menuService}
}

// GetTree 获取当前用户的菜单树
func (h *MenuHandler) GetTree(c *gin.Context) {
	// 获取用户ID
	userID := GetUserIDFromContext(c)
	if userID == 0 {
		response.Error(c, response.Unauthorized)
		return
	}

	// 获取用户菜单
	menus, err := h.menuService.GetUserMenus(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, menus)
}
```

## 前端权限对接

### Vue 权限指令

```typescript
// src/directives/permission.ts
import { useAuthStore } from '@/stores/auth'

export const permission = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const authStore = useAuthStore()
    const permissions = authStore.permissions

    if (value && !permissions.includes(value as string)) {
      // 没有权限，移除元素
      el.parentNode?.removeChild(el)
    }
  }
}

// 注册指令
app.directive('permission', permission)
```

### 使用示例

```vue
<template>
  <div>
    <!-- 只有拥有 user:create 权限才能看到创建按钮 -->
    <el-button v-permission="'user:create'" type="primary">
      创建用户
    </el-button>

    <!-- 只有拥有 user:delete 权限才能看到删除按钮 -->
    <el-button v-permission="'user:delete'" type="danger">
      删除
    </el-button>
  </div>
</template>
```

### 路由权限守卫

```typescript
// src/router/guards.ts
import { useAuthStore } from '@/stores/auth'

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 需要登录的页面
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }
  }

  // 需要特定权限的页面
  if (to.meta.permission) {
    if (!authStore.permissions.includes(to.meta.permission as string)) {
      next('/403')
      return
    }
  }

  next()
})
```

### 路由配置

```typescript
// src/router/index.ts
const routes = [
  {
    path: '/system/user',
    component: () => import('@/views/system/user/index.vue'),
    meta: {
      requiresAuth: true,
      permission: 'user:list',
      title: '用户管理'
    }
  }
]
```

## 超级管理员处理

### 跳过超级管理员的权限检查

```go
// RequirePermission 检查权限（超级管理员跳过）
func (m *PermissionMiddleware) RequirePermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户角色
		roles, exists := c.Get("roles")
		if !exists {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		userRoles, ok := roles.([]string)
		if !ok {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		// 2. 超级管理员拥有所有权限
		for _, role := range userRoles {
			if role == "admin" {
				c.Next()
				return
			}
		}

		// 3. 普通用户需要权限检查
		// ... 权限检查逻辑
	}
}
```

## 权限日志记录

### 记录权限拒绝

```go
// RequirePermission 检查权限（带日志）
func (m *PermissionMiddleware) RequirePermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// ... 权限检查逻辑

		if !allowed {
			// 记录权限拒绝日志
			m.logger.Warn("Permission denied",
				zap.Uint64("user_id", GetUserIDFromContext(c)),
				zap.Strings("roles", userRoles),
				zap.String("path", path),
				zap.String("method", method),
				zap.String("ip", c.ClientIP()),
				zap.String("user_agent", c.Request.UserAgent()),
			)

			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
```

### 操作日志记录

```go
// internal/middleware/operation_log.go
package middleware

import (
	"iwan-station-gin/internal/model"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// OperationLog 操作日志中间件
func OperationLog(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录开始时间
		start := time.Now()

		// 处理请求
		c.Next()

		// 记录操作日志
		duration := time.Since(start)

		logger.Info("Operation log",
			zap.Uint64("user_id", GetUserIDFromContext(c)),
			zap.String("username", GetUsernameFromContext(c)),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", duration),
		)
	}
}
```

## 测试

### 单元测试

```go
// internal/middleware/permission_test.go
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"iwan-station-gin/internal/middleware"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock 权限服务
type MockCasbinService struct {
	mock.Mock
}

func (m *MockCasbinService) CheckPermission(ctx context.Context, role, path, method string) (bool, error) {
	args := m.Called(ctx, role, path, method)
	return args.Bool(0), args.Error(1)
}

func TestPermissionMiddleware_RequirePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := new(MockCasbinService)
	permMiddleware := middleware.NewPermissionMiddleware(mockService, logger)

	tests := []struct {
		name       string
		roles      []string
		path       string
		method     string
		allowed    bool
		wantStatus int
	}{
		{
			name:       "管理员访问（允许）",
			roles:      []string{"admin"},
			path:       "/api/v1/user",
			method:     "GET",
			allowed:    true,
			wantStatus: 200,
		},
		{
			name:       "普通用户无权限（拒绝）",
			roles:      []string{"user"},
			path:       "/api/v1/user",
			method:     "GET",
			allowed:    false,
			wantStatus: 403,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 设置 mock
			if len(tt.roles) > 0 {
				mockService.On("CheckPermission", mock.Anything, tt.roles[0], tt.path, tt.method).Return(tt.allowed, nil)
			}

			// 创建路由
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("roles", tt.roles)
				c.Next()
			})
			r.Use(permMiddleware.RequirePermission())
			r.GET("/api/v1/user", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "success"})
			})

			// 创建请求
			req := httptest.NewRequest(tt.method, tt.path, nil)
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

1. **缓存权限**：使用 Redis 缓存权限检查结果
2. **策略变更清除缓存**：修改权限后立即清除缓存
3. **超级管理员**：管理员拥有所有权限
4. **记录拒绝日志**：便于安全审计
5. **细粒度权限**：按钮级别的权限控制

### ❌ 不应该做的

1. **每次请求都查询数据库**：必须使用缓存
2. **忽略错误处理**：权限检查失败要有默认行为
3. **过度依赖中间件**：简单的权限检查可以在 Handler 中
4. **忘记日志**：权限拒绝应该记录

## 下一步

权限中间件完成后，让我们学习「[文件上传功能](../chapter-6/file-upload)」


