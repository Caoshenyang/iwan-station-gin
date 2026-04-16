---
title: "常见问题解答（FAQ）"
description: "汇总学习过程中最常见的问题，并通过折叠答案、代码分组和排查清单帮助你快速定位问题。"
---

# 🧰 常见问题解答（FAQ）

本文档收集了学习过程中最常遇到的问题和解决方案。

::: tip 💡 使用方式
桌面端可以结合右侧页面大纲快速定位问题；移动端建议先看下面的目录，再按分类展开对应答案。
:::

## 🧭 快速导航

[[toc]]

## 🛠️ 环境安装

### Q: Go 安装后无法识别命令？

::: details 查看解决方案
先确认 Go 本身已经安装成功，再检查环境变量是否已经刷新。

::: code-group
```bash [macOS / Linux]
# 检查 Go 是否安装
go version

# 检查 GOPATH
go env GOPATH

# 确保 $GOPATH/bin 在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin
```

```powershell [Windows PowerShell]
# 检查 Go 是否安装
go version

# 检查环境变量
echo $env:PATH

# 重新打开终端使环境变量生效
```
:::
:::

### Q: `go mod tidy` 很慢或失败？

::: details 查看解决方案
最常见的原因是网络访问 Go 模块源较慢，可以先配置镜像再重试。

```bash
# 设置 GOPROXY
go env -w GOPROXY=https://goproxy.cn,direct

# 清理缓存后重试
go clean -modcache
go mod tidy
```
:::

### Q: 需要安装 PostgreSQL 和 Redis 吗？

::: details 查看解决方案
不需要。教程默认使用 Docker 运行 PostgreSQL、Redis 和 MinIO。

::: code-group
```bash [macOS / Linux]
./scripts/start-dev.sh
```

```powershell [Windows]
.\scripts\start-dev.bat
```
:::

推荐使用 Docker 的原因：

- 避免本地安装多个服务的麻烦
- 环境隔离，不影响本机系统
- 一键启动和销毁，更适合教程学习
- 更接近后续部署方式
:::

## 🐳 Docker 相关

### Q: Docker Desktop 启动失败？

::: details 查看解决方案
Windows 用户最常见的原因是 WSL 2 或虚拟化环境没有准备好。

| 问题 | 解决方案 |
|------|----------|
| WSL 2 未安装 | 启用 WSL 2 功能 |
| 虚拟化未启用 | 在 BIOS 中启用虚拟化 |
| Hyper-V 冲突 | 禁用其他虚拟化软件 |

```powershell
# 以管理员身份运行 PowerShell
wsl --install
```
:::

### Q: `docker-compose` 命令不存在？

::: details 查看解决方案
新版 Docker Desktop 默认使用 `docker compose`，不再要求单独安装旧版 `docker-compose`。

```bash
# 推荐写法
docker compose -f docker-compose.dev.yml up -d

# 不再建议依赖旧的 docker-compose 连字符命令
```

如果仍然报错，优先检查 Docker Desktop 是否安装完整、命令行集成是否开启。
:::

### Q: Docker 服务启动失败？

::: details 查看解决方案
先排查端口占用，再看容器日志。

::: code-group
```powershell [Windows PowerShell]
netstat -ano | findstr :5432
docker compose -f docker-compose.dev.yml logs postgres
```

```bash [macOS / Linux]
lsof -ti:5432
docker compose -f docker-compose.dev.yml logs postgres
```
:::
:::

### Q: Docker 容器日志怎么看？

::: details 查看解决方案
```bash
# 查看所有服务日志
docker compose -f docker-compose.dev.yml logs

# 查看特定服务日志
docker compose -f docker-compose.dev.yml logs postgres

# 实时跟踪日志
docker compose -f docker-compose.dev.yml logs -f

# 查看最近 100 行
docker compose -f docker-compose.dev.yml logs --tail=100
```
:::

## ⚙️ 开发问题

### Q: 端口被占用怎么办？

::: details 查看解决方案
最直接的办法是先查进程，再结束占用进程。

::: code-group
```bash [macOS / Linux]
# 查找占用端口的进程
lsof -ti:8080

# 结束进程
kill -9 $(lsof -ti:8080)

# 或使用指定端口启动
go run cmd/server/main.go --port=8081
```

```powershell [Windows PowerShell]
# 查找占用端口的进程
netstat -ano | findstr :8080

# 结束进程
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force
```
:::
:::

### Q: 热重载（air）不生效？

::: details 查看解决方案
先确认 `air` 已安装，再检查 `.air.toml` 是否监听到了正确的文件后缀。

