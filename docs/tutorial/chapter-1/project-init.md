# 项目初始化

## 学习目标

完成本章后，你将：
- ✅ 理解 Go 项目的标准目录结构
- ✅ 掌握 Go Module 的使用
- ✅ 创建第一个 Gin 项目
- ✅ 配置项目的基础依赖
- ✅ 运行第一个 API 服务

---

## 📁 项目结构概览

让我们先了解最终的目录结构：

```
iwan-station-gin/
├── backend/                      # 后端项目
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
├── admin/                      # 前端项目（可选）
├── docker-compose.dev.yml     # 开发环境 Docker
├── scripts/                   # 启动脚本
└── docs/                      # 文档
```

---

## 第一步：创建项目目录

### 方式一：从头开始创建

```bash
# 创建项目根目录
mkdir iwan-station-gin
cd iwan-station-gin

# 创建后端目录
mkdir -p backend/{cmd/server,internal/{api/v1,service,repository,model,middleware,pkg/{database,jwt,response,logger,minio},config,router},config,logs,uploads}
```

### 方式二：克隆项目（推荐）

```bash
# 克隆完整项目
git clone https://github.com/your-org/iwan-station-gin.git
cd iwan-station-gin/backend
```

---

## 第二步：初始化 Go Module

```bash
cd backend

# 初始化 Go Module
go mod init iwan-station-gin
```

**生成的 `go.mod` 文件：**

```go
module iwan-station-gin

go 1.21
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
cd backend

# Web 框架
go get -u github.com/gin-gonic/gin

# ORM 框架（支持 PostgreSQL 和 MySQL）
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u gorm.io/driver/mysql

# 配置管理
go get -u github.com/spf13/viper

# JWT 认证
go get -u github.com/golang-jwt/jwt/v5

# 日志
go get -u go.uber.org/zap
go get -u github.com/natefinch/lumberjack

# Redis
go get -u github.com/redis/go-redis/v9

# MinIO SDK
go get -u github.com/minio/minio-go/v7

# 密码加密
go get -u golang.org/x/crypto/bcrypt

# UUID 生成
go get -u github.com/google/uuid

# 热重载工具
go install github.com/air-verse/air@latest
```

> 💡 **提示**：如果依赖下载很慢，使用国内镜像：
> ```bash
> go env -w GOPROXY=https://goproxy.cn,direct
> ```

---

## 第四步：创建配置文件

### 配置文件结构

创建 `backend/config/config.yaml`：

```yaml
# 服务器配置
server:
  port: 8080                      # 服务端口
  mode: debug                     # 运行模式: debug/release/test
  read_timeout: 60                # 读超时（秒）
  write_timeout: 60               # 写超时（秒）

# 数据库配置（使用 Docker 中的 PostgreSQL）
database:
  type: postgresql                # 数据库类型: postgresql 或 mysql
  host: localhost                 # Docker 环境使用 localhost
  port: 5432                      # PostgreSQL 默认端口
  username: iwan
  password: iwan123456
  database: iwan_station
  max_idle_conns: 10              # 最大空闲连接数
  max_open_conns: 100             # 最大打开连接数
  max_lifetime: 3600              # 连接最大生命周期（秒）

# Redis 配置（使用 Docker 中的 Redis）
redis:
  host: localhost
  port: 6379
  password: iwan123456
  db: 0                           # 使用的数据库编号
  pool_size: 10                   # 连接池大小

# MinIO 配置（使用 Docker 中的 MinIO）
minio:
  endpoint: localhost:9000        # MinIO API 地址
  access_key: minioadmin          # 访问密钥
  secret_key: minioadmin123       # 秘密密钥
  bucket: iwan-uploads            # 默认存储桶
  use_ssl: false                  # 是否使用 HTTPS

# JWT 配置
jwt:
  secret: "your-secret-key-change-in-production"  # JWT 密钥（生产环境请修改）
  expire_time: 24                # 过期时间（小时）
  issuer: "iwan-station"          # 签发者

# 日志配置
logger:
  level: info                     # 日志级别: debug/info/warn/error
  filename: "logs/app.log"        # 日志文件路径
  max_size: 100                   # 单个日志文件最大大小（MB）
  max_age: 30                     # 日志文件保留天数
  max_backups: 10                 # 保留的旧日志文件数量
  compress: true                  # 是否压缩旧日志
```

