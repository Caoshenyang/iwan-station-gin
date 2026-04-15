# Gin 框架快速参考

Gin 是高性能 Go Web 框架，基于 httprouter。

## 基础路由

```go
r := gin.Default()

r.GET("/users", getUsers)
r.POST("/users", createUser)
r.PUT("/users/:id", updateUser)
r.DELETE("/users/:id", deleteUser)
```

## 路径参数

```go
// 路径参数
r.GET("/users/:id", func(c *gin.Context) {
    id := c.Param("id")
})

// 通配符
r.GET("/files/*filepath", func(c *gin.Context) {
    filepath := c.Param("filepath")
})
```

## 查询参数

```go
keyword := c.Query("keyword")
page := c.DefaultQuery("page", "1")
```

## 请求绑定

```go
type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required,min=6"`
}

var req LoginRequest
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(400, gin.H{"error": err.Error()})
    return
}
```

## 验证标签

| 标签 | 说明 |
|------|------|
| `required` | 必填 |
| `min` | 最小长度 |
| `max` | 最大长度 |
| `email` | 邮箱格式 |
| `url` | URL 格式 |

## 路由分组

```go
v1 := r.Group("/api/v1")
v1.Use(AuthMiddleware())
{
    v1.GET("/users", getUsers)
    v1.GET("/users/:id", getUser)
}
```

## 中间件

```go
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

## 响应处理

```go
// JSON 响应
c.JSON(200, gin.H{"message": "success"})

// 结构体响应
c.JSON(200, user)

// 字符串
c.String(200, "Hello")

// 文件
c.File("/path/to/file.pdf")
```

## 项目结构

```
internal/api/
├── user.go       # UserHandler
├── auth.go       # AuthHandler
└── router.go     # 路由注册
```
