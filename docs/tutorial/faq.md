# 常见问题解答（FAQ）

本文档收集了学习过程中最常遇到的问题和解决方案。

---

## 🚀 快速导航

- [环境安装](#环境安装)
- [Docker 相关](#docker-相关)
- [开发问题](#开发问题)
- [数据库问题](#数据库问题)
- [代码问题](#代码问题)
- [部署问题](#部署问题)
- [前端问题](#前端问题)

---

## 环境安装

### Q: Go 安装后无法识别命令？

**A**: 检查环境变量配置：

```bash
# 检查 Go 是否安装
go version

# 检查 GOPATH
go env GOPATH

# 确保 $GOPATH/bin 在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin
```

**Windows 用户：**
```powershell
# 检查环境变量
echo $env:PATH

# 重新打开终端使环境变量生效
```

### Q: go mod tidy 很慢或失败？

**A**: 使用国内镜像加速：

```bash
# 设置 GOPROXY
go env -w GOPROXY=https://goproxy.cn,direct

# 清理缓存后重试
go clean -modcache
go mod tidy
```

### Q: 需要安装 PostgreSQL 和 Redis 吗？

**A**: 不需要！教程使用 Docker 运行所有基础服务：

```bash
# 一键启动所有服务
./scripts/start-dev.sh    # macOS/Linux
.\scripts\start-dev.bat   # Windows
```

**推荐使用 Docker 的原因：**
- ✅ 避免本地安装多个服务的麻烦
- ✅ 环境隔离，不影响本地系统
- ✅ 一键启动，快速切换
- ✅ 与生产环境一致

---

## Docker 相关

### Q: Docker Desktop 启动失败？

**A**: 常见解决方案：

| 问题 | 解决方案 |
|------|----------|
| WSL 2 未安装 | 启用 WSL 2 功能 |
| 虚拟化未启用 | 在 BIOS 中启用虚拟化 |
| Hyper-V 冲突 | 禁用其他虚拟化软件 |

**Windows 启用 WSL 2：**
```powershell
# 以管理员身份运行 PowerShell
wsl --install
```

### Q: docker-compose 命令不存在？

**A**: 新版本 Docker Desktop 已集成 docker-compose：

```bash
# 使用 docker compose（空格）
docker compose -f docker-compose.dev.yml up -d

# 而不是 docker-compose（连字符）
```

如果还是不行，重新安装 Docker Desktop。

### Q: Docker 服务启动失败？

**A**: 检查端口占用：

```bash
# 检查端口占用
netstat -ano | findstr :5432  # Windows
lsof -ti:5432                  # macOS/Linux

# 查看服务日志
docker-compose -f docker-compose.dev.yml logs postgres
```

### Q: Docker 容器日志怎么看？

**A**: 查看服务日志：

```bash
# 查看所有服务日志
docker-compose -f docker-compose.dev.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.dev.yml logs postgres

# 实时跟踪日志
docker-compose -f docker-compose.dev.yml logs -f

# 查看最近 100 行
docker-compose -f docker-compose.dev.yml logs --tail=100
```

---

## 开发问题

### Q: 端口被占用怎么办？

**A**: 查找并释放端口：

**macOS/Linux:**
```bash
# 查找占用端口的进程
lsof -ti:8080

# 结束进程
kill -9 $(lsof -ti:8080)

# 或使用指定端口启动
go run cmd/server/main.go --port=8081
```

**Windows (PowerShell):**
```powershell
# 查找占用端口的进程
netstat -ano | findstr :8080

# 结束进程
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force
```

### Q: 热重载（air）不生效？

**A**: 检查 air 配置：

```bash
# 确认 air 已安装
which air

# 重新安装 air
go install github.com/air-verse/air@latest

# 检查 .air.toml 配置
cat .air.toml
```

**常见问题：**
- 文件保存后没有触发重新编译 → 检查 `include_ext` 配置
- 编译错误导致服务停止 → 设置 `stop_on_error = false`

### Q: 跨域问题如何解决？

**A**: 添加 CORS 中间件：

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

---

## 数据库问题

### Q: PostgreSQL 连接失败？

**A**: 排查步骤：

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

**常见错误：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| connection refused | PostgreSQL 未启动 | `docker-compose up -d postgres` |
| authentication failed | 密码错误 | 检查配置文件中的密码 |
| database does not exist | 数据库未创建 | 手动创建数据库 |

### Q: 如何重置数据库？

**A**: 删除容器重新创建：

```bash
# 停止并删除容器和数据卷
docker-compose -f docker-compose.dev.yml down -v

# 重新启动
./scripts/start-dev.sh
```

**或只删除数据库：**
```bash
# 重新创建数据库
docker exec -it iwan-postgres psql -U iwan -c "DROP DATABASE IF EXISTS iwan_station;"
docker exec -it iwan-postgres psql -U iwan -c "CREATE DATABASE iwan_station;"
```

### Q: GORM 自动迁移失败？

**A**: 常见原因：

| 问题 | 解决方案 |
|------|----------|
| 连接失败 | 检查数据库是否启动 |
| 权限不足 | 确认用户有 CREATE TABLE 权限 |
| 表已存在 | AutoMigrate 不会删除已有表，只添加新字段 |
| 字段类型不匹配 | 检查 GORM 标签是否正确 |

**调试方法：**
```go
// 启用 GORM 日志
db, err := gorm.Open(dialector, &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info),
})
```

### Q: Redis 连接超时？

**A**: 检查 Redis 服务：

```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试连接
docker exec -it iwan-redis redis-cli -a iwan123456 ping
# 应返回: PONG

# 查看日志
docker logs iwan-redis
```

---

## 代码问题

### Q: GORM 标签有哪些推荐写法？

**A**: 使用通用标签兼容多种数据库：

```go
// ❌ 不推荐：MySQL 特定
ID       uint64 `gorm:"primary_key;auto_increment;type:bigint"`
Username string `gorm:"type:varchar(50);uniqueIndex"`

// ✅ 推荐：通用标签
ID       uint64 `gorm:"primarykey"`
Username string `gorm:"size:50;uniqueIndex;not null"`
```

### Q: JWT Token 验证失败？

**A**: 常见原因：

| 原因 | 检查方法 | 解决方案 |
|------|----------|----------|
| 密钥不一致 | 检查配置文件 | 确保 JWT_SECRET 一致 |
| Token 过期 | 检查过期时间 | 实现刷新机制 |
| 格式错误 | 检查请求头 | 确保使用 `Bearer` 前缀 |
| 签名算法 | 检查 Claims | 确保 SigningMethod 一致 |

**正确的请求头：**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Q: 如何实现密码加密？

**A**: 使用 bcrypt：

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

### Q: Gin 路由不生效？

**A**: 常见原因：

1. **路由顺序错误**：通配符路由应该放在最后
```go
// ❌ 错误
r.GET("/api/:id", handler)
r.GET("/api/ping", handler)  // 永远不会匹配

// ✅ 正确
r.GET("/api/ping", handler)
r.GET("/api/:id", handler)
```

2. **路由组未使用**：使用路由组时记得设置前缀
```go
v1 := r.Group("/api/v1")
{
    v1.GET("/users", getUsers)  // 完整路径是 /api/v1/users
}
```

---

## MinIO 相关

### Q: MinIO 连接失败？

**A**: 检查 MinIO 服务：

```bash
# 检查 MinIO 是否运行
docker ps | grep minio

# 检查健康状态
curl http://localhost:9000/minio/health/live

# 查看日志
docker logs iwan-minio
```

### Q: MinIO 存储桶如何创建？

**A**: 两种方式：

**方式一：通过控制台**
1. 访问 http://localhost:9001
2. 登录（minioadmin / minioadmin123）
3. 点击 "Buckets" → "Create Bucket"

**方式二：通过脚本**
```bash
./scripts/init-minio.sh
```

### Q: MinIO 文件上传失败？

**A**: 常见原因：

| 问题 | 解决方案 |
|------|----------|
| 存储桶不存在 | 先创建存储桶 |
| 权限错误 | 设置存储桶为公共读取 |
| 连接错误 | 检查 endpoint 配置（不要加 http://） |
| 文件过大 | 检查 MinIO 的大小限制配置 |

---

## 部署问题

### Q: Docker 镜像构建失败？

**A**: 检查 Dockerfile：

```dockerfile
# 使用多阶段构建减小镜像体积
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

**常见错误：**
- `go.mod` 和 `go.sum` 不匹配 → 运行 `go mod tidy`
- 网络问题 → 使用代理或配置 Docker 镜像加速

### Q: Nginx 502 错误？

**A**: 检查后端服务：

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

### Q: 如何配置 HTTPS？

**A**: 使用 Let's Encrypt：

```bash
# 安装 certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d api.example.com

# Nginx 配置
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
}
```

---

## 前端问题

### Q: API 请求跨域？

**A**: 后端添加 CORS 中件件（见上文"跨域问题如何解决"）

### Q: Token 存储在哪里？

**A**: 推荐方案：

```javascript
// 使用 Pinia + localStorage
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || ''
  }),

  actions: {
    setToken(token) {
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

### Q: 路由守卫如何实现？

**A**: Vue Router 示例：

```javascript
// router/index.js
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.token) {
    next('/login')
  } else {
    next()
  }
})
```

---

## 性能问题

### Q: 接口响应慢？

**A**: 优化检查清单：

```bash
# 1. 启用慢查询日志
# PostgreSQL
docker exec -it iwan-postgres psql -U iwan -d iwan_station -c "
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
"

# 2. 使用 pprof 分析
curl http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# 3. 添加索引
CREATE INDEX idx_users_email ON users(email);
```

### Q: 内存占用高？

**A**: 检查内存泄漏：

```bash
# 查看 heap profile
go tool pprof http://localhost:8080/debug/pprof/heap

# 常见原因
- Goroutine 泄漏
- 未关闭的连接
- 缓存过多数据
```

---

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

---

## 还有问题？

如果以上文档没有解决你的问题：

1. 📖 查看对应章节的详细说明
2. 🔍 搜索 issue 中是否有类似问题
3. 💬 提交 issue 寻求帮助
4. 📧 联系维护者

**提交 issue 时请包含：**
- 错误信息完整截图
- 相关代码片段
- 运行环境信息（OS、Go 版本等）
- 已尝试的解决方法