### 创建示例配置

```bash
# 创建配置文件副本
cp config/config.yaml config/config.yaml.example
```

---

## 第五步：创建配置加载

创建 `backend/internal/config/config.go`：

```go
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	MinIO    MinIOConfig
	JWT      JWTConfig
	Logger   LoggerConfig
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port         int
	Mode         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Type         string
	Host         string
	Port         int
	Username     string
	Password     string
	Database     string
	MaxIdleConns int
	MaxOpenConns int
	MaxLifetime  time.Duration
}

// RedisConfig Redis 配置
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	PoolSize int
}

// MinIOConfig MinIO 配置
type MinIOConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret     string
	ExpireTime int
	Issuer     string
}

// LoggerConfig 日志配置
type LoggerConfig struct {
	Level      string
	Filename   string
	MaxSize    int
	MaxAge     int
	MaxBackups int
	Compress   bool
}

// Load 加载配置文件
func Load(path string) (*Config, error) {
	v := viper.New()

	v.SetConfigFile(path)
	v.SetConfigType("yaml")

	// 读取环境变量
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("读取配置失败: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	return &cfg, nil
}

// Validate 验证配置
func (c *Config) Validate() error {
	// 验证服务器端口
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		return fmt.Errorf("服务器端口无效: %d", c.Server.Port)
	}

	// 验证数据库配置
	if c.Database.Host == "" {
		return fmt.Errorf("数据库主机不能为空")
	}

	// 验证 JWT 密钥
	if c.JWT.Secret == "" || c.JWT.Secret == "your-secret-key-change-in-production" {
		return fmt.Errorf("JWT 密钥必须设置且不能使用默认值")
	}

	return nil
}
```

---

## 第六步：创建第一个 API

创建 `backend/cmd/server/main.go`：

```go
package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
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
	addr := ":8080"
	fmt.Printf("🚀 Server starting on %s\n", addr)
	fmt.Printf("📖 Health check: http://localhost%s/health\n", addr)
	fmt.Printf("📡 API v1: http://localhost%s/api/v1/ping\n", addr)

	if err := r.Run(addr); err != nil {
		fmt.Printf("❌ Failed to start server: %v\n", err)
	}
}
```

---

## 第七步：运行项目

### 方式一：直接运行

```bash
cd backend
go run cmd/server/main.go
```

### 方式二：使用热重载

```bash
cd backend
air
```

### 方式三：编译后运行

```bash
cd backend
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

## 🔧 热重载配置

创建 `backend/.air.toml`：

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

---

## 📋 项目文件清单

确保你的项目包含以下文件：

```
backend/
├── cmd/
│   └── server/
│       └── main.go              ✅ 主程序
├── internal/
│   └── config/
│       └── config.go            ✅ 配置加载
├── config/
│   ├── config.yaml              ✅ 配置文件
│   └── config.yaml.example      ✅ 配置示例
├── logs/                        ✅ 日志目录（空）
├── uploads/                     ✅ 上传目录（空）
├── go.mod                       ✅ Go 模块
├── go.sum                       ✅ 依赖锁定
└── .air.toml                    ✅ 热重载配置
```

---

## 🆚 Java vs Go 对比

### 1. 项目结构

| Spring Boot | Go |
|-------------|-----|
| `src/main/java/com/iwan/` | `backend/` |
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

- [ ] Go 1.21+ 已安装
- [ ] Docker 已安装并运行
- [ ] 基础服务已启动（PostgreSQL、Redis、MinIO）
- [ ] Go Module 已初始化
- [ ] 核心依赖已安装
- [ ] 配置文件已创建
- [ ] 第一个 API 能正常访问
- [ ] 热重载工具已配置

---

## 🎯 恭喜！

你已经成功创建了第一个 Gin 项目！

**下一步：**
- 了解「[项目架构设计](../chapter-2/)」
- 学习「[分层架构设计](../chapter-2/layered-design)」
