---
title: 中间件链路设计
description: "梳理日志、恢复、认证、权限等中间件的执行顺序，让 Web 层链路保持可理解、可扩展。"
---

# 中间件链路设计

Gin 的中间件很好用，但也很容易越用越乱。

项目一开始通常只有：

- 日志
- Recovery

到后面很快就会加上：

- JWT 认证
- 权限校验
- 操作日志
- 请求追踪
- CORS

如果这些能力没有明确顺序，最后就会变成一条“谁都能往里塞点东西”的黑盒链路。

::: tip 💡 这一页最重要的目标
不是背某个固定顺序，而是先建立一个判断标准：

- 这个能力该不该放中间件
- 如果要放，它应该挂在全局还是某个路由组
- 它在认证和权限之前还是之后
:::

## 先看结论

对于这套教程，我推荐先把中间件分成 3 层：

1. 全局中间件
2. 路由组中间件
3. 模块特定中间件

你可以这样理解：

| 层级 | 适合放什么 |
|------|------------|
| 全局 | Recovery、请求日志、请求 ID、CORS |
| 路由组 | JWT 认证、权限校验 |
| 模块特定 | 操作审计、资源级检查、特殊限流 |

这个分层比“想到什么就 `Use()` 一下”稳得多。

## 什么适合做成中间件

一个简单判断方法是：

如果某段逻辑满足下面两个条件，就很适合做中间件：

- 会被很多接口重复使用
- 它发生在业务逻辑之前或之后

例如：

- 请求日志
- panic 恢复
- JWT 认证
- 权限检查

反过来，下面这些通常不适合直接塞进中间件：

- 复杂业务判断
- 依赖具体资源状态的核心业务逻辑
- 需要和某个模块强耦合的数据写入

> [!WARNING]
> “会重复”不等于“一定该做中间件”。如果它已经明显属于业务逻辑，就不要为了复用强行塞进中间件。

## 推荐的执行顺序

一条相对健康的链路通常类似这样：

1. 请求 ID
2. 请求日志
3. Recovery
4. CORS
5. 认证
6. 权限
7. 业务 handler

示意代码：

```go
engine.Use(
    RequestIDMiddleware(),
    AccessLogMiddleware(),
    gin.Recovery(),
    CORSMiddleware(),
)

api := engine.Group("/api/v1")

protected := api.Group("")
protected.Use(
    JWTAuthMiddleware(),
    PermissionMiddleware(),
)
```

这里的核心不是顺序必须一字不差，而是你要理解每一层为什么在那里。

## 为什么日志和 Recovery 要尽量靠前

日志和 Recovery 都属于“底层保护能力”。

它们应该尽量早进入链路，因为：

- 日志要尽可能覆盖所有请求
- Recovery 要尽可能兜住 panic

如果你把它们挂得太后：

- 某些异常请求根本进不到日志
- 某些 panic 无法被统一拦住

## 认证为什么通常在权限之前

这个顺序非常关键。

权限判断的前提通常是：

- 你先知道当前用户是谁
- 当前用户有哪些角色或权限

所以常见顺序是：

1. 认证中间件先解析 Token
2. 把当前用户信息放进上下文
3. 权限中间件再基于上下文做判断

伪代码：

```go
func JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := uint(1)
        c.Set("current_user_id", userID)
        c.Next()
    }
}

func PermissionMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        _, exists := c.Get("current_user_id")
        if !exists {
            c.AbortWithStatusJSON(401, gin.H{"message": "unauthorized"})
            return
        }

        c.Next()
    }
}
```

## 全局挂载和局部挂载，怎么选

很多中间件不是“要不要用”，而是“挂在哪”。

推荐你按这个思路判断：

| 能力 | 推荐挂载位置 |
|------|--------------|
| Recovery | 全局 |
| 请求日志 | 全局 |
| CORS | 全局 |
| JWT 认证 | 受保护路由组 |
| 权限校验 | 更小的受保护路由组 |
| 审计日志 | 需要记录操作的模块或接口 |

例如：

```go
api := engine.Group("/api/v1")

auth := api.Group("/auth")
registerAuthRoutes(auth)

protected := api.Group("")
protected.Use(JWTAuthMiddleware())

admin := protected.Group("/admin")
admin.Use(PermissionMiddleware())
registerAdminRoutes(admin)
```

这种写法的价值在于：

- 登录接口不会被 JWT 中间件误拦截
- 权限中间件不会错误作用于所有接口
- 路由分层和安全边界是对齐的

## 中间件里应该往上下文放什么

中间件最常见的职责之一，是往上下文里放后续会用到的信息。

常见内容包括：

- 请求 ID
- 当前用户 ID
- 当前用户角色
- 追踪信息

但要注意，不要把上下文当万能缓存桶。

推荐只放这些信息：

- 后续多个环节都会用到
- 与当前请求强相关
- 生命周期只在这次请求内

## 如何避免中间件越写越重

这是项目进入中后期最容易踩的坑。

中间件一旦开始做这些事，就要警惕了：

- 查很多表
- 写复杂业务分支
- 拼接大量响应数据
- 和具体模块深耦合

如果出现这种趋势，通常说明：

- 这段逻辑已经不是“横切关注点”
- 它更像 service 层或业务层逻辑

::: details 一个实用判断
如果你把这段逻辑拿到另一个模块或另一个接口里，它依然成立，它更可能是中间件。

如果它只对某个具体业务对象成立，它更可能属于业务层。
:::

## Go vs Java：这里的理解方式

如果你有 Spring 背景，可以这样类比：

| Java / Spring | Go / Gin |
|------|------|
| Filter | Gin middleware |
| Interceptor | Gin middleware 的一部分使用场景 |
| RequestContext / ThreadLocal | `gin.Context` |

但有一个重要差异：

在 Gin 里，大家通常不会特别严格地区分 Filter、Interceptor、ArgumentResolver 那样的层次，而是更直接地围绕 `Context` 和 handler 链去组织。

所以你更需要关注的是：

- 顺序
- 边界
- 是否过重

## 当前阶段最值得先固定的顺序

为了让教程后面各章都接得顺，我建议先固定下面这条最小链路：

- 请求 ID
- 日志
- Recovery
- JWT 认证
- 权限检查
- 业务 handler

后面即便再加：

- 审计日志
- 监控
- 限流

也是在这条主干上扩展，而不是重新打乱。

## 小结

中间件链路设计，本质上是在提前回答一句话：

**哪些能力应该在业务之前统一处理，哪些能力不该挤进这条链路。**

只要这条边界提前画清楚，后面的认证、权限、日志、监控都会自然很多。

## 下一步

第 4 章到这里，通用 Web 基础设施这层就基本完整了。接下来最自然的进入点就是：

- [第五章：用户体系与 JWT 认证](../chapter-5/)

因为应用启动、参数绑定、统一响应和中间件链路都定下来后，认证主线终于可以写得很稳了。
