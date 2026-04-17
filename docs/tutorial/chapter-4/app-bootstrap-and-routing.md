---
title: 应用启动与路由组织
description: "把程序入口、服务装配和路由注册方式统一起来，为后面的认证、权限和业务模块打下清晰边界。"
---

# 应用启动与路由组织

这一页要解决一个非常关键、但在很多教程里都被一笔带过的问题：

**项目从哪里启动，路由按什么方式组织，才不会在第 5 章以后越写越乱。**

如果这一层没有提前定下来，后面很容易出现这些问题：

- `main.go` 越写越大
- 路由、配置、数据库初始化全混在一起
- 新增一个模块就要回到入口文件硬改一堆代码
- 认证、权限、日志中间件没有固定挂载位置

::: tip 💡 这一页怎么读
你现在不用追求“最完美架构”，只要先建立一套能稳定支撑后续章节的启动骨架就够了。

这一页最重要的是记住两件事：

- `main` 只负责启动，不负责业务细节
- 路由按模块注册，不在入口文件里手写所有接口
:::

## 先看结论

对于这套教程，我推荐一开始就把启动流程拆成 4 层：

1. `main`
2. `bootstrap`
3. `router`
4. `module`

对应职责如下：

| 层级 | 职责 | 不该做什么 |
|------|------|------------|
| `main` | 读取配置、创建应用、启动服务 | 不要直接写路由和业务逻辑 |
| `bootstrap` | 组装 Gin、数据库、Redis、日志等基础设施 | 不要承载具体业务接口 |
| `router` | 组织路由分组和中间件挂载 | 不要写数据库查询 |
| `module` | 提供模块自己的 handler / service / repository | 不要反向控制应用启动 |

这会让后面的章节形成稳定节奏：

- 第 5 章只接认证模块
- 第 6 章只接权限模块
- 第 7 章只接内容模块
- 不需要每做一章就把入口文件推倒重来

## 为什么要先拆启动骨架

很多初学者会在项目初期这样写：

```go
func main() {
    r := gin.Default()

    db := initDB()
    redisClient := initRedis()
    logger := initLogger()

    r.POST("/api/v1/auth/login", loginHandler(db))
    r.POST("/api/v1/auth/register", registerHandler(db))
    r.GET("/api/v1/articles", listArticlesHandler(db))
    r.POST("/api/v1/articles", createArticleHandler(db))

    _ = r.Run(":8080")
}
```

项目刚开始时它看起来很快，但后面会迅速失控。

> [!WARNING]
> 如果你的 `main.go` 同时负责初始化数据库、挂载路由、定义中间件和连接业务模块，这通常不是“简单”，而是在提前透支后面的可维护性。

## 推荐的最小启动结构

先不要上来就把目录拆得特别深。对这套教程来说，下面这种骨架已经足够健康：

```text
cmd/
  server/
    main.go
internal/
  bootstrap/
    app.go
  router/
    router.go
    auth.go
    content.go
  module/
    auth/
    permission/
    content/
```

核心思路是：

- `cmd/server/main.go` 只作为程序入口
- `internal/bootstrap/app.go` 负责创建应用
- `internal/router/` 负责注册路由
- 每个业务模块提供自己的依赖和处理器

## 一个够用的启动流程

下面这段代码不是“唯一标准答案”，但很适合拿来做教程主线的起点。

```go
package main

import (
    "log"

    "iwan-station-gin/internal/bootstrap"
)

func main() {
    app, err := bootstrap.NewApp()
    if err != nil {
        log.Fatalf("bootstrap app failed: %v", err)
    }

    if err := app.Run(); err != nil {
        log.Fatalf("run app failed: %v", err)
    }
}
```

这里的重点不是代码有多炫，而是 `main` 终于只剩一件事：

**启动应用。**

继续往下一层看：

