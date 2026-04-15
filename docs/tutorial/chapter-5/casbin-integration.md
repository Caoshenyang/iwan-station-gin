# Casbin 权限集成

## 学习目标

完成本章后，你将：
- ✅ 理解 Casbin 的核心概念
- ✅ 掌握 RBAC 权限模型
- ✅ 实现 Casbin 与 GORM 的集成
- ✅ 编写权限检查中间件

## 什么是 Casbin？

Casbin 是一个强大的访问控制库，支持多种访问控制模型（ACL、RBAC、ABAC 等）。它不是传统的权限管理系统，而是一个权限引擎。

### 与 Spring Security 对比

| 方面 | Spring Security | Casbin |
|------|----------------|--------|
| 认证 | 内置 | 需要自己实现 |
| 授权 | 注解 + 配置 | 策略文件 |
| 存储适配 | 多种 | 需要适配器 |
| 灵活性 | 较低 | 非常高 |
| 学习曲线 | 陡峭 | 平缓 |

## Casbin 核心概念

### 1. Model（模型）

定义权限规则的抽象模型，使用 CONF 语法：

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

### 2. Policy（策略）

具体的权限规则：

```
p, admin, /api/v1/user, *
p, editor, /api/v1/article, GET
```

### 3. Adapter（适配器）

将策略存储到数据库的接口。

## 安装 Casbin

```bash
# 安装 Casbin 核心
go get github.com/casbin/casbin/v2

# 安装 GORM 适配器
go get github.com/casbin/gorm-adapter/v3
```

## RBAC 模型配置

### 创建模型文件

创建 `backend/config/rbac_model.conf`：

```ini
[request_definition]
# 请求定义：sub=主体, obj=资源, act=操作
r = sub, obj, act

[policy_definition]
# 策略定义：sub=主体, obj=资源, act=操作
p = sub, obj, act

[role_definition]
# 角色定义：g = 用户/角色, 角色
g = _, _

[policy_effect]
# 策略效果：只要有一条允许即允许
e = some(where (p.eft == allow))

[matchers]
# 匹配规则：
# g(r.sub, p.sub) - 请求的角色匹配策略的角色
# r.obj == p.obj - 请求的资源匹配策略的资源
# r.act == p.act - 请求的操作匹配策略的操作（或策略是 *）
m = g(r.sub, p.sub) && r.obj == p.obj && (r.act == p.act || p.act == "*")
```

### 模型解释

```
请求: (alice, /api/v1/user, GET)
       ↓
策略: (admin, /api/v1/user, *)
       ↓
角色: alice has role admin
       ↓
结果: ALLOW ✅
```

## GORM 适配器集成

### 初始化 Casbin

创建 `internal/pkg/casbin/casbin.go`：

```go
package casbinpkg

import (
	"fmt"
	"iwan-station-gin/internal/config"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

// InitCasbin 初始化 Casbin
func InitCasbin(db *gorm.DB, modelPath string) (*casbin.Enforcer, error) {
	// 创建 GORM 适配器
	// Casbin 会自动创建 casbin_rule 表
	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, fmt.Errorf("failed to create casbin adapter: %w", err)
	}

	// 创建执行器
	enforcer, err := casbin.NewEnforcer(modelPath, adapter)
	if err != nil {
		return nil, fmt.Errorf("failed to create casbin enforcer: %w", err)
	}

	// 加载策略
	if err := enforcer.LoadPolicy(); err != nil {
		return nil, fmt.Errorf("failed to load policy: %w", err)
	}

	return enforcer, nil
}

// InitDefaultPolicies 初始化默认策略
func InitDefaultPolicies(enforcer *casbin.Enforcer) error {
	// 清除旧策略（可选）
	// enforcer.ClearPolicy()

	policies := [][]string{
		// 管理员拥有所有权限
		{"admin", "/api/v1/user", "*"},
		{"admin", "/api/v1/role", "*"},
		{"admin", "/api/v1/menu", "*"},
		{"admin", "/api/v1/article", "*"},
		{"admin", "/api/v1/category", "*"},
		{"admin", "/api/v1/tag", "*"},

		// 编辑只能访问文章相关
		{"editor", "/api/v1/article", "GET"},
		{"editor", "/api/v1/article", "POST"},
		{"editor", "/api/v1/article", "PUT"},
		{"editor", "/api/v1/category", "GET"},
		{"editor", "/api/v1/tag", "GET"},

		// 访客只能查看
		{"guest", "/api/v1/article", "GET"},
		{"guest", "/api/v1/category", "GET"},
	}

	// 添加策略（如果不存在）
	for _, policy := range policies {
		if !enforcer.HasPolicy(policy) {
			if _, err := enforcer.AddPolicy(policy); err != nil {
				return fmt.Errorf("failed to add policy %v: %w", policy, err)
			}
		}
	}

	// 保存策略
	return enforcer.SavePolicy()
}
```

