---
title: 请求绑定与参数校验
description: "统一处理 Gin 中的请求绑定、参数校验和错误反馈，避免接口层逻辑越来越散。"
---

# 请求绑定与参数校验

从这一页开始，我们要把“请求是怎么进来的”这件事定清楚。

如果这一步不统一，后面通常会出现这些症状：

- handler 里混着一堆参数解析代码
- 有的接口用 JSON，有的接口直接读 query，有的接口字段名还不一致
- 校验规则散落在各个 handler 里
- 前端拿到的错误信息有时是字符串，有时是对象，有时是 500

::: tip 💡 这一页的目标
不是把参数校验讲得特别复杂，而是先建立一套稳定规则：

- 请求数据先绑定到 DTO
- 校验尽量靠标签和统一入口完成
- handler 不负责拼装零散错误消息
:::

## 先看结论

对于这套教程，我推荐你从一开始就遵守下面 4 条：

1. 请求参数先进入 DTO，不直接进领域模型
2. 一个接口只保留一种主要输入方式
3. 校验规则尽量写在结构体标签上
4. 校验失败统一返回，不在每个 handler 里手搓文案

这四条看起来普通，但会显著降低后面认证、权限、内容模块的混乱程度。

## 为什么不要直接把请求绑定到 Model

很多人刚开始会这样写：

```go
type User struct {
    ID       uint
    Username string
    Password string
    RoleID   uint
}

func Register(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
}
```

这类写法的问题是：

- 请求字段和数据库字段被绑死了
- 某些不该由前端传入的字段也暴露出来了
- 后面一旦模型调整，接口输入也被迫跟着动

更稳妥的方式是单独定义 DTO：

```go
type RegisterRequest struct {
    Username string `json:"username" binding:"required,min=3,max=32"`
    Password string `json:"password" binding:"required,min=8,max=64"`
    Nickname string `json:"nickname" binding:"max=32"`
}
```

这样做的好处很直接：

- 请求输入边界更清晰
- 数据库存储结构不会反向污染接口设计
- 后面可以放心做字段转换和业务校验

## 一种主要输入方式，胜过混搭

同一个接口里，尽量不要把 body、query、path 参数混成一锅。

推荐的经验规则：

| 场景 | 推荐方式 |
|------|----------|
| 创建资源 | `JSON body` |
| 更新资源 | `path + JSON body` |
| 删除单个资源 | `path param` |
| 列表页筛选 | `query param` |

比如：

- `POST /api/v1/auth/login` 用 JSON
- `GET /api/v1/articles?page=1&page_size=10` 用 query
- `PUT /api/v1/articles/:id` 用 path + JSON

> [!WARNING]
> 如果一个接口同时让前端从 query、body、header 里到处塞业务字段，后面排错会非常痛苦。

## 推荐的 DTO 分层方式

这套教程里，DTO 不需要一开始就拆得特别复杂，但建议至少有下面这两类：

- `request DTO`
- `response DTO`

示例：

```go
type CreateArticleRequest struct {
    Title      string   `json:"title" binding:"required,max=120"`
    Summary    string   `json:"summary" binding:"max=300"`
    Content    string   `json:"content" binding:"required"`
    CategoryID uint     `json:"category_id" binding:"required,gt=0"`
    TagIDs     []uint   `json:"tag_ids"`
}

type ArticleItemResponse struct {
    ID         uint     `json:"id"`
    Title      string   `json:"title"`
    Summary    string   `json:"summary"`
    Category   string   `json:"category"`
    Tags       []string `json:"tags"`
    CreatedAt  string   `json:"created_at"`
}
```

这会让你后面在第 7 章、第 11 章做列表页和详情页时轻松很多。

## Gin 里最常用的绑定方式

Gin 提供了很多绑定方法，但教程主线里最常用的其实就这几种：

```go
var req LoginRequest
if err := c.ShouldBindJSON(&req); err != nil {
    // 处理 JSON 请求体绑定错误
}
```

```go
var query ListArticleQuery
if err := c.ShouldBindQuery(&query); err != nil {
    // 处理列表查询参数绑定错误
}
```

```go
id := c.Param("id")
```

当前阶段的建议非常简单：

- JSON 请求体优先用 `ShouldBindJSON`
- 列表查询优先用 `ShouldBindQuery`
- 路径参数直接用 `Param`

不要在入门阶段一上来就引入太多花式绑定技巧。

## 校验规则应该写在哪里

第一层校验，优先写在 DTO 标签上。

```go
type LoginRequest struct {
    Username string `json:"username" binding:"required,min=3,max=32"`
    Password string `json:"password" binding:"required,min=8,max=64"`
}
```

这类校验特别适合处理：

- 必填
- 长度
- 范围
- 基础格式

但要注意，标签校验不是万能的。

## 哪些校验不该塞进标签

下面这类规则，更适合放进 service 层：

- 用户名是否已存在
- 角色是否有效
- 分类是否被禁用
- 某篇文章是否有权限修改

也就是说：

| 校验类型 | 建议位置 |
|------|------|
| 基础格式校验 | DTO 标签 |
| 业务规则校验 | Service |
| 权限校验 | 中间件 / Service |

::: info 一个简单判断方法
如果这个规则不查数据库也能判断，通常可以优先放在 DTO 标签。

如果必须结合业务状态才能判断，通常就不该放在绑定层。
:::

## handler 应该写到什么程度

在这套教程里，我建议 handler 层只做 4 件事：

1. 绑定请求
2. 调用 service
3. 返回结果
4. 处理当前层明确知道的异常

不要在 handler 里做这些事：

- 拼 SQL
- 写复杂业务判断
- 手工组装几十种错误文案

一个更健康的 handler 大概像这样：

```go
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        FailValidate(c, err)
        return
    }

    resp, err := h.authService.Login(c.Request.Context(), req)
    if err != nil {
        FailBusiness(c, err)
        return
    }

    Success(c, resp)
}
```

你会发现，这种写法的前提正是：

- DTO 定义清楚
- 校验入口统一
- 成功/失败返回统一

这也正好会自然连接到下一页。

## Go vs Java：这里最大的差异是什么

如果你有 Spring 背景，可能会下意识想找：

- `@Valid`
- `@RequestBody`
- `BindingResult`

在 Gin 里也有类似目标，但表达方式更轻：

| Java / Spring | Go / Gin |
|------|------|
| `@RequestBody` | `ShouldBindJSON` |
| `@RequestParam` | `ShouldBindQuery` |
| `@PathVariable` | `c.Param()` |
| `@Valid` | `binding` 标签 |

你可以把 Gin 的做法理解成：

**没有那么多注解语义包装，但本质上还是“绑定输入 + 基础校验 + 统一错误返回”。**

## 当前阶段最值得先统一的字段习惯

为了让后面章节少踩坑，我建议你尽早统一这些细节：

- JSON 字段统一用蛇形或下划线风格，例如 `page_size`
- 分页参数命名统一，例如 `page` / `page_size`
- ID 类型风格统一，不要一会儿 `id` 一会儿 `articleId`
- 请求 DTO 和响应 DTO 分开定义

这些东西看起来细，但它们会直接影响第 11 章前端封装体验。

## 小结

请求绑定与参数校验，本质上是在提前回答两句话：

- 请求数据怎么进系统
- 非法数据应该在哪里被挡住

只要这两件事提前统一，后面的认证、权限和业务模块接口都会顺很多。

## 下一步

请求能稳定进来了，下一步就该统一：

- [统一响应与错误处理](./unified-response-and-errors)

因为只要输入有统一规则，输出也应该有统一约定。