```bash
# 确认 air 已安装
which air

# 重新安装 air
go install github.com/air-verse/air@latest

# 检查 .air.toml 配置
cat .air.toml
```

常见原因：

- 文件保存后没有触发重新编译：检查 `include_ext`
- 编译报错直接中断：设置 `stop_on_error = false`
:::

### Q: 跨域问题如何解决？

::: details 查看解决方案
最基础的方式是在 Gin 中添加 CORS 中间件。

```go
package middleware

import "github.com/gin-gonic/gin"

func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

::: warning 生产环境注意
实际生产环境不要直接使用 `*`，应限制允许的源站域名。
:::
:::

## 数据库问题

### Q: PostgreSQL 连接失败？

::: details 查看解决方案
优先按这个顺序排查：

```bash
# 1. 确认 Docker 服务正在运行
docker ps | grep postgres

# 2. 检查连接参数
# host: localhost
# port: 5432
# user: iwan
# password: iwan123456
# database: iwan_station

# 3. 测试连接
docker exec -it iwan-postgres psql -U iwan -d iwan_station

# 4. 查看日志
docker logs iwan-postgres
```

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| connection refused | PostgreSQL 未启动 | `docker compose up -d postgres` |
| authentication failed | 密码错误 | 检查配置文件中的密码 |
| database does not exist | 数据库未创建 | 手动创建数据库 |
:::

### Q: 如何重置数据库？

::: details 查看解决方案
如果你正在跟教程走，最简单的是直接删除容器和数据卷。

```bash
# 停止并删除容器和数据卷
docker compose -f docker-compose.dev.yml down -v

# 重新启动
./scripts/start-dev.sh
```

只想清空数据库时，也可以手动执行：

```bash
docker exec -it iwan-postgres psql -U iwan -c "DROP DATABASE IF EXISTS iwan_station;"
docker exec -it iwan-postgres psql -U iwan -c "CREATE DATABASE iwan_station;"
```
:::

### Q: GORM 自动迁移失败？

::: details 查看解决方案
| 问题 | 解决方案 |
|------|----------|
| 连接失败 | 检查数据库是否启动 |
| 权限不足 | 确认用户有 `CREATE TABLE` 权限 |
| 表已存在 | `AutoMigrate` 不会删除已有表，只会补充字段 |
| 字段类型不匹配 | 检查 GORM 标签是否正确 |

调试时可以打开 GORM 日志：

```go
db, err := gorm.Open(dialector, &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info),
})
```
:::

### Q: Redis 连接超时？

::: details 查看解决方案
```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试连接
docker exec -it iwan-redis redis-cli -a iwan123456 ping
# 应返回: PONG

# 查看日志
docker logs iwan-redis
```
:::

## 代码问题

### Q: GORM 标签有哪些推荐写法？

::: details 查看解决方案
优先使用更通用的标签写法，兼容 PostgreSQL 和 MySQL。

```go
// ❌ 不推荐：MySQL 特定
ID       uint64 `gorm:"primary_key;auto_increment;type:bigint"`
Username string `gorm:"type:varchar(50);uniqueIndex"`

// ✅ 推荐：更通用
ID       uint64 `gorm:"primaryKey"`
Username string `gorm:"size:50;uniqueIndex;not null"`
```
:::

### Q: JWT Token 验证失败？

::: details 查看解决方案
| 原因 | 检查方法 | 解决方案 |
|------|----------|----------|
| 密钥不一致 | 检查配置文件 | 确保 JWT_SECRET 一致 |
| Token 过期 | 检查过期时间 | 实现刷新机制 |
| 格式错误 | 检查请求头 | 确保使用 `Bearer` 前缀 |
| 签名算法不一致 | 检查 Claims | 确保 `SigningMethod` 一致 |

正确请求头示例：

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
:::

### Q: 如何实现密码加密？

::: details 查看解决方案
推荐直接使用 `bcrypt`。

```go
import "golang.org/x/crypto/bcrypt"

// 加密密码
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}

// 验证密码
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```
:::

### Q: Gin 路由不生效？

::: details 查看解决方案
常见原因有两个：

1. 路由顺序错误，静态路由应放在通配符前面
2. 使用路由组时，忘了把最终完整路径脑补出来

```go
// ❌ 错误
r.GET("/api/:id", handler)
r.GET("/api/ping", handler)

