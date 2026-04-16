# 项目初始化

## 学习目标

完成本章后，你将：
- ✅ 理解 Go 项目的标准目录结构
- ✅ 掌握 Go Module 的使用
- ✅ 创建第一个 Gin 项目
- ✅ 运行第一个 API 服务

---

## 📁 项目结构概览

让我们先了解最终的目录结构：

```
iwan-station-gin/
├── server/                       # 后端 API 项目
│   ├── cmd/                     # 应用入口
│   │   └── server/
│   │       └── main.go         # 主程序
│   ├── internal/               # 私有代码
│   │   ├── api/               # HTTP 处理器
│   │   │   └── v1/
│   │   ├── service/           # 业务逻辑
│   │   ├── repository/        # 数据访问
│   │   ├── model/             # 数据模型
│   │   ├── middleware/        # 中间件
│   │   ├── pkg/               # 内部工具包
│   │   ├── config/            # 配置
│   │   └── router/            # 路由
│   ├── config/                # 配置文件
│   ├── logs/                  # 日志文件
│   ├── go.mod
│   └── go.sum
├── admin/                       # 后台管理前端
├── web/                         # 门户前端
├── docker-compose.dev.yml       # 开发环境 Docker
├── scripts/                     # 启动脚本
└── docs/                        # 文档
```

---

## 第一步：创建项目目录

创建项目根目录和后端目录结构：

**Windows (PowerShell):**

```powershell
mkdir iwan-station-gin
cd iwan-station-gin
'server/cmd/server','server/internal/api/v1','server/internal/service','server/internal/repository','server/internal/model','server/internal/middleware','server/internal/pkg/database','server/internal/pkg/jwt','server/internal/pkg/response','server/internal/pkg/logger','server/internal/pkg/minio','server/internal/config','server/internal/router','server/config','server/logs','server/uploads' | ForEach-Object { mkdir $_ -Force }
```

**Windows (cmd):**

```cmd
mkdir iwan-station-gin
cd iwan-station-gin
mkdir server\cmd\server server\internal\api\v1 server\internal\service server\internal\repository server\internal\model server\internal\middleware server\internal\pkg\database server\internal\pkg\jwt server\internal\pkg\response server\internal\pkg\logger server\internal\pkg\minio server\internal\config server\internal\router server\config server\logs server\uploads
```

**macOS / Linux:**

```bash
mkdir iwan-station-gin
cd iwan-station-gin

mkdir -p server/{cmd/server,internal/{api/v1,service,repository,model,middleware,pkg/{database,jwt,response,logger,minio},config,router},config,logs,uploads}
```

> **💡 参考项目**
>
> 如果你想查看完整的项目代码，可以参考：
> https://github.com/your-org/iwan-station-gin
>
> 但强烈建议**跟随教程手动创建**，这样能更好地理解每个部分的作用。

---

## 第二步：初始化 Go Module

```bash
cd server

# 初始化 Go Module
go mod init iwan-station-gin
```

**生成的 `go.mod` 文件：**

```go
module iwan-station-gin

go 1.26.1
```

### 📖 Go Module 说明

| Maven (pom.xml) | Go (go.mod) |
|-----------------|-------------|
| `<groupId>com.iwan</groupId>` | `module iwan-station-gin` |
| `<artifactId>iwan-station</artifactId>` | - |
| `<version>1.0.0</version>` | - |

**Go 的特点：**
- 不需要 groupId 和 artifactId
- 版本由 git tag 管理
- 依赖自动下载到 `GOPATH/pkg/mod`

---

## 第三步：安装核心依赖

```bash
cd server

# Web 框架 https://gin-gonic.com/
go get -u github.com/gin-gonic/gin

# ORM 框架 https://gorm.io/
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres    # PostgreSQL 教程使用
go get -u gorm.io/driver/mysql      # MySQL 可选，二选一即可

# 配置管理 https://github.com/spf13/viper
go get -u github.com/spf13/viper

# JWT 认证 https://github.com/golang-jwt/jwt
go get -u github.com/golang-jwt/jwt/v5

# 日志 https://github.com/uber-go/zap
go get -u go.uber.org/zap
# 日志轮转（切割、压缩、清理）https://github.com/natefinch/lumberjack
go get -u github.com/natefinch/lumberjack

# Redis https://github.com/redis/go-redis
go get -u github.com/redis/go-redis/v9

# MinIO SDK https://github.com/minio/minio-go
go get -u github.com/minio/minio-go/v7

# 密码加密 https://pkg.go.dev/golang.org/x/crypto/bcrypt
go get -u golang.org/x/crypto/bcrypt

# UUID 生成 https://github.com/google/uuid
go get -u github.com/google/uuid

# 热重载工具 https://github.com/air-verse/air
go install github.com/air-verse/air@latest
```

> 💡 **提示**：如果依赖下载很慢，使用国内镜像：
> ```bash
> go env -w GOPROXY=https://goproxy.cn,direct
> ```

---

## 第四步：创建配置文件

创建 `server/config/config.yaml`：

```yaml
# 服务器配置
server:
  port: 8080          # 服务端口
  mode: debug         # 运行模式: debug/release

# 数据库配置（使用上一章 Docker 中的 PostgreSQL）
database:
  host: localhost     # Docker 环境使用 localhost
  port: 5432
  username: iwan
  password: iwan123456
  database: iwan_station
```

> **💡 提示**
>
> 这是**基础配置文件**，足够本地开发使用。
> 生产环境的配置管理（环境变量、配置优先级、验证等）将在「[第3章：配置管理](../chapter-3/configuration.md)」详细讲解。

---

