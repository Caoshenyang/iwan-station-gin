# 2.3 配置管理

## 使用 Viper 管理配置

Viper 是 Go 生态中最流行的配置管理库，支持多种配置源（文件、环境变量、命令行参数）的灵活组合。

### 为什么选择 Viper + 结构体默认值？

| 优势 | 说明 |
|------|------|
| **类型安全** | 结构体提供编译时类型检查，IDE 自动补全 |
| **默认值直观** | 代码即文档，一目了然 |
| **环境变量优先** | 符合 12-factor app 原则 |
| **容器友好** | Kubernetes ConfigMap/Secret 直接映射为环境变量 |
| **可选配置文件** | 本地开发用 YAML，生产环境用环境变量 |

### 配置优先级（从高到低）

1. **环境变量** - 生产环境推荐
2. **配置文件**（config.yaml）- 本地开发可选
3. **结构体默认值** - 兜底保障

## 配置结构体（带默认值）

### 定义配置结构体

```go
// config/config.go
package config

// Config 应用配置
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    JWT      JWTConfig      `mapstructure:"jwt"`
    Log      LogConfig      `mapstructure:"log"`
    Casbin   CasbinConfig   `mapstructure:"casbin"`
    Upload   UploadConfig   `mapstructure:"upload"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
    Port         int    `mapstructure:"port"`
    Mode         string `mapstructure:"mode"`           // debug/release/test
    ReadTimeout  int    `mapstructure:"read_timeout"`
    WriteTimeout int    `mapstructure:"write_timeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
    Type         string `mapstructure:"type"`      // mysql 或 postgresql
    Host         string `mapstructure:"host"`
    Port         int    `mapstructure:"port"`
    Username     string `mapstructure:"username"`
    Password     string `mapstructure:"password"`
    Database     string `mapstructure:"database"`
    Charset      string `mapstructure:"charset"`   // MySQL 使用
    ParseTime    bool   `mapstructure:"parse_time"`
    MaxIdleConns int    `mapstructure:"max_idle_conns"`
    MaxOpenConns int    `mapstructure:"max_open_conns"`
    MaxLifetime  int    `mapstructure:"max_lifetime"`
}

// RedisConfig Redis 配置
type RedisConfig struct {
    Host       string `mapstructure:"host"`
    Port       int    `mapstructure:"port"`
    Password   string `mapstructure:"password"`
    DB         int    `mapstructure:"db"`
    PoolSize   int    `mapstructure:"pool_size"`
    MinIdleConn int   `mapstructure:"min_idle_conn"`
}

// JWTConfig JWT 配置
type JWTConfig struct {
    Secret     string `mapstructure:"secret"`
    ExpireTime int    `mapstructure:"expire_time"` // 小时
    Issuer     string `mapstructure:"issuer"`
}

// LogConfig 日志配置
type LogConfig struct {
    Level      string `mapstructure:"level"`
    Filename   string `mapstructure:"filename"`
    MaxSize    int    `mapstructure:"max_size"`
    MaxBackups int    `mapstructure:"max_backups"`
    MaxAge     int    `mapstructure:"max_age"`
    Compress   bool   `mapstructure:"compress"`
}

// CasbinConfig Casbin 配置
type CasbinConfig struct {
    ModelPath string `mapstructure:"model_path"`
}

// UploadConfig 文件上传配置
type UploadConfig struct {
    MaxSize   int      `mapstructure:"max_size"`
    AllowExts []string `mapstructure:"allow_exts"`
    SavePath  string   `mapstructure:"save_path"`
}
```

### 设置默认值

