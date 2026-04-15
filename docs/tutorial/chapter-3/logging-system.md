# Zap 日志系统

## 📚 官方文档

- **Zap GitHub**: https://github.com/uber-go/zap
- **Zap Godoc**: https://pkg.go.dev/go.uber.org/zap
- **Lumberjack GitHub**: https://github.com/natefinch/lumberjack

---

## 一、Zap 简介

### 1.1 什么是 Zap？

Zap 是 Uber 开源的 Go 语言结构化日志库，以高性能和类型安全著称。

**核心特性**：
- 极高的性能（比标准库 log 快）
- 结构化日志（JSON 格式）
- 日志分级
- 钩子（Hook）支持
- 日志轮转（通过 lumberjack）
- 上下文日志

### 1.2 Go vs Java：日志库对比

| 特性 | Go (Zap) | Java (Logback/SLF4J) |
|------|----------|---------------------|
| 性能 | 极快，零内存分配 | 较快 |
| 结构化 | 原生支持 JSON | 需要配置 |
| 字段类型 | 强类型 | 字符串格式化 |
| 日志分级 | Debug/Info/Warn/Error/Fatal | TRACE/DEBUG/INFO/WARN/ERROR |
| 日志轮转 | lumberjack | RollingFileAppender |
| 上下文 | With() 方法 | MDC (Mapped Diagnostic Context) |

---

## 二、安装与配置

### 2.1 安装依赖

```bash
# 安装 Zap
go get -u go.uber.org/zap
go get -u go.uber.org/zap/zapcore

# 安装日志轮转库
go get -u gopkg.in/natefinch/lumberjack.v2
```

### 2.2 基础配置

```go
package logger

import (
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

var (
    log  *zap.Logger
    sugar *zap.SugaredLogger
)

// 日志级别枚举
const (
    DebugLevel = "debug"
    InfoLevel  = "info"
    WarnLevel  = "warn"
    ErrorLevel = "error"
)

// InitLogger 初始化日志系统
func InitLogger(level string, filename string) error {
    // 解析日志级别
    var zapLevel zapcore.Level
    switch level {
    case DebugLevel:
        zapLevel = zapcore.DebugLevel
    case InfoLevel:
        zapLevel = zapcore.InfoLevel
    case WarnLevel:
        zapLevel = zapcore.WarnLevel
    case ErrorLevel:
        zapLevel = zapcore.ErrorLevel
    default:
        zapLevel = zapcore.InfoLevel
    }

    // 编码器配置
    encoderConfig := zapcore.EncoderConfig{
        TimeKey:        "time",
        LevelKey:       "level",
        NameKey:        "logger",
        CallerKey:      "caller",
        MessageKey:     "msg",
        StacktraceKey:  "stacktrace",
        LineEnding:     zapcore.DefaultLineEnding,
        EncodeLevel:    zapcore.LowercaseLevelEncoder,  // 小写级别名
        EncodeTime:     zapcore.ISO8601TimeEncoder,     // ISO8601 时间格式
        EncodeDuration: zapcore.SecondsDurationEncoder,
        EncodeCaller:   zapcore.ShortCallerEncoder,      // 短路径调用者
    }

    // 文件输出
    fileWriter := zapcore.AddSync(&lumberjack.Logger{
        Filename:   filename,      // 日志文件路径
        MaxSize:    100,           // 最大 MB
        MaxBackups: 3,             // 保留旧文件最大数量
        MaxAge:     30,            // 保留天数
        Compress:   true,          // 是否压缩
    })

    // 控制台输出
    consoleWriter := zapcore.AddSync(os.Stdout)

    // 创建 Core
    fileCore := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderConfig), // 文件用 JSON
        fileWriter,
        zapLevel,
    )

    consoleCore := zapcore.NewCore(
        zapcore.NewConsoleEncoder(encoderConfig), // 控制台用文本
        consoleWriter,
        zapLevel,
    )

    // 合并输出
    core := zapcore.NewTee(fileCore, consoleCore)

    // 创建 Logger
    log = zap.New(core,
        zap.AddCaller(),                    // 添加调用者信息
        zap.AddCallerSkip(1),               // 跳过一层调用栈
        zap.AddStacktrace(zapcore.ErrorLevel), // Error 级别记录堆栈
    )

    // 创建 SugaredLogger（更方便的 API）
    sugar = log.Sugar()

    return nil
}

// GetLogger 获取 Logger
func GetLogger() *zap.Logger {
    return log
}

// GetSugarLogger 获取 SugaredLogger
func GetSugarLogger() *zap.SugaredLogger {
    return sugar
}
```

