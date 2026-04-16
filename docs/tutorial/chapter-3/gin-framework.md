---
title: "3.1 Gin 框架基础"
description: "Gin 是一个用 Go 语言编写的高性能 HTTP Web 框架。"
---

# 3.1 Gin 框架基础

## 什么是 Gin？

Gin 是一个用 Go 语言编写的高性能 HTTP Web 框架。

### 特性

- **高性能** - 基于 httprouter，路由速度快
- **中间件支持** - HTTP 请求中间件
- **JSON 验证** - 自动验证 JSON 请求
- **分组管理** - 路由分组
- **错误管理** - 统一的错误处理
- **内置渲染** - 支持 JSON、XML、YAML 等多种格式

## 基础路由

### 简单示例

```go
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    // 创建路由
    r := gin.Default()

    // 定义路由
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "message": "pong",
        })
    })

    // 运行服务器
    r.Run(":8080")
}
```

### 与 Java Spring Boot 对比

**Spring Boot:**
```java
@RestController
public class PingController {
    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("message", "pong");
    }
}
```

**Gin:**
```go
r.GET("/ping", func(c *gin.Context) {
    c.JSON(200, gin.H{"message": "pong"})
})
```

## HTTP 方法

```go
func setupRoutes(r *gin.Engine) {
    // GET
    r.GET("/users", getUsers)

    // POST
    r.POST("/users", createUser)

    // PUT
    r.PUT("/users/:id", updateUser)

    // DELETE
    r.DELETE("/users/:id", deleteUser)
}
```

## 路径参数

```go
r.GET("/users/:id", func(c *gin.Context) {
    id := c.Param("id")
    c.String(200, "用户ID: %s", id)
})

// 通配符
r.GET("/files/*filepath", func(c *gin.Context) {
    filepath := c.Param("filepath")
    c.String(200, "文件路径: %s", filepath)
})
```

## 查询参数

```go
r.GET("/search", func(c *gin.Context) {
    // 获取单个参数
    keyword := c.Query("keyword")

    // 带默认值
    page := c.DefaultQuery("page", "1")

    // 获取所有查询参数
    query := c.Request.URL.Query()

    c.JSON(200, gin.H{
        "keyword": keyword,
        "page":    page,
    })
})
```

## 请求体处理

### JSON 绑定

```go
type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

func loginHandler(c *gin.Context) {
    var req LoginRequest

    // 绑定 JSON
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // 处理请求
    c.JSON(200, gin.H{"username": req.Username})
}
```

### 验证标签

```go
type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=50"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
}
```

## 响应处理

### JSON 响应

```go
// 简单 JSON
c.JSON(200, gin.H{"message": "success"})

// 结构体响应
type User struct {
    ID    uint   `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

user := User{ID: 1, Name: "张三", Email: "zhangsan@example.com"}
c.JSON(200, user)
```

### 其他响应类型

```go
// 字符串
c.String(200, "Hello, World!")

// HTML
c.HTML(200, "index.html", gin.H{"title": "首页"})

// 文件
c.File("/path/to/file.pdf")

// XML
c.XML(200, gin.H{"message": "success"})
```

## 路由分组

```go
// API v1 分组
v1 := r.Group("/api/v1")
{
    v1.GET("/users", getUsers)
    v1.GET("/users/:id", getUser)
    v1.POST("/users", createUser)
}

// 管理员分组
admin := r.Group("/admin")
admin.Use(AuthMiddleware())
{
    admin.GET("/dashboard", dashboard)
    admin.GET("/users", adminUsers)
}
```

## 中间件

### 创建中间件

```go
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        fmt.Printf("[%s] %s %s\n",
            c.Request.Method,
            c.Request.URL,
            c.Request.UserAgent())
        c.Next()
    }
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(401, gin.H{"error": "未授权"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

### 使用中间件

```go
// 全局中间件
r.Use(Logger())
r.Use(gin.Recovery())

// 路由组中间件
authorized := r.Group("/")
authorized.Use(AuthMiddleware())
{
    authorized.GET("/profile", profileHandler)
}
```

## 错误处理

```go
r.GET("/user/:id", func(c *gin.Context) {
    user, err := getUserByID(c.Param("id"))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(404, gin.H{"error": "用户不存在"})
        } else {
            c.JSON(500, gin.H{"error": "服务器错误"})
        }
        return
    }
    c.JSON(200, user)
})
```

## 最佳实践

### 1. 使用处理函数而非匿名函数

```go
// 不好
r.GET("/users", func(c *gin.Context) {
    // 大量代码...
})

// 好
type UserHandler struct {
    service *UserService
}

func (h *UserHandler) List(c *gin.Context) {
    // 处理逻辑
}

r.GET("/users", userHandler.List)
```

### 2. 结构化响应

```go
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
    c.JSON(200, Response{
        Code:    0,
        Message: "success",
        Data:    data,
    })
}
```

### 3. 错误处理

```go
func HandleError(c *gin.Context, err error) {
    if errors.Is(err, ErrNotFound) {
        c.JSON(404, Response{Code: 404, Message: "未找到"})
        return
    }
    c.JSON(500, Response{Code: 500, Message: "服务器错误"})
}
```

## 与 Java 对比

| Spring Boot | Gin | 说明 |
|------------|-----|------|
| `@RestController` | Handler | 处理器 |
| `@GetMapping` | `r.GET()` | 路由方法 |
| `@RequestBody` | `c.ShouldBindJSON()` | 请求体绑定 |
| `@RequestParam` | `c.Query()` / `c.Param()` | 参数获取 |
| `@RequestMapping` | 路由前缀 | 分组前缀 |

## 下一步

现在你已了解 Gin 基础，让我们学习「[JWT 认证](/guide/jwt)」实现

