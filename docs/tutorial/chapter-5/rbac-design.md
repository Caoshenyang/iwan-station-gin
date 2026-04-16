---
title: "RBAC 权限系统设计"
description: "RBAC (Role-Based Access Control，基于角色的访问控制) 是一种广泛使用的权限模型。"
---

# RBAC 权限系统设计

## 学习目标

完成本章后，你将：
- ✅ 理解 RBAC 权限模型原理
- ✅ 掌握权限数据模型设计
- ✅ 学会动态权限控制
- ✅ 了解前后端权限协同

---

## 什么是 RBAC？

RBAC (Role-Based Access Control，基于角色的访问控制) 是一种广泛使用的权限模型。

### 核心概念

```
用户 ──▶ 角色 ──▶ 权限 ──▶ 资源
```

| 概念 | 说明 | 示例 |
|------|------|------|
| **用户** | 系统的使用者 | 张三、李四 |
| **角色** | 权限的集合 | 管理员、编辑、访客 |
| **权限** | 对资源的操作 | 文章发布、用户管理 |
| **资源** | 被保护的对象 | API、菜单、按钮 |

### 为什么选择 RBAC？

**优势**:
- ✅ **简化管理** - 通过角色分配权限，而非直接给用户分配
- ✅ **灵活扩展** - 新增权限只需修改角色配置
- ✅ **符合直觉** - 易于理解和维护
- ✅ **企业级标准** - 大多数企业系统采用此模型

---

## 权限模型设计

### 表结构

```sql
-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    ...
);

-- 角色表
CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    ...
);

-- 用户-角色多对多关系
CREATE TABLE user_roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 菜单/权限表
CREATE TABLE menus (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_id BIGINT DEFAULT 0,
    name VARCHAR(50) NOT NULL,
    path VARCHAR(255),
    permission VARCHAR(100),
    type TINYINT DEFAULT 1, -- 1=菜单, 2=按钮
    ...
);

-- 角色-菜单多对多关系
CREATE TABLE role_menus (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
);
```

### Go 模型

```go
// 用户模型
type User struct {
    BaseModel
    Username string `gorm:"type:varchar(50);uniqueIndex"`
    ...
}

// 角色模型
type Role struct {
    BaseModel
    Name        string `gorm:"type:varchar(50)"`
    Code        string `gorm:"type:varchar(50);uniqueIndex"`
    Description string `gorm:"type:varchar(255)"`
}

// 菜单模型（同时表示菜单和权限）
type Menu struct {
    BaseModel
    ParentID   uint64 `gorm:"default:0"`
    Name       string `gorm:"type:varchar(50)"`
    Path       string `gorm:"type:varchar(255)"`
    Permission string `gorm:"type:varchar(100)"`
    Type       int    `gorm:"type:tinyint;default:1"`
}
```

## 权限模型

### 三级权限模型

```
级别 1: 模块 (user, role, article)
级别 2: 操作 (list, create, update, delete)
级别 3: 资源 (具体数据)

示例: user:list, user:create, user:update:1
```

### 菜单 + 权限结构

```
系统管理 (模块)
├── 用户管理 (菜单)
│   ├── user:list (权限)
│   ├── user:create (权限)
│   ├── user:update (权限)
│   └── user:delete (权限)
└── 角色管理 (菜单)
    ├── role:list (权限)
    └── role:create (权限)
```

## Casbin 集成

### 什么是 Casbin？

Casbin 是一个强大的授权库，具有：
- 支持多种访问控制模型
- 灵活的策略存储
- 权限检查 API

### RBAC 模型文件

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

### 说明

- **sub**: 主体 (角色代码，如 "admin")
- **obj**: 对象 (API 路径，如 "/api/v1/user/list")
- **act**: 动作 (HTTP 方法，如 "GET")

### 初始化 Casbin

```go
import (
    "github.com/casbin/casbin/v2"
    "github.com/casbin/gorm-adapter/v3"
    gormadapter "github.com/casbin/gorm-adapter/v3"
)

func InitCasbin(db *gorm.DB, modelPath string) (*casbin.Enforcer, error) {
    // 创建适配器
    adapter, err := gormadapter.NewAdapterByDB(db)
    if err != nil {
        return nil, err
    }

    // 创建执行器
    enforcer, err := casbin.NewEnforcer(modelPath, adapter)
    if err != nil {
        return nil, err
    }

    // 加载策略
    if err := enforcer.LoadPolicy(); err != nil {
        return nil, err
    }

    return enforcer, nil
}
```

## 权限管理

### 添加策略

```go
// 为角色添加权限
func AddPermission(enforcer *casbin.Enforcer, roleCode, path, method string) error {
    _, err := enforcer.AddPolicy(roleCode, path, method)
    return err
}

// 示例
AddPermission(enforcer, "admin", "/api/v1/user/list", "GET")
AddPermission(enforcer, "admin", "/api/v1/user/create", "POST")
AddPermission(enforcer, "editor", "/api/v1/article/list", "GET")
```