### 2.3 日志配置文件

```yaml
# config/config.yaml
log:
  level: debug          # 日志级别：debug/info/warn/error
  filename: ./logs/app.log  # 日志文件路径
  max_size: 100         # 单文件最大 MB
  max_backups: 3        # 保留旧文件数量
  max_age: 30           # 保留天数
  compress: true        # 是否压缩
```

---

## 三、日志级别

### 3.1 级别说明

```go
// 按优先级从低到高
const (
    DebugLevel = zapcore.DebugLevel  // 开发调试信息
    InfoLevel  = zapcore.InfoLevel   // 一般信息
    WarnLevel  = zapcore.WarnLevel   // 警告信息
    ErrorLevel = zapcore.ErrorLevel  // 错误信息
    FatalLevel = zapcore.FatalLevel  // 致命错误（会退出程序）
)
```

**使用场景**：

| 级别 | 使用场景 | 示例 |
|------|----------|------|
| Debug | 开发调试 | "用户ID: 123, 开始查询数据库" |
| Info | 关键流程 | "用户登录成功: username=iwan" |
| Warn | 异常但不影响运行 | "Redis 连接超时，使用备用策略" |
| Error | 错误需要处理 | "数据库连接失败: connection refused" |
| Fatal | 程序无法继续运行 | "配置文件不存在，退出程序" |

### 3.2 记录不同级别日志

```go
import "go.uber.org/zap"

// 方式1：使用 Logger（性能更好）
func processUser(userID int64) {
    logger := GetLogger()
    logger.Debug("开始处理用户", zap.Int64("user_id", userID))
    logger.Info("用户处理完成", zap.Int64("user_id", userID))
    logger.Warn("用户数据不完整", zap.Int64("user_id", userID))
    logger.Error("用户处理失败", zap.Int64("user_id", userID),
        zap.Error(err))
}

// 方式2：使用 SugaredLogger（更方便）
func processUserSugar(userID int64) {
    logger := GetSugarLogger()
    logger.Debugf("开始处理用户: %d", userID)
    logger.Infof("用户处理完成: %d", userID)
    logger.Warnf("用户数据不完整: %d", userID)
    logger.Errorf("用户处理失败: %d, %v", userID, err)
}
```

**性能对比**：
- `Logger`：零内存分配，性能最好
- `SugaredLogger`：使用 fmt.Sprintf 风格，稍慢但更方便

**Java 对比**：
```java
// SLF4J + Logback
private static final Logger logger = LoggerFactory.getLogger(MyClass.class);

public void processUser(long userId) {
    logger.debug("开始处理用户: {}", userId);
    logger.info("用户处理完成: {}", userId);
    logger.warn("用户数据不完整: {}", userId);
    logger.error("用户处理失败", exception);
}
```

---

## 四、结构化日志

### 4.1 添加字段

```go
// 使用 With 创建带预设字段的 Logger
func handleRequest(req *http.Request) {
    // 创建带上下文的 Logger
    reqLogger := GetLogger().With(
        zap.String("request_id", getRequestID(req)),
        zap.String("path", req.URL.Path),
        zap.String("method", req.Method),
    )

    // 后续日志自动包含这些字段
    reqLogger.Info("处理请求")
    // 输出：{"request_id":"abc","path":"/api/users","method":"GET","time":"...","level":"info","msg":"处理请求"}
}
```