```go
// config/config.go
package config

// DefaultConfig 返回带有默认值的配置
func DefaultConfig() *Config {
    return &Config{
        Server: ServerConfig{
            Port:         8080,
            Mode:         "debug",
            ReadTimeout:  60,
            WriteTimeout: 60,
        },
        Database: DatabaseConfig{
            Type:         "mysql",
            Host:         "localhost",
            Port:         3306,
            Username:     "iwan",
            Password:     "",
            Database:     "iwan_station",
            Charset:      "utf8mb4",
            ParseTime:    true,
            MaxIdleConns: 10,
            MaxOpenConns: 100,
            MaxLifetime:  3600,
        },
        Redis: RedisConfig{
            Host:       "localhost",
            Port:       6379,
            Password:   "",
            DB:         0,
            PoolSize:   10,
            MinIdleConn: 5,
        },
        JWT: JWTConfig{
            Secret:     "change-me-in-production",
            ExpireTime: 24,
            Issuer:     "iwan-station",
        },
        Log: LogConfig{
            Level:      "info",
            Filename:   "logs/app.log",
            MaxSize:    100,
            MaxBackups: 3,
            MaxAge:     30,
            Compress:   true,
        },
        Casbin: CasbinConfig{
            ModelPath: "./config/rbac_model.conf",
        },
        Upload: UploadConfig{
            MaxSize: 10,
            AllowExts: []string{".jpg", ".jpeg", ".png", ".gif", ".pdf"},
            SavePath: "./uploads",
        },
    }
}
```

## 加载配置

### 完整加载流程

```go
// config/config.go
package config

import (
    "fmt"
    "strings"

    "github.com/spf13/viper"
)

// LoadConfig 加载配置
func LoadConfig() (*Config, error) {
    // 1. 从默认值开始
    cfg := DefaultConfig()

    // 2. 创建 Viper 实例
    v := viper.New()

    // 3. 可选：读取配置文件（如果存在）
    v.SetConfigName("config")
    v.SetConfigType("yaml")
    v.AddConfigPath(".")
    v.AddConfigPath("./config")

    // 配置文件是可选的，不存在也不报错
    if err := v.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("读取配置文件失败: %w", err)
        }
        // 配置文件不存在，使用默认值
    }

    // 4. 启用环境变量覆盖
    v.AutomaticEnv()
    v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

    // 5. 解析到配置结构体（会覆盖默认值）
    if err := v.Unmarshal(cfg); err != nil {
        return nil, fmt.Errorf("解析配置失败: %w", err)
    }

    // 6. 验证配置
    if err := cfg.Validate(); err != nil {
        return nil, err
    }

    return cfg, nil
}

// Validate 验证配置
func (c *Config) Validate() error {
    if c.Server.Port < 1 || c.Server.Port > 65535 {
        return fmt.Errorf("无效的服务器端口: %d", c.Server.Port)
    }
    if c.Database.Host == "" {
        return fmt.Errorf("数据库主机不能为空")
    }
    if c.JWT.Secret == "" || c.JWT.Secret == "change-me-in-production" {
        return fmt.Errorf("JWT 密钥必须设置且不能使用默认值")
    }
    return nil
}
```

### 使用配置

```go
// main.go
package main

import (
    "log"

    "your-project/config"
)

func main() {
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("配置加载失败: %v", err)
    }

    log.Printf("服务器启动在端口: %d", cfg.Server.Port)
    log.Printf("数据库: %s@%s:%d/%s",
        cfg.Database.Username,
        cfg.Database.Host,
        cfg.Database.Port,
        cfg.Database.Database,
    )
}
```

## 可选配置文件

### 本地开发配置文件 (`config/config.yaml`)

```yaml
# 可选配置文件，仅用于本地开发
# 生产环境使用环境变量

# 服务器配置
server:
  port: 8080                      # 服务端口
  mode: debug                     # 运行模式: debug/release/test
  read_timeout: 60                # 读超时（秒）
  write_timeout: 60               # 写超时（秒）

# 数据库配置
database:
  type: mysql                     # 数据库类型: mysql 或 postgresql
  host: localhost
  port: 3306                      # MySQL: 3306, PostgreSQL: 5432
  username: iwan
  password: your_password
  database: iwan_station
  charset: utf8mb4                # 仅 MySQL 使用，PostgreSQL 可省略
  parse_time: true                # 解析时间为时间类型
  max_idle_conns: 10              # 最大空闲连接数
  max_open_conns: 100             # 最大打开连接数
  max_lifetime: 3600              # 连接最大生命周期（秒）

# Redis 配置
redis:
  host: localhost
  port: 6379
  password: ""
  db: 0                           # 使用的数据库编号
  pool_size: 10                   # 连接池大小
  min_idle_conn: 5                # 最小空闲连接数

# JWT 配置
jwt:
  secret: "your-secret-key-change-in-production"  # JWT 密钥（生产环境请修改）
  expire_time: 24                 # 过期时间（小时）
  issuer: "iwan-station"          # 签发者

# 日志配置
log:
  level: info                     # 日志级别: debug/info/warn/error
  filename: "logs/app.log"        # 日志文件路径
  max_size: 100                   # 单个日志文件最大大小（MB）
  max_backups: 3                  # 保留的旧日志文件数量
  max_age: 30                     # 日志文件保留天数
  compress: true                  # 是否压缩旧日志

# Casbin 配置
casbin:
  model_path: "./config/rbac_model.conf"  # RBAC 模型文件路径

# 文件上传配置
upload:
  max_size: 10                    # 最大文件大小（MB）
  allow_exts:                     # 允许的文件扩展名
    - .jpg
    - .jpeg
    - .png
    - .gif
    - .pdf
  save_path: "./uploads"          # 文件保存路径
```