### 在 main.go 中初始化

```go
// cmd/server/main.go
package main

import (
	"iwan-station-gin/internal/config"
	"iwan-station-gin/internal/pkg/casbinpkg"
	"iwan-station-gin/internal/pkg/database"
	"iwan-station-gin/internal/pkg/logger"
	"iwan-station-gin/internal/router"
)

func main() {
	// 加载配置
	cfg := config.Load("config/config.yaml")

	// 初始化日志
	log := logger.New(cfg.Logger)

	// 初始化数据库
	db, err := database.InitMySQL(cfg.Database, log)
	if err != nil {
		log.Fatal("Failed to init database", zap.Error(err))
	}

	// 初始化 Casbin
	enforcer, err := casbinpkg.InitCasbin(db, "config/rbac_model.conf")
	if err != nil {
		log.Fatal("Failed to init casbin", zap.Error(err))
	}

	// 初始化默认策略
	if err := casbinpkg.InitDefaultPolicies(enforcer); err != nil {
		log.Warn("Failed to init default policies", zap.Error(err))
	}

	// 设置路由
	r := gin.Default()
	router.Setup(r, db, enforcer, cfg, log)

	// 启动服务
	r.Run(":8080")
}
```

## 权限检查实现

### Casbin 服务

创建 `internal/service/casbin.go`：

```go
package service

import (
	"context"
	"fmt"

	"github.com/casbin/casbin/v2"
)

// CasbinService 权限服务
type CasbinService struct {
	enforcer *casbin.Enforcer
}

// NewCasbinService 创建权限服务
func NewCasbinService(enforcer *casbin.Enforcer) *CasbinService {
	return &CasbinService{
		enforcer: enforcer,
	}
}

// CheckPermission 检查权限
func (s *CasbinService) CheckPermission(ctx context.Context, role, path, method string) (bool, error) {
	allowed, err := s.enforcer.Enforce(role, path, method)
	if err != nil {
		return false, fmt.Errorf("failed to enforce policy: %w", err)
	}
	return allowed, nil
}

// AddPolicy 添加策略
func (s *CasbinService) AddPolicy(ctx context.Context, role, path, method string) error {
	_, err := s.enforcer.AddPolicy(role, path, method)
	if err != nil {
		return fmt.Errorf("failed to add policy: %w", err)
	}
	return s.enforcer.SavePolicy()
}

// RemovePolicy 删除策略
func (s *CasbinService) RemovePolicy(ctx context.Context, role, path, method string) error {
	_, err := s.enforcer.RemovePolicy(role, path, method)
	if err != nil {
		return fmt.Errorf("failed to remove policy: %w", err)
	}
	return s.enforcer.SavePolicy()
}

// GetPolicies 获取所有策略
func (s *CasbinService) GetPolicies(ctx context.Context) [][]string {
	return s.enforcer.GetPolicy()
}

// GetRolesForUser 获取用户的所有角色
func (s *CasbinService) GetRolesForUser(ctx context.Context, user string) ([]string, error) {
	roles, err := s.enforcer.GetRolesForUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}
	return roles, nil
}

// AddRoleForUser 为用户添加角色
func (s *CasbinService) AddRoleForUser(ctx context.Context, user, role string) error {
	_, err := s.enforcer.AddRoleForUser(user, role)
	if err != nil {
		return fmt.Errorf("failed to add role: %w", err)
	}
	return s.enforcer.SavePolicy()
}

// DeleteRoleForUser 删除用户角色
func (s *CasbinService) DeleteRoleForUser(ctx context.Context, user, role string) error {
	_, err := s.enforcer.DeleteRoleForUser(user, role)
	if err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}
	return s.enforcer.SavePolicy()
}

// GetPermissionsForRole 获取角色的所有权限
func (s *CasbinService) GetPermissionsForRole(ctx context.Context, role string) [][]string {
	return s.enforcer.GetPermissionsForUser(role)
}
```

## 权限中间件

### 中间件实现

