---
title: 统一响应与错误处理
description: "为接口成功返回、业务错误和系统异常建立统一约定，降低前后端协作成本。"
---

# 统一响应与错误处理

接口一旦开始变多，团队最先感受到的混乱，往往不是业务本身，而是：

- 成功返回结构不一致
- 失败时有的返回字符串，有的返回对象
- 前端不知道什么时候该弹提示，什么时候该跳登录
- 后端日志里又看不到足够信息

这一页要做的，就是尽快把这件事统一掉。

::: tip 💡 这一页的核心目标
先建立一套“够稳定、够统一、够适合教学”的响应约定。

不是追求最复杂的错误系统，而是先让：

- handler 写起来顺手
- 前端接起来稳定
- 排错时有抓手
:::

## 先看结论

对这套教程来说，我推荐一开始就统一这 3 类输出：

1. 成功响应
2. 校验失败
3. 业务异常 / 系统异常

对应思路是：

- 成功响应结构尽量固定
- 校验错误单独归类
- 业务错误不要全部混成 500

## 为什么一定要统一返回结构

假设你现在有 3 个接口：

- 登录接口返回 `{ token: "xxx" }`
- 列表接口返回 `{ list: [], total: 10 }`
- 删除接口返回 `"ok"`

前端会很快开始痛苦，因为每个接口都要单独猜。

更糟糕的是失败场景：

- 有的返回 `{ error: "用户名不能为空" }`
- 有的直接返回 `"database error"`
- 有的把业务错误也返回 500

这会导致两个问题：

1. 前端协作成本急剧上升
2. 后端自己回头排错也越来越痛苦

## 一套够用的统一响应结构

教程主线里，建议先采用简单、稳定的结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "xxx"
  }
}
```

失败时：

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "data": null
}
```

这种结构的好处是非常直接：

- 前端永远知道去哪取 `code`
- 提示信息默认从 `message` 读
- 具体业务数据固定放 `data`

## 推荐的响应封装

你可以先把响应结构收成一个统一类型：

```go
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data"`
}
```

再提供几个最常用的帮助方法：

```go
func Success(c *gin.Context, data interface{}) {
    c.JSON(http.StatusOK, Response{
        Code:    0,
        Message: "ok",
        Data:    data,
    })
}

func Fail(c *gin.Context, httpStatus int, code int, message string) {
    c.JSON(httpStatus, Response{
        Code:    code,
        Message: message,
        Data:    nil,
    })
}
```

这样后面的 handler 会明显干净很多。

## HTTP 状态码和业务错误码，怎么配合

这里最容易混乱。

我的建议是：

- HTTP 状态码表达“这次 HTTP 请求整体结果”
- 业务错误码表达“业务语义上的具体错误”

比如：

| 场景 | HTTP 状态码 | 业务错误码示例 |
|------|-------------|----------------|
| 参数错误 | `400` | `40001` |
| 未登录 | `401` | `40101` |
| 无权限 | `403` | `40301` |
| 资源不存在 | `404` | `40401` |
| 业务冲突 | `409` | `40901` |
| 系统异常 | `500` | `50001` |

这样做有两个好处：

- 浏览器、网关、监控系统还能读懂 HTTP 语义
- 前端又能根据业务错误码做更细的处理

## 不要把所有错误都变成 200

有些项目喜欢所有接口永远返回 200，然后把失败全塞进 `code`。

这个做法短期看似统一，长期问题很大：

- 网关和监控看不到真正异常
- 调试工具无法直观看出请求失败
- 某些客户端重试和异常处理逻辑会失真

> [!WARNING]
> “统一返回格式”不等于“HTTP 状态码永远 200”。这两件事不要混为一谈。

## 业务错误应该怎么定义

推荐定义一个业务错误类型，把“给谁看”和“怎么记日志”拆开：

```go
type BizError struct {
    Code       int
    Message    string
    Internal   error
}

func (e *BizError) Error() string {
    return e.Message
}
```

这会带来一个很重要的好处：

- `Message` 给前端
- `Internal` 给日志和排错

比如数据库唯一键冲突，你可以对外说：

- `用户名已存在`

而不是把数据库原始报错直接返回给前端。

## 校验错误为什么要单独处理

校验错误和业务错误虽然都会失败，但它们不是一回事。

- 校验错误：请求还没进入业务逻辑
- 业务错误：请求格式对了，但业务规则不成立

例如：

- `password` 为空，是校验错误
- 用户名已存在，是业务错误

这就是为什么上一页我们强调：

- DTO 标签处理基础校验
- Service 处理业务规则

而这一页则继续强调：

- 它们的返回也最好分开设计

## 推荐的 handler 处理节奏

一个健康的 handler，通常会长这样：

```go
func (h *UserHandler) Create(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        FailValidate(c, err)
        return
    }

    resp, err := h.userService.Create(c.Request.Context(), req)
    if err != nil {
        HandleError(c, err)
        return
    }

    Success(c, resp)
}
```

重点不是代码少，而是职责清晰：

- 参数错误走 `FailValidate`
- 业务/系统错误走 `HandleError`
- 成功统一走 `Success`

## 统一错误处理的最低要求

在当前阶段，你不一定要立刻做特别复杂的全局异常系统，但至少应该做到：

- 业务错误和系统错误能区分
- 校验错误有统一返回
- 未知错误不要原样暴露给前端
- 日志里能看见内部错误信息

一个最小版思路大概是：

```go
func HandleError(c *gin.Context, err error) {
    var bizErr *BizError
    if errors.As(err, &bizErr) {
        Fail(c, http.StatusBadRequest, bizErr.Code, bizErr.Message)
        return
    }

    Fail(c, http.StatusInternalServerError, 50001, "服务器内部错误")
}
```

## Go vs Java：这里的迁移感

如果你有 Spring 背景，可以这样理解：

| Java / Spring 常见思路 | Go / Gin 对应做法 |
|------|------|
| `ResponseEntity` | 统一响应结构 + helper |
| `@ControllerAdvice` | 统一错误处理入口 |
| 自定义业务异常 | `BizError` 这类错误类型 |

Go 这里没有那么重的框架包装，但你仍然可以很清晰地建立同样的控制面。

## 当前阶段最值得先落的 5 条规则

- 所有接口都返回统一结构
- 成功结果默认放 `data`
- 校验错误、业务错误、系统错误分开处理
- 未知错误不要把内部实现细节暴露给前端
- 日志里记录内部错误，响应里保留对用户友好的信息

## 小结

统一响应与错误处理，解决的不是“代码好不好看”，而是：

- 前后端协作是否稳定
- 错误能不能被快速理解
- 项目扩展后会不会越来越乱

这一层一旦定下来，后面的认证、权限和业务模块都可以沿着同一套输出约定推进。

## 下一步

输入和输出都开始有统一约定之后，最后还缺一层：

- [中间件链路设计](./middleware-pipeline)

因为日志、恢复、认证、权限这些通用能力，也必须有固定顺序和固定挂载位置。