### 4.2 强类型字段

```go
import "go.uber.org/zap"

// 支持多种类型字段
logger.Info("用户操作",
    zap.String("username", "iwan"),           // 字符串
    zap.Int("user_id", 123),                  // 整数
    zap.Int64("timestamp", time.Now().Unix()), // 长整数
    zap.Float64("price", 99.99),              // 浮点数
    zap.Bool("success", true),                // 布尔值
    zap.Duration("elapsed", 123*time.Millisecond), // 时长
    zap.Time("created_at", time.Now()),       // 时间
    zap.Any("data", map[string]interface{}{   // 任意类型
        "key": "value",
    }),
)
```

### 4.3 嵌套字段

```go
// 使用 Namespace 创建命名空间
logger := GetLogger().With(
    zap.Namespace("http"),
    zap.String("method", "GET"),
    zap.String("path", "/api/users"),
    zap.Int("status", 200),
)

logger.Info("请求完成")
// 输出：{"http":{"method":"GET","path":"/api/users","status":200},"time":"...","level":"info","msg":"请求完成"}
```

### 4.4 数组字段

```go
// 使用 zap.Array 记录数组
tagCodes := []string{"go", "gin", "web"}
logger.Info("文章标签",
    zap.Array("tags", zapcore.ArrayMarshalerFunc(func(ae zapcore.ArrayEncoder) error {
        for _, code := range tagCodes {
            ae.AppendString(code)
        }
        return nil
    })),
)

// 使用 Strings 快捷方法
logger.Info("文章标签",
    zap.Strings("tags", tagCodes),
)
```

---

## 五、日志轮转

### 5.1 Lumberjack 配置

```go
import "gopkg.in/natefinch/lumberjack.v2"

// 日志轮转配置
fileWriter := &lumberjack.Logger{
    Filename:   "./logs/app.log",  // 日志文件
    MaxSize:    100,                // 单文件最大 MB
    MaxBackups: 3,                  // 保留旧文件数量
    MaxAge:     30,                 // 保留天数
    Compress:   true,               // 压缩旧文件
    LocalTime:  true,               // 使用本地时间
}

// 文件轮转效果：
// app.log           -> 当前日志
// app-2024-01-01.log.gz  -> 压缩的旧日志
// app-2024-01-02.log.gz
// app-2024-01-03.log.gz
```

**配置说明**：

| 参数 | 说明 | 建议值 |
|------|------|--------|
| MaxSize | 单文件最大 MB | 100-500 |
| MaxBackups | 保留旧文件数量 | 3-10 |
| MaxAge | 保留天数 | 7-30 |
| Compress | 是否压缩 | true（节省空间） |

### 5.2 按级别分类日志

```go
// 不同级别写入不同文件
func InitLoggerWithSeparation(cfg LogConfig) error {
    // 错误日志
    errorCore := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderConfig),
        zapcore.AddSync(&lumberjack.Logger{
            Filename: "./logs/error.log",
            MaxSize:  cfg.MaxSize,
            MaxBackups: cfg.MaxBackups,
            MaxAge:     cfg.MaxAge,
            Compress:   cfg.Compress,
        }),
        zapcore.ErrorLevel, // 只记录 Error 及以上
    )

    // 全部日志
    allCore := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderConfig),
        zapcore.AddSync(&lumberjack.Logger{
            Filename: "./logs/app.log",
            MaxSize:  cfg.MaxSize,
            MaxBackups: cfg.MaxBackups,
            MaxAge:     cfg.MaxAge,
            Compress:   cfg.Compress,
        }),
        zapcore.DebugLevel,
    )

    core := zapcore.NewTee(errorCore, allCore)
    log = zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))

    return nil
}
```

