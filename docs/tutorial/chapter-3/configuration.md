# 2.3 配置管理

## 使用 Viper 管理配置

Viper 是一个功能完整的 Go 应用配置解决方案。

### 为什么选择 Viper？

- **多种格式支持**：JSON、TOML、YAML、HCL
- **环境变量**：支持通过环境变量覆盖配置
- **实时重载**：监听配置文件变化
- **默认值**：设置合理的默认值
- **命令行标志**：通过命令行参数覆盖配置

## 配置文件结构

### 主配置文件 (`config/config.yaml`)

```yaml
# 服务器配置
server:
  port: 8080              # 端口
  mode: debug             # 运行模式：debug/release/test
  read_timeout: 60        # 读超时（秒）
  write_timeout: 60       # 写超时（秒）

# 数据库配置
database:
  type: mysql             # 数据库类型: mysql 或 postgresql
  host: localhost
  port: 3306              # MySQL: 3306, PostgreSQL: 5432
  username: iwan
  password: your_password
  database: iwan_station
  charset: utf8mb4        # 仅 MySQL 使用，PostgreSQL 可省略
  parse_time: true
  max_idle_conns: 10      # 最大空闲连接数
  max_open_conns: 100     # 最大打开连接数
  max_lifetime: 3600      # 连接最大生命周期（秒）

# Redis 配置
redis:
  host: localhost
  port: 6379
  password: ""
  db: 0
  pool_size: 10          # 连接池大小
  min_idle_conn: 5       # 最小空闲连接数

# JWT 配置
jwt:
  secret: "your-secret-key-change-in-production"
  expire_time: 24       # 过期时间（小时）
  issuer: "iwan-station"

# 日志配置
log:
  level: info             # 日志级别：debug/info/warn/error
  filename: "logs/app.log"
  max_size: 100          # 单个日志文件最大大小（MB）
  max_backups: 3         # 保留的旧日志文件数量
  max_age: 30            # 日志文件保留天数
  compress: true         # 是否压缩旧日志

# Casbin 配置
casbin:
  model_path: "./config/rbac_model.conf"

# 文件上传配置
upload:
  max_size: 10           # 最大文件大小（MB）
  allow_exts:
    - .jpg
    - .jpeg
    - .png
    - .gif
    - .pdf
  save_path: "./uploads"
```

## 配置结构体

### Go 结构体定义

```go
// Config 应用配置
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    JWT      JWTConfig
    Log      LogConfig
    Casbin   CasbinConfig
    Upload   UploadConfig
}

// ServerConfig 服务器配置
type ServerConfig struct {
    Port         int    `mapstructure:"port"`
    Mode         string `mapstructure:"mode"`
    ReadTimeout  int    `mapstructure:"read_timeout"`
    WriteTimeout int    `mapstructure:"write_timeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Type         string `mapstructure:"type"`         // 数据库类型: mysql 或 postgresql
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	Username     string `mapstructure:"username"`
	Password     string `mapstructure:"password"`
	Database     string `mapstructure:"database"`
	Charset      string `mapstructure:"charset"`      // 仅 MySQL 使用
	ParseTime    bool   `mapstructure:"parse_time"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxLifetime  int    `mapstructure:"max_lifetime"`
}
```

## 加载配置

### 基础加载

```go
import (
    "fmt"
    "strings"

    "github.com/spf13/viper"
)

func LoadConfig() (*Config, error) {
    v := viper.New()

    // 设置配置文件
    v.SetConfigName("config")
    v.SetConfigType("yaml")
    v.AddConfigPath(".")
    v.AddConfigPath("./config")

    // 读取环境变量
    v.AutomaticEnv()
    v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

    // 读取配置文件
    if err := v.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("读取配置失败: %w", err)
    }

    // 解析配置
    var cfg Config
    if err := v.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("解析配置失败: %w", err)
    }

    // 设置默认值
    setDefaults(&cfg)

    return &cfg, nil
}
```

### 环境变量覆盖

```bash
# 通过环境变量覆盖配置
export SERVER_PORT=9000
export DATABASE_HOST=production-db.example.com
export JWT_SECRET=production-secret-key

# 或者在运行时指定
SERVER_PORT=9000 go run cmd/server/main.go
```