```go
package bootstrap

import (
    "fmt"

    "github.com/gin-gonic/gin"

    "iwan-station-gin/internal/router"
)

type App struct {
    engine *gin.Engine
    addr   string
}

func NewApp() (*App, error) {
    engine := gin.New()

    registerBaseMiddleware(engine)
    router.Register(engine)

    return &App{
        engine: engine,
        addr:   ":8080",
    }, nil
}

func (a *App) Run() error {
    return a.engine.Run(a.addr)
}

func registerBaseMiddleware(engine *gin.Engine) {
    engine.Use(gin.Recovery())
}
```

这段结构已经把几个高价值边界立住了：

- 应用初始化集中在 `NewApp`
- 路由注册统一走 `router.Register`
- 中间件挂载有单独入口
- 后面新增日志、认证、权限时，都有固定接入点

## 路由为什么一定要集中注册

后面章节会不断增加新模块。如果路由不集中管理，你很快就会遇到：

- 不知道某个接口到底挂在哪
- 中间件在不同模块里重复写
- API 版本和分组混乱

一个更稳妥的方式是先定好统一入口：

```go
package router

import "github.com/gin-gonic/gin"

func Register(engine *gin.Engine) {
    api := engine.Group("/api/v1")

    registerHealthRoutes(api)
    registerAuthRoutes(api)
    registerContentRoutes(api)
}
```

然后每个模块再管自己的小范围：

```go
package router

import "github.com/gin-gonic/gin"

func registerAuthRoutes(api *gin.RouterGroup) {
    auth := api.Group("/auth")
    auth.POST("/login", nil)
    auth.POST("/register", nil)
}
```

这会给后面的章节两个明显好处：

1. 所有接口都能在统一入口里被看见
2. 模块新增时，只需要补一个 `registerXxxRoutes`

## 什么时候该把路由和模块进一步解耦

到教程后面，你可能会想继续优化成下面这种形式：

- 模块自己暴露 `RegisterRoutes`
- 启动层只负责调用模块注册函数

比如：

```go
type RouteRegistrar interface {
    RegisterRoutes(*gin.RouterGroup)
}
```

不过在当前阶段，不要一上来就抽太重。

::: info 当前阶段的推荐策略
先做到“按模块拆路由文件”，已经足够支撑后续 13 章主线。

等你真正写到第 7 章、第 10 章，感觉模块越来越多时，再考虑更进一步的解耦，会更自然。
:::

## Go vs Java：这里最容易不适应的点

如果你有 Java / Spring 背景，这一页最容易产生的疑问通常是：

“为什么不直接让框架自动扫描路由和依赖？”

答案很简单：

- 在 Spring 里，很多装配工作由容器和注解托管
- 在 Go 里，更常见的方式是显式创建、显式注册、显式传递依赖

这不是退步，而是风格不同。

| Java / Spring 常见写法 | Go / Gin 更常见写法 |
|------|------|
| 注解扫描 Controller | 显式注册路由 |
| 容器自动装配 Bean | 显式构造依赖 |
| 框架决定大量生命周期 | 代码自己决定启动顺序 |

所以你在这里要适应的，不是某个语法点，而是：

**应用启动这件事，在 Go 里通常是你自己组织出来的。**

## 这一页最值得立刻执行的约定

如果你只想带走最关键的几条，就记住下面这份清单：

- `main.go` 不写业务逻辑
- 路由统一从一个总入口注册
- 中间件挂载有固定位置
- 每个模块只管理自己的路由和处理器
- API 前缀一开始就统一，例如 `/api/v1`

## 小结

应用启动与路由组织，本质上是在提前回答一句话：

**后面的每一章，要接到哪里去。**

只要这一层提前定清楚，后面的认证、权限、业务、监控和前端联调都会顺很多。

## 下一步

应用入口和路由骨架定下来后，最自然的下一步就是：

- [请求绑定与参数校验](./request-binding-and-validation)

因为一旦接口开始真正接收参数，我们就必须尽快统一“请求数据怎么进来”的方式。