**Java 对比**：
```xml
<!-- Logback 配置 -->
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>logs/app.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>logs/app-%d{yyyy-MM-dd}.log.gz</fileNamePattern>
        <maxHistory>30</maxHistory>
    </rollingPolicy>
</appender>
```

---

## 六、上下文日志

### 6.1 请求追踪

```go
// 中间件：为每个请求添加 request_id
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 生成或获取 request_id
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }

        // 创建带 request_id 的 Logger
        reqLogger := logger.With(zap.String("request_id", requestID))
        c.Set("logger", reqLogger)

        // 记录请求开始
        reqLogger.Info("请求开始",
            zap.String("path", c.Request.URL.Path),
            zap.String("method", c.Request.Method),
        )

        // 记录响应
        reqLogger.Info("请求完成",
            zap.Int("status", c.Writer.Status()),
            zap.Duration("latency", time.Since(start)),
        )
    }
}

// 在 Handler 中使用
func GetUserHandler(c *gin.Context) {
    reqLogger := c.MustGet("logger").(*zap.Logger)

    user, err := userService.GetByID(userID)
    if err != nil {
        reqLogger.Error("获取用户失败",
            zap.Int64("user_id", userID),
            zap.Error(err),
        )
        c.JSON(500, gin.H{"error": "获取用户失败"})
        return
    }

    reqLogger.Info("获取用户成功",
        zap.Int64("user_id", userID),
        zap.String("username", user.Username),
    )
}
```

### 6.2 用户操作日志

```go
// 记录用户操作
func LogUserOperation(db *gorm.DB, userID int64, module, action string, err error) {
    log := &OperationLog{
        UserID:    userID,
        Username:  getUsernameByID(userID),
        Module:    module,    // 模块：user/article/category
        Action:    action,    // 操作：create/update/delete
        Method:    ctx.Request.Method,
        Path:      ctx.Request.URL.Path,
        IP:        getClientIP(ctx),
        Status:    1,
        Error:     "",
    }

    if err != nil {
        log.Status = 0
        log.Error = err.Error()
    }

    db.Create(log)
}

// 使用示例
func DeleteArticle(c *gin.Context) {
    if err := articleService.Delete(articleID); err != nil {
        logger.Error("删除文章失败", zap.Error(err))
        LogUserOperation(db, userID, "article", "delete", err)
        c.JSON(500, gin.H{"error": "删除失败"})
        return
    }

    LogUserOperation(db, userID, "article", "delete", nil)
    c.JSON(200, gin.H{"message": "删除成功"})
}
```

---

## 七、中间件集成

### 7.1 Gin 日志中间件

```go
package middleware

import (
    "time"
    "iwan-station-gin/internal/pkg/logger"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Logger 返回日志中间件
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        // 处理请求
        c.Next()

        // 计算耗时
        latency := time.Since(start)
        status := c.Writer.Status()

        // 记录日志
        fields := []zap.Field{
            zap.Int("status", status),
            zap.String("method", c.Request.Method),
            zap.String("path", path),
            zap.String("query", query),
            zap.String("ip", c.ClientIP()),
            zap.String("user_agent", c.Request.UserAgent()),
            zap.Duration("latency", latency),
        }

        // 添加 request_id（如果有）
        if requestID := c.GetString("request_id"); requestID != "" {
            fields = append(fields, zap.String("request_id", requestID))
        }

        // 添加 user_id（如果有）
        if userID := c.GetInt64("user_id"); userID > 0 {
            fields = append(fields, zap.Int64("user_id", userID))
        }

        // 根据状态码选择日志级别
        if status >= 500 {
            logger.Error("HTTP请求", fields...)
        } else if status >= 400 {
            logger.Warn("HTTP请求", fields...)
        } else {
            logger.Info("HTTP请求", fields...)
        }
    }
}
```

### 7.2 恢复中间件（Panic）