// ✅ 正确
r.GET("/api/ping", handler)
r.GET("/api/:id", handler)
```

```go
v1 := r.Group("/api/v1")
{
    v1.GET("/users", getUsers) // 完整路径是 /api/v1/users
}
```
:::

## MinIO 相关

### Q: MinIO 连接失败？

::: details 查看解决方案
```bash
# 检查 MinIO 是否运行
docker ps | grep minio

# 检查健康状态
curl http://localhost:9000/minio/health/live

# 查看日志
docker logs iwan-minio
```
:::

### Q: MinIO 存储桶如何创建？

::: details 查看解决方案
可以通过控制台或脚本两种方式创建。

1. 通过控制台访问 `http://localhost:9001`
2. 使用默认账号 `minioadmin / minioadmin123` 登录
3. 点击 `Buckets` -> `Create Bucket`

或直接执行：

```bash
./scripts/init-minio.sh
```
:::

### Q: MinIO 文件上传失败？

::: details 查看解决方案
| 问题 | 解决方案 |
|------|----------|
| 存储桶不存在 | 先创建存储桶 |
| 权限错误 | 设置存储桶为公共读取 |
| 连接错误 | 检查 endpoint 配置，不要额外加 `http://` |
| 文件过大 | 检查 MinIO 的大小限制配置 |
:::

## 部署问题

### Q: Docker 镜像构建失败？

::: details 查看解决方案
先检查 Dockerfile 是否采用多阶段构建，以及 `go.mod`、`go.sum` 是否同步。

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server cmd/server/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

常见原因：

- `go.mod` 和 `go.sum` 不匹配
- 网络环境导致 `go mod download` 失败
- 构建上下文缺少配置文件或源码
:::

### Q: Nginx 502 错误？

::: details 查看解决方案
```bash
# 1. 确认后端服务是否启动
curl http://localhost:8080/health

# 2. 检查 Nginx 配置
cat /etc/nginx/nginx.conf

# 3. 检查 Nginx 日志
tail -f /var/log/nginx/error.log

# 4. 确认端口正确
netstat -tuln | grep 8080
```
:::

### Q: 如何配置 HTTPS？

::: details 查看解决方案
最常见方案是使用 Let's Encrypt。

```bash
# 安装 certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d api.example.com
```

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
}
```
:::

## 前端问题

### Q: API 请求跨域？

::: details 查看解决方案
后端添加 CORS 中间件即可，参考上面的“跨域问题如何解决”。
:::

### Q: Token 存储在哪里？

::: details 查看解决方案
教程推荐 `Pinia + localStorage` 的实现方式。

```ts
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || ''
  }),

  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem('token', token)
    },
    clearToken() {
      this.token = ''
      localStorage.removeItem('token')
    }
  }
})
```
:::

### Q: 路由守卫如何实现？

::: details 查看解决方案
```ts
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.token) {
    next('/login')
  } else {
    next()
  }
})
```
:::

## 性能问题

### Q: 接口响应慢？

::: details 查看解决方案
优先从数据库慢查询、接口分析和索引优化入手。

```bash
# PostgreSQL: 启用慢查询日志
docker exec -it iwan-postgres psql -U iwan -d iwan_station -c "
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
"

# 使用 pprof 分析
curl http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# 添加索引
CREATE INDEX idx_users_email ON users(email);
```
:::

### Q: 内存占用高？

::: details 查看解决方案
```bash
# 查看 heap profile
go tool pprof http://localhost:8080/debug/pprof/heap
```

重点排查：

- Goroutine 泄漏
- 未关闭的连接
- 缓存持有过多大对象
:::

## 其他资源

### 官方文档

- [Go 官方文档](https://golang.org/doc/)
- [Gin 框架文档](https://gin-gonic.com/docs/)
- [GORM 文档](https://gorm.io/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Docker 文档](https://docs.docker.com/)

### 社区资源

- [Go 语言中文网](https://studygolang.com/)
- [Go by Example](https://gobyexample.com/)
- [Effective Go](https://go.dev/doc/effective_go)

### 工具推荐

| 类型 | 推荐工具 |
|------|----------|
| IDE | VSCode, GoLand |
| API 测试 | Postman, Bruno |
| 数据库工具 | DBeaver, TablePlus |
| Git 客户端 | GitKraken, SourceTree |

## 还有问题？

如果以上内容还没解决你的问题，建议按这个顺序继续排查：

1. 查看对应章节的详细说明
2. 搜索 issue 中是否有类似问题
3. 整理复现步骤后再提问

::: details 提问时建议附带的信息
- 完整错误信息或截图
- 相关代码片段
- 操作系统、Go 版本、Docker 版本
- 已尝试过的解决方法
:::