## 第五步：创建配置加载

创建 `server/internal/config/config.go`：

```go
package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Database string `mapstructure:"database"`
}

// Load 加载配置文件
func Load(configPath string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(configPath)

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	return &cfg, nil
}
```

---

## 第六步：创建主程序

创建 `server/cmd/server/main.go`：

```go
package main

import (
	"fmt"
	"net/http"

	"iwan-station-gin/internal/config"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		fmt.Printf("❌ 配置加载失败: %v\n", err)
		return
	}

	// 设置运行模式
	gin.SetMode(cfg.Server.Mode)

	// 创建 Gin 引擎
	r := gin.Default()

	// 健康检查接口
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Iwan Station API is running",
		})
	})

	// API v1 路由组
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})
	}

	// 启动服务器
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	fmt.Printf("🚀 Server starting on %s\n", addr)
	fmt.Printf("📖 Health check: http://localhost%s/health\n", addr)
	fmt.Printf("📡 API v1: http://localhost%s/api/v1/ping\n", addr)

	if err := r.Run(addr); err != nil {
		fmt.Printf("❌ Failed to start server: %v\n", err)
	}
}
```

---

## 第七步：运行项目 {#step-7-run}

### 方式一：直接运行

```bash
cd server
go run cmd/server/main.go
```

### 方式二：使用热重载（推荐）

**什么是热重载？** 代码修改后自动重启服务，无需手动停止和运行，开发时能极大提高效率。

```bash
cd server
air
```

运行后会看到类似输出：

```
[10:02:57] building...
[10:02:57] running...
🚀 Server starting on :8080
📖 Health check: http://localhost:8080/health
📡 API v1: http://localhost:8080/api/v1/ping

[GIN-debug] Listening and serving HTTP on :8080
```

**重点**：
- 运行 `air` 后会自动启动项目
- 修改代码后会自动重启（显示 `building...` 和 `running...`）
- **不需要再手动运行 `go run`**

> 💡 首次使用需要先配置 Air，见下方「[第九步：热重载配置](#step-9-hot-reload)」

### 方式三：编译后运行

```bash
cd server
go build -o bin/server cmd/server/main.go
./bin/server
```

**启动成功后会看到：**

```
🚀 Server starting on :8080
📖 Health check: http://localhost:8080/health
📡 API v1: http://localhost:8080/api/v1/ping

[GIN-debug] Listening and serving HTTP on :8080
```

---

## 第八步：测试 API

### 使用 curl 测试

```bash
# 测试健康检查
curl http://localhost:8080/health

# 测试 API v1
curl http://localhost:8080/api/v1/ping
```

**预期响应：**

```json
// /health
{
  "status": "ok",
  "message": "Iwan Station API is running"
}

// /api/v1/ping
{
  "message": "pong"
}
```

### 使用浏览器测试

直接访问：
- http://localhost:8080/health
- http://localhost:8080/api/v1/ping

---

## 第九步：热重载配置 {#step-9-hot-reload}

热重载介绍见上方「[第七步：运行项目](#step-7-run)」

创建 `server/.air.toml`：

**Windows:**

```toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/main.exe ./cmd/server"
bin = "tmp/main.exe"
include_ext = ["go", "yaml"]
exclude_dir = ["tmp", "logs", "uploads"]
delay = 1000
stop_on_error = true

[log]
time = true
```

**macOS / Linux:**

```toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/main ./cmd/server"
bin = "tmp/main"
include_ext = ["go", "yaml"]
exclude_dir = ["tmp", "logs", "uploads"]
delay = 1000
stop_on_error = true

[log]
time = true
```

> **关键区别**：Windows 需要在 `cmd` 和 `bin` 中都加上 `.exe` 扩展名。

### 配置说明

| 配置项 | 说明 |
|--------|------|
| `cmd` | 构建命令，`-o` 后面是输出文件路径 |
| `bin` | 运行的可执行文件路径，必须与 cmd 输出文件一致 |

---

## 📋 项目文件清单

确保你的项目包含以下文件：

```
server/
├── cmd/
│   └── server/
│       └── main.go              ✅ 主程序
├── internal/
│   └── config/
│       └── config.go            ✅ 配置加载
├── config/
│   └── config.yaml              ✅ 配置文件
├── go.mod                       ✅ Go 模块
├── go.sum                       ✅ 依赖锁定
└── .air.toml                    ✅ 热重载配置
```

---

## 🆚 Java vs Go 对比

### 1. 项目结构

| Spring Boot | Go |
|-------------|-----|
| `src/main/java/com/iwan/` | `server/` |
| `src/main/resources/` | `config/` |
| `pom.xml` | `go.mod` |

### 2. 依赖管理

| Maven | Go |
|-------|-----|
| `<dependency>` | `go get` |
| `pom.xml` | `go.mod` |
| `mvn install` | `go mod tidy` |

### 3. 构建运行

| Java | Go |
|------|-----|
| `mvn spring-boot:run` | `go run main.go` |
| `java -jar app.jar` | `./bin/server` |

---

## ✅ 验证清单

完成以下检查确保项目初始化成功：

- [ ] Go 1.26+ 已安装
- [ ] Go Module 已初始化
- [ ] 核心依赖已安装（gin、viper）
- [ ] 配置文件已创建（config.yaml）
- [ ] 第一个 API 能正常访问
- [ ] 热重载工具已配置（可选）

---

## 🎯 恭喜！

你已经成功创建了第一个 Gin 项目！

**下一步：**
- 了解「[项目架构设计](../chapter-2/)」
- 学习「[配置管理](../chapter-3/configuration.md)」- 完整的 Viper 配置系统