> **注意**：配置文件是可选的。生产环境建议完全使用环境变量，不依赖配置文件。

## 环境变量覆盖

### 环境变量命名规则

配置项 `server.port` 对应环境变量 `SERVER_PORT`（用下划线替换点号）。

### 使用环境变量

```bash
# 开发环境：直接在命令行指定
SERVER_PORT=9000 go run cmd/server/main.go

# 生产环境：导出环境变量
export SERVER_PORT=8080
export DATABASE_HOST=prod-db.example.com
export DATABASE_PASSWORD=secure-password
export JWT_SECRET=production-jwt-secret-key-min-32-chars

# Docker
docker run -e SERVER_PORT=8080 -e DATABASE_HOST=prod-db ...
```

### 完整环境变量列表

```bash
# 服务器配置
SERVER_PORT=8080
SERVER_MODE=release
SERVER_READ_TIMEOUT=60
SERVER_WRITE_TIMEOUT=60

# 数据库配置
DATABASE_TYPE=mysql
DATABASE_HOST=prod-db.example.com
DATABASE_PORT=3306
DATABASE_USERNAME=iwan
DATABASE_PASSWORD=secure-password
DATABASE_DATABASE=iwan_station
DATABASE_CHARSET=utf8mb4

# Redis 配置
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT 配置
JWT_SECRET=your-production-secret-key-min-32-chars
JWT_EXPIRE_TIME=24

# 日志配置
LOG_LEVEL=info
LOG_FILENAME=logs/app.log
```

## Kubernetes 配置

### ConfigMap（普通配置）

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: iwan-station-config
data:
  SERVER_PORT: "8080"
  SERVER_MODE: "release"
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  DATABASE_PORT: "5432"
  DATABASE_TYPE: "postgresql"
  REDIS_HOST: "redis.default.svc.cluster.local"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
```

### Secret（敏感配置）

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: iwan-station-secret
type: Opaque
stringData:  # stringData 自动处理 base64 编码
  DATABASE_PASSWORD: "your-secure-password"
  JWT_SECRET: "your-jwt-secret-min-32-characters-long"
```

### Deployment（使用配置）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iwan-station
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iwan-station
  template:
    metadata:
      labels:
        app: iwan-station
    spec:
      containers:
      - name: app
        image: iwan-station:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: iwan-station-config
        - secretRef:
            name: iwan-station-secret
```

## Docker Compose 配置

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: iwan-station:latest
    ports:
      - "8080:8080"
    environment:
      # 服务器配置
      SERVER_PORT: 8080
      SERVER_MODE: release

      # 数据库配置
      DATABASE_HOST: db
      DATABASE_PORT: 3306
      DATABASE_USERNAME: iwan
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      DATABASE_DATABASE: iwan_station

      # Redis 配置
      REDIS_HOST: redis
      REDIS_PORT: 6379

      # JWT 配置
      JWT_SECRET: ${JWT_SECRET}

      # 日志配置
      LOG_LEVEL: info
    depends_on:
      - db
      - redis

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: iwan_station
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

## 配置最佳实践

### 1. 敏感信息处理

**不要提交敏感信息到版本控制：**

```bash
# .gitignore
config/config.yaml
config/secrets.yaml
.env
.env.local
```

**使用默认值提示必填项：**

```go
func DefaultConfig() *Config {
    return &Config{
        JWT: JWTConfig{
            Secret: "change-me-in-production", // 明显占位符
        },
    }
}

