---
title: "RBAC 权限快速参考"
description: "RBAC (Role-Based Access Control) 基于角色的访问控制。"
---

# RBAC 权限快速参考

RBAC (Role-Based Access Control) 基于角色的访问控制。

## 权限模型

```
用户 → 角色 → 权限 → 资源
```

## 数据表设计

```sql
-- 用户表
users (id, username, password, ...)

-- 角色表
roles (id, name, code, description)

-- 用户-角色关联
user_roles (user_id, role_id)

-- 菜单/权限表
menus (id, parent_id, name, path, permission, type)

-- 角色-权限关联
role_menus (role_id, menu_id)
```

## Casbin 模型文件

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

| 符号 | 说明 |
|------|------|
| `sub` | 主体（角色代码） |
| `obj` | 对象（API 路径） |
| `act` | 动作（HTTP 方法） |

## 初始化 Casbin

```go
adapter, _ := gormadapter.NewAdapterByDB(db)
enforcer, _ := casbin.NewEnforcer("rbac_model.conf", adapter)
enforcer.LoadPolicy()
```

## 添加权限

```go
// 为角色添加权限
enforcer.AddPolicy("admin", "/api/v1/user/list", "GET")
enforcer.AddPolicy("admin", "/api/v1/user/create", "POST")
```

## 检查权限

```go
allowed, _ := enforcer.Enforce("admin", "/api/v1/user/list", "GET")
// 返回: true
```

## 权限中间件

```go
func RequirePermission() gin.HandlerFunc {
    return func(c *gin.Context) {
        roles := c.GetStringSlice("roles")
        path := c.Request.URL.Path
        method := c.Request.Method

        allowed := false
        for _, role := range roles {
            if ok, _ := enforcer.Enforce(role, path, method); ok {
                allowed = true
                break
            }
        }

        if !allowed {
            c.JSON(403, gin.H{"error": "禁止访问"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

## 权限粒度建议

| 适中 | 过粗 | 过细 |
|------|------|------|
| `user:list` | `user:manage` | `user:list:page:1` |
| `user:create` | | `user:create:admin` |
| `user:update` | | |
| `user:delete` | | |