创建 `internal/middleware/permission.go`：

```go
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
		if !exists {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		userRoles, ok := roles.([]string)
		if !ok || len(userRoles) == 0 {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		// 2. 获取请求路径和方法
		path := c.Request.URL.Path
		method := c.Request.Method

		// 3. 检查每个角色的权限
		allowed := false
		for _, role := range userRoles {
			hasPermission, err := m.casbinService.CheckPermission(
				c.Request.Context(),
				role,
				path,
				method,
			)

			if err != nil {
				m.logger.Error("Failed to check permission",
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

		// 4. 如果没有权限，返回 403
		if !allowed {
			m.logger.Warn("Permission denied",
				zap.Strings("roles", userRoles),
				zap.String("path", path),
				zap.String("method", method),
			)
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole 检查角色
func (m *PermissionMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles, exists := c.Get("roles")
		if !exists {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		userRoleList, ok := userRoles.([]string)
		if !ok {
			response.Error(c, response.Forbidden)
			c.Abort()
			return
		}

		// 检查是否拥有所需角色
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

		if !hasRole {
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

## 权限管理 API

### 策略管理接口

创建 `internal/api/v1/permission.go`：

```go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// PermissionHandler 权限处理器
type PermissionHandler struct {
	casbinService *service.CasbinService
}

// NewPermissionHandler 创建权限处理器
func NewPermissionHandler(casbinService *service.CasbinService) *PermissionHandler {
	return &PermissionHandler{
		casbinService: casbinService,
	}
}

// GetPolicies 获取所有策略
func (h *PermissionHandler) GetPolicies(c *gin.Context) {
	policies := h.casbinService.GetPolicies(c.Request.Context())
	response.Success(c, gin.H{
		"policies": policies,
	})
}

// AddPolicyRequest 添加策略请求
type AddPolicyRequest struct {
	Role   string `json:"role" binding:"required"`
	Path   string `json:"path" binding:"required"`
	Method string `json:"method" binding:"required"`
}

// AddPolicy 添加策略
func (h *PermissionHandler) AddPolicy(c *gin.Context) {
	var req AddPolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	if err := h.casbinService.AddPolicy(c.Request.Context(), req.Role, req.Path, req.Method); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.SuccessWithMessage(c, nil, "策略添加成功")
}

// RemovePolicy 删除策略
func (h *PermissionHandler) RemovePolicy(c *gin.Context) {
	var req AddPolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	if err := h.casbinService.RemovePolicy(c.Request.Context(), req.Role, req.Path, req.Method); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.SuccessWithMessage(c, nil, "策略删除成功")
}

// GetRolePermissions 获取角色权限
func (h *PermissionHandler) GetRolePermissions(c *gin.Context) {
	role := c.Query("role")
	if role == "" {
		response.Error(c, response.InvalidParams)
		return
	}

	permissions := h.casbinService.GetPermissionsForRole(c.Request.Context(), role)
	response.Success(c, gin.H{
		"role":        role,
		"permissions": permissions,
	})
}
```

## 路由配置

### 注册权限路由

```go
// internal/router/permission.go
package router

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterPermissionRoutes 注册权限路由
func RegisterPermissionRoutes(
	r *gin.Engine,
	permHandler *v1.PermissionHandler,
	authMiddleware *middleware.AuthMiddleware,
	permMiddleware *middleware.PermissionMiddleware,
) {
	perm := r.Group("/api/v1/permission")
	perm.Use(authMiddleware.Authenticate())
	perm.Use(permMiddleware.RequireAdmin()) // 只有管理员可以管理权限
	{
		perm.GET("/policies", permHandler.GetPolicies)
		perm.POST("/policies", permHandler.AddPolicy)
		perm.DELETE("/policies", permHandler.RemovePolicy)
		perm.GET("/role", permHandler.GetRolePermissions)
	}
}
```

## 使用示例

### 在路由中使用权限检查

```go
// 需要认证的路由
authenticated := r.Group("/api/v1")
authenticated.Use(authMiddleware.Authenticate())
{
	// 用户管理（需要权限）
	users := authenticated.Group("/user")
	users.Use(permMiddleware.RequirePermission())
	{
		users.GET("/list", handlers.User.List)
		users.GET("/:id", handlers.User.GetByID)
		users.POST("", handlers.User.Create)
		users.PUT("/:id", handlers.User.Update)
		users.DELETE("/:id", handlers.User.Delete)
	}

	// 文章管理（需要权限）
	articles := authenticated.Group("/article")
	articles.Use(permMiddleware.RequirePermission())
	{
		articles.GET("/list", handlers.Article.List)
		articles.POST("", handlers.Article.Create)
		articles.PUT("/:id", handlers.Article.Update)
		articles.DELETE("/:id", handlers.Article.Delete)
	}
}
```

### 管理员专用路由

```go
// 管理员路由
admin := r.Group("/api/v1/admin")
admin.Use(authMiddleware.Authenticate())
admin.Use(permMiddleware.RequireAdmin())
{
	admin.GET("/users", handlers.Admin.ListUsers)
	admin.GET("/roles", handlers.Admin.ListRoles)
	admin.POST("/roles", handlers.Admin.CreateRole)
}
```

## 数据库表结构

### Casbin 自动创建的表

Casbin 会自动创建 `casbin_rule` 表：

```sql
CREATE TABLE `casbin_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ptype` varchar(100) DEFAULT NULL,
  `v0` varchar(100) DEFAULT NULL,
  `v1` varchar(100) DEFAULT NULL,
  `v2` varchar(100) DEFAULT NULL,
  `v3` varchar(100) DEFAULT NULL,
  `v4` varchar(100) DEFAULT NULL,
  `v5` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_casbin_rule` (`ptype`,`v0`,`v1`,`v2`,`v3`,`v4`,`v5`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 存储的数据示例

| ptype | v0 | v1 | v2 |
|-------|-----|----|----|
| p | admin | /api/v1/user | * |
| p | editor | /api/v1/article | GET |
| g | alice | admin | |

## 测试

### 测试权限检查

```go
// internal/service/casbin_test.go
package service_test