func (c *Config) Validate() error {
    if c.JWT.Secret == "change-me-in-production" {
        return fmt.Errorf("JWT_SECRET 环境变量必须设置")
    }
    return nil
}
```

### 2. 配置验证

**启动时验证：**

```go
func main() {
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("配置加载失败: %v", err)
    }

    if err := cfg.Validate(); err != nil {
        log.Fatalf("配置验证失败: %v", err)
    }

    // 应用启动...
}
```

**健康检查配置：**

```go
func (c *Config) CheckRequired() []string {
    var missing []string

    if c.Database.Host == "" {
        missing = append(missing, "DATABASE_HOST")
    }
    if c.Database.Password == "" {
        missing = append(missing, "DATABASE_PASSWORD")
    }
    if c.JWT.Secret == "" || c.JWT.Secret == "change-me-in-production" {
        missing = append(missing, "JWT_SECRET")
    }

    return missing
}
```

### 3. 环境区分

```bash
# 开发环境 - 使用配置文件
# config/config.yaml 存在，直接启动
go run cmd/server/main.go

# 生产环境 - 使用环境变量
export SERVER_MODE=release
export DATABASE_HOST=prod-db.example.com
./server
```

### 4. 配置文档化

**添加示例配置（可提交）：**

```go
// config/example.go
// 这个文件仅作为文档，可以安全提交
package config

// ExampleConfig 返回示例配置（仅文档用途）
func ExampleConfig() *Config {
    return &Config{
        Server: ServerConfig{
            Port: 8080,
            Mode: "debug",
        },
        Database: DatabaseConfig{
            Host:     "localhost",
            Port:     3306,
            Username: "your_username",
            Password: "your_password",
            Database: "iwan_station",
        },
        JWT: JWTConfig{
            Secret: "generate-a-strong-secret-key-min-32-chars",
        },
    }
}
```

## 与 Java Spring Boot 对比

### 配置方式对比

| 特性 | Spring Boot | Go + Viper |
|------|-------------|------------|
| 默认值语法 | `${VAR:default}` | 结构体初始化 |
| 配置文件 | application.yml | 可选 config.yaml |
| 类型检查 | 运行时 | 编译时 |
| IDE 支持 | 需要插件 | 原生支持 |

**Spring Boot (application.yml):**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/iwan_station
    username: iwan
    password: ${DB_PASSWORD:default}
```

**Go (结构体 + 环境变量):**

```go
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
}

// 默认值直接写在结构体初始化
cfg := &Config{
    Server: ServerConfig{Port: 8080},
}

// 环境变量 DATABASE_PASSWORD 自动覆盖
```

### 配置注入对比

**Java (@ConfigurationProperties):**

```java
@Component
@ConfigurationProperties(prefix = "app")
public class AppConfig {
    private String name;
    // getter/setter
}
```

**Go (直接使用):**

```go
cfg := LoadConfig()
fmt.Println(cfg.Server.Port)
```

## 测试配置

### 单元测试

```go
func TestLoadConfig(t *testing.T) {
    // 设置测试环境变量
    os.Setenv("SERVER_PORT", "9000")
    os.Setenv("DATABASE_HOST", "test-db")
    defer os.CleanEnv("SERVER_PORT", "DATABASE_HOST")

    cfg, err := LoadConfig()
    assert.NoError(t, err)
    assert.Equal(t, 9000, cfg.Server.Port)
    assert.Equal(t, "test-db", cfg.Database.Host)
}

func TestConfigValidation(t *testing.T) {
    tests := []struct {
        name    string
        config  *Config
        wantErr bool
    }{
        {
            name: "有效配置",
            config: &Config{
                Server: ServerConfig{Port: 8080},
                Database: DatabaseConfig{Host: "localhost"},
                JWT: JWTConfig{Secret: "valid-secret-key"},
            },
            wantErr: false,
        },
        {
            name: "无效端口",
            config: &Config{
                Server: ServerConfig{Port: -1},
            },
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.config.Validate()
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## 下一步

配置管理是应用的基础，接下来了解「[Gin 框架基础](/guide/framework/gin)」