```go
// 配置映射到环境变量
v.AutomaticEnv()
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

// 现在可以使用 SERVER_PORT 覆盖 server.port
```

## 配置验证

### 配置验证函数

```go
func (c *Config) Validate() error {
    // 验证服务器端口
    if c.Server.Port < 1 || c.Server.Port > 65535 {
        return errors.New("服务器端口无效")
    }

    // 验证数据库配置
    if c.Database.Host == "" {
        return errors.New("数据库主机不能为空")
    }

    // 验证 JWT 密钥
    if c.JWT.Secret == "" || c.JWT.Secret == "your-secret-key" {
        return errors.New("JWT 密钥必须设置")
    }

    return nil
}
```

## 配置最佳实践

### 1. 敏感信息处理

**不要提交敏感信息到版本控制：**

```bash
# .gitignore
config/config.yaml
.env
```

**使用示例配置文件：**

```yaml
# config/config.yaml.example
server:
  port: 8080
  mode: debug

database:
  type: mysql            # mysql 或 postgresql
  host: localhost
  port: 3306             # MySQL: 3306, PostgreSQL: 5432
  username: your_username
  password: your_password
  database: iwan_station

jwt:
  secret: "generate-a-strong-secret-key"
```

### 2. 分环境配置

```bash
# 开发环境
config/config.dev.yaml

# 生产环境
config/config.prod.yaml
```

```go
// 根据环境加载不同配置
func LoadConfig() (*Config, error) {
    env := os.Getenv("APP_ENV")
    configFile := fmt.Sprintf("config.%s", env)
    v.SetConfigFile(configFile)
    // ...
}
```

### 3. 热重加载（可选）

```go
// 监听配置文件变化
v.WatchConfig()
v.OnConfigChange(func(e fsnotify.Event) {
    fmt.Println("配置文件已更改:", e.Name)
    // 重新加载配置
    cfg, err := LoadConfig()
    // 应用新配置
})
```

## 与 Java Spring Boot 对比

### 配置方式对比

**Spring Boot (application.yml):**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/iwan_station
    username: iwan
    password: ${DB_PASSWORD:default}

  jpa:
    hibernate:
      ddl-auto: update
```

**Go + Viper (config.yaml):**

```go
// 需要显式定义结构体
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
}

// 手动映射 DSN
func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?...",
        c.Username, c.Password, c.Host, c.Port, c.Database)
}
```

### 配置注入对比

**Java:**

```java
@Component
@ConfigurationProperties(prefix = "app")
public class AppConfig {
    private String name;
    // getter/setter
}
```

**Go:**

```go
type AppConfig struct {
    Name string `mapstructure:"name"`
}

// 直接使用配置
cfg := LoadConfig()
fmt.Println(cfg.App.Name)
```

## 配置技巧

### 1. 配置分组

```go
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
}

// 访问配置
cfg.Database.Host
cfg.Redis.Port
```

### 2. 必填配置验证

```go
func (c *Config) ValidateRequired() error {
    required := []struct {
        name  string
        value interface{}
    }{
        {"数据库主机", c.Database.Host},
        {"JWT 密钥", c.JWT.Secret},
    }

    for _, req := range required {
        if v := reflect.ValueOf(req.value); v.IsZero() {
            return fmt.Errorf("%s 不能为空", req.name)
        }
    }
    return nil
}
```

### 3. 配置默认值

```go
func setDefaults(cfg *Config) {
    // 服务器默认值
    if cfg.Server.Port == 0 {
        cfg.Server.Port = 8080
    }
    if cfg.Server.Mode == "" {
        cfg.Server.Mode = "debug"
    }

    // JWT 默认值
    if cfg.JWT.ExpireTime == 0 {
        cfg.JWT.ExpireTime = 24
    }
}
```

## 测试配置

### 单元测试

```go
func TestLoadConfig(t *testing.T) {
    // 设置测试环境变量
    os.Setenv("SERVER_PORT", "9000")
    defer os.Unsetenv("SERVER_PORT")

    // 加载配置
    cfg, err := LoadConfig()
    assert.NoError(t, err)
    assert.Equal(t, 9000, cfg.Server.Port)
}
```

## 下一步

配置管理是应用的基础，接下来了解「[Gin 框架基础](/guide/gin-basics)」