### 检查权限

```go
// 检查角色是否有权限
func CheckPermission(enforcer *casbin.Enforcer, roleCode, path, method string) (bool, error) {
    return enforcer.Enforce(roleCode, path, method)
}

// 使用
allowed, _ := CheckPermission(enforcer, "admin", "/api/v1/user/list", "GET")
// 返回: true
```

### 获取用户权限

```go
// 获取用户的所有权限
func GetUserPermissions(enforcer *casbin.Enforcer, userRoles []string) ([]string, error) {
    var permissions []string

    for _, role := range userRoles {
        // 获取角色的策略
        policies := enforcer.GetFilteredPolicy(0, role)

        for _, policy := range policies {
            if len(policy) >= 3 {
                // 格式: role, path, method
                permissions = append(permissions, fmt.Sprintf("%s:%s", policy[1], policy[2]))
            }
        }
    }

    return permissions, nil
}
```

## 权限中间件

### Casbin 中间件

```go
type CasbinMiddleware struct {
    enforcer *casbin.Enforcer
}

func NewCasbinMiddleware(enforcer *casbin.Enforcer) *CasbinMiddleware {
    return &CasbinMiddleware{enforcer: enforcer}
}

func (m *CasbinMiddleware) RequirePermission() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取用户角色
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

        // 获取路径和方法
        path := c.Request.URL.Path
        method := c.Request.Method

        // 检查每个角色的权限
        allowed := false
        for _, role := range userRoles {
            if ok, _ := m.enforcer.Enforce(role, path, method); ok {
                allowed = true
                break
            }
        }

        if !allowed {
            response.Error(c, response.Forbidden)
            c.Abort()
            return
        }

        c.Next()
    }
}
```

## 默认权限

### 管理员角色

```go
// 管理员拥有所有权限
func initAdminPermissions(enforcer *casbin.Enforcer) error {
    policies := [][]string{
        {"admin", "/api/v1/user/:action", "*"},
        {"admin", "/api/v1/role/:action", "*"},
        {"admin", "/api/v1/menu/:action", "*"},
        {"admin", "/api/v1/article/:action", "*"},
        // ... 所有其他权限
    }

    for _, policy := range policies {
        if err := addPolicyIfNotExists(enforcer, policy); err != nil {
            return err
        }
    }

    return nil
}
```

### 编辑角色

```go
func initEditorPermissions(enforcer *casbin.Enforcer) error {
    policies := [][]string{
        {"editor", "/api/v1/article/list", "GET"},
        {"editor", "/api/v1/article/create", "POST"},
        {"editor", "/api/v1/article/update", "PUT"},
        {"editor", "/api/v1/category/list", "GET"},
        // ... 其他模块只读权限
    }

    for _, policy := range policies {
        if err := addPolicyIfNotExists(enforcer, policy); err != nil {
            return err
        }
    }

    return nil
}
```

## 前端集成

### 获取用户权限

```typescript
// API 响应包含权限
interface LoginResponse {
  token: string;
  user: User;
  roles: string[];
  permissions: string[];
}

// 存储到 pinia
const authStore = useAuthStore();
authStore.setPermissions(response.permissions);
```

### 权限指令

```typescript
// Vue 指令
app.directive('permission', {
  mounted(el, binding) {
    const { value } = binding;
    const permissions = useAuthStore().permissions;

    if (value && !permissions.includes(value)) {
      el.parentNode?.removeChild(el);
    }
  }
});

// 使用
<el-button v-permission="'user:create'">创建用户</el-button>
```

### 路由守卫

```typescript
// 路由权限检查
router.beforeEach((to, from, next) => {
  const requiredPermission = to.meta.permission;
  if (requiredPermission) {
    const hasPermission = useAuthStore()
      .permissions.includes(requiredPermission);

    if (!hasPermission) {
      next('/403');
      return;
    }
  }
  next();
});
```

## 最佳实践

### 1. 权限粒度

```
过于粗糙:
- user:manage (太宽泛)

过于细致:
- user:list:page:1 (太具体)

适度:
- user:list
- user:create
- user:update
- user:delete
```

### 2. 默认拒绝

```go
// 始终默认拒绝，显式允许
allowed := false
for _, role := range userRoles {
    if enforcer.Enforce(role, path, method) {
        allowed = true
        break
    }
}
```

### 3. 缓存权限

```go
// 在 Redis 中缓存用户权限
func (s *Service) GetUserPermissions(userID uint64) ([]string, error) {
    // 先尝试缓存
    cacheKey := fmt.Sprintf("user:%d:permissions", userID)
    if cached, err := s.redis.Get(cacheKey); err == nil {
        return cached, nil
    }

    // 从数据库获取
    permissions, err := s.repo.GetPermissions(userID)
    if err != nil {
        return nil, err
    }

    // 缓存 1 小时
    s.redis.Set(cacheKey, permissions, time.Hour)

    return permissions, nil
}
```

## 下一步

权限系统设计完成后，查看「[Docker 部署](/guide/docker)」


