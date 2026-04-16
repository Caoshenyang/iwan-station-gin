---
title: "Zap 日志快速参考"
description: "Zap 是 Uber 开源的高性能结构化日志库。"
---

# Zap 日志快速参考

::: tip 快速查阅
这是一份 Zap 日志库速查表，涵盖日志级别、结构化字段、轮转配置和最佳实践。
:::

## 页面导航

[[toc]]

Zap 是 Uber 开源的高性能结构化日志库。

## 日志级别

```go
logger.Debug()  // 开发调试
logger.Info()   // 一般信息
logger.Warn()   // 警告信息
logger.Error()  // 错误信息
logger.Fatal()  // 致命错误（会退出）
```

## 基础使用

```go
// Logger（零内存分配，性能最好）
logger.Info("用户登录",
    zap.String("username", "iwan"),
    zap.Int("user_id", 123),
)

// SugaredLogger（更方便）
sugar.Infof("用户登录: %s, id: %d", "iwan", 123)
```

## 结构化字段

| 方法 | 说明 |
|------|------|
| `zap.String(k, v)` | 字符串 |
| `zap.Int(k, v)` | 整数 |
| `zap.Int64(k, v)` | 长整数 |
| `zap.Float64(k, v)` | 浮点数 |
| `zap.Bool(k, v)` | 布尔值 |
| `zap.Any(k, v)` | 任意类型 |
| `zap.Error(err)` | 错误对象 |

## 上下文日志

```go
// 创建带预设字段的 Logger
reqLogger := logger.With(
    zap.String("request_id", "abc123"),
    zap.String("user_id", "456"),
)

// 后续日志自动包含这些字段
reqLogger.Info("处理请求")
```

## 日志轮转

```go
fileWriter := &lumberjack.Logger{
    Filename:   "./logs/app.log",
    MaxSize:    100,      // 单文件最大 MB
    MaxBackups: 3,        // 保留旧文件数量
    MaxAge:     30,       // 保留天数
    Compress:   true,     // 压缩旧文件
}
```

## 中间件集成

```go
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()

        logger.Info("HTTP请求",
            zap.Int("status", c.Writer.Status()),
            zap.String("method", c.Request.Method),
            zap.String("path", c.Request.URL.Path),
            zap.Duration("latency", time.Since(start)),
        )
    }
}
```

## 最佳实践

```go
// ✅ 好的日志
logger.Info("用户登录成功",
    zap.String("username", "iwan"),
    zap.String("ip", "192.168.1.1"),
)

// ❌ 不好的日志
logger.Info("用户 iwan 从 192.168.1.1 登录成功") // 无法结构化查询
```