import (
	"context"
	"testing"

	"iwan-station-gin/internal/service"

	"github.com/stretchr/testify/assert"
)

func TestCasbinService_CheckPermission(t *testing.T) {
	// 初始化
	enforcer := setupTestEnforcer()
	casbinService := service.NewCasbinService(enforcer)

	// 添加测试策略
	enforcer.AddPolicy("admin", "/api/v1/user", "GET")
	enforcer.AddPolicy("editor", "/api/v1/article", "GET")

	tests := []struct {
		name     string
		role     string
		path     string
		method   string
		want     bool
	}{
		{
			name:   "管理员访问用户",
			role:   "admin",
			path:   "/api/v1/user",
			method: "GET",
			want:   true,
		},
		{
			name:   "编辑访问文章",
			role:   "editor",
			path:   "/api/v1/article",
			method: "GET",
			want:   true,
		},
		{
			name:   "编辑访问用户（拒绝）",
			role:   "editor",
			path:   "/api/v1/user",
			method: "GET",
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := casbinService.CheckPermission(context.Background(), tt.role, tt.path, tt.method)
			assert.Equal(t, tt.want, got)
		})
	}
}
```

## 常见问题

### Q: 策略不生效？

A: 检查以下几点：
1. 路径是否完全匹配（包括前导斜杠）
2. 方法是否正确（GET、POST、PUT、DELETE）
3. 是否调用了 `LoadPolicy()` 加载策略
4. 是否保存了策略：`SavePolicy()`

### Q: 如何支持通配符？

A: 在模型配置中使用通配符匹配：

```ini
[matchers]
m = g(r.sub, p.sub) && regexMatch(r.obj, p.obj) && (r.act == p.act || p.act == "*")
```

### Q: 如何动态更新策略？

A: 直接调用 Casbin API：

```go
// 添加策略
enforcer.AddPolicy("admin", "/api/v1/new", "GET")

// 删除策略
enforcer.RemovePolicy("admin", "/api/v1/old", "GET")

// 保存更改
enforcer.SavePolicy()
```

## 最佳实践

### ✅ 应该做的

1. **策略缓存**：使用 Redis 缓存权限检查结果
2. **策略版本管理**：记录策略变更历史
3. **默认拒绝**：未明确允许的权限都拒绝
4. **权限最小化**：只给必要的权限
5. **定期审计**：检查权限策略是否合理

### ❌ 不应该做的

1. **过度依赖通配符**：尽量精确指定权限
2. **忽略缓存**：每次请求都查询数据库
3. **硬编码策略**：策略应该可动态管理
4. **忘记保存**：修改策略后要调用 `SavePolicy()`

## 下一步

Casbin 集成完成后，让我们学习「[权限模型设计](./permission-model.html)」