```go
// Recovery 自定义恢复中间件
func Recovery() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // 记录 panic 堆栈
                logger.Error("Panic recovered",
                    zap.Any("error", err),
                    zap.Stack("stack"),
                )
                c.JSON(500, gin.H{"error": "服务器内部错误"})
                c.Abort()
            }
        }()
        c.Next()
    }
}
```

---

## 八、性能优化

### 8.1 异步写入

```go
// 使用缓冲区提高性能
func InitAsyncLogger(cfg LogConfig) error {
    // 创建带缓冲的 Writer
    fileWriter := &lumberjack.Logger{
        Filename:   cfg.Filename,
        MaxSize:    cfg.MaxSize,
        MaxBackups: cfg.MaxBackups,
        MaxAge:     cfg.MaxAge,
        Compress:   cfg.Compress,
    }

    // 使用 Buffer
    bufferedWriter := zapcore.AddSync(fileWriter)

    core := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderConfig),
        bufferedWriter,
        zapcore.InfoLevel,
    )

    log = zap.New(core, zap.AddCaller())
    return nil
}
```

### 8.2 采样日志（避免日志爆炸）

```go
import "go.uber.org/zap/zapcore"

// 只记录部分 Debug 日志
core := zapcore.NewSampler(
    zapcore.NewCore(encoder, writeSyncer, zapcore.DebugLevel),
    time.Second,  // 时间窗口
    100,          // 最初记录 100 条
    10,           // 之后每秒最多记录 10 条
)
```

---

## 九、最佳实践

### 9.1 日志内容规范

```go
// ✅ 好的日志
logger.Info("用户登录成功",
    zap.String("username", "iwan"),
    zap.String("ip", "192.168.1.1"),
    zap.Int("user_id", 123),
)

// ❌ 不好的日志
logger.Info("用户 iwan 从 192.168.1.1 登录成功，ID 是 123") // 无法结构化查询
```

### 9.2 日志级别使用原则

```go
// Debug：开发调试
logger.Debug("SQL查询", zap.String("sql", "SELECT * FROM users"))

// Info：关键业务节点
logger.Info("订单创建", zap.Int64("order_id", orderID))

// Warn：可恢复的异常
logger.Warn("缓存未命中", zap.String("key", cacheKey))

// Error：需要关注的错误
logger.Error("支付失败", zap.Error(err), zap.Int64("order_id", orderID))

// Fatal：程序无法继续
logger.Fatal("配置文件缺失", zap.String("path", configPath))
```

### 9.3 敏感信息处理

```go
import "crypto/sha256"

// 不要记录敏感信息
logger.Info("用户登录",
    zap.String("username", username),
    // zap.String("password", password), // ❌ 绝不记录密码
)

// 脱敏处理
func maskEmail(email string) string {
    parts := strings.Split(email, "@")
    if len(parts) != 2 {
        return "***"
    }
    return parts[0][:2] + "***@" + parts[1]
}

logger.Info("用户注册",
    zap.String("email", maskEmail(email)),
)
```

### 9.4 日志查询

```bash
# 使用 jq 查询 JSON 日志
cat app.log | jq 'select(.level=="error")'

# 统计错误数量
cat app.log | jq 'select(.level=="error")' | wc -l

# 查找特定 request_id 的日志
cat app.log | jq 'select(.request_id=="abc123")'

# 查看最近的错误
tail -f app.log | jq 'select(.level=="error")'
```

---

## 十、练习任务

1. **基础任务**：配置日志系统，实现文件日志和控制台日志同时输出
2. **进阶任务**：实现按级别分类日志（error.log 和 app.log）
3. **高级任务**：结合 Gin 中间件，记录每个请求的详细信息（请求/响应/耗时）

---

## 课后阅读

- [Zap 官方文档 - Performance](https://github.com/uber-go/zap#performance)
- [Zap 官方文档 - Field Usage](https://github.com/uber-go/zap#field-logging)
- [Lumberjack 官方文档](https://github.com/natefinch/lumberjack)
