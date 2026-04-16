---
title: "系统监控"
description: "系统监控可以提前发现问题，避免故障："
---

# 系统监控

## 学习目标

完成本章后，你将：
- ✅ 实现系统健康检查
- ✅ 掌握性能指标收集
- ✅ 学会资源使用监控
- ✅ 了解告警通知机制

## 为什么需要系统监控？

系统监控可以提前发现问题，避免故障：

| 监控项 | 作用 | 告警阈值 |
|--------|------|----------|
| CPU 使用率 | 发现性能瓶颈 | > 80% |
| 内存使用 | 防止 OOM | > 85% |
| 磁盘空间 | 防止磁盘满 | > 90% |
| QPS | 了解负载情况 | 异常波动 |
| 响应时间 | 用户体验指标 | > 1s |
| 错误率 | 服务质量 | > 1% |

## 健康检查

### 基础健康检查

```go
// internal/api/v1/health.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// HealthHandler 健康检查处理器
type HealthHandler struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewHealthHandler 创建健康检查处理器
func NewHealthHandler(db *gorm.DB, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		logger: logger,
	}
}

// Check 健康检查
// @Summary 健康检查
// @Tags 监控
// @Accept json
// @Produce json
// @Success 200 {object} response.Response
// @Router /health [get]
func (h *HealthHandler) Check(c *gin.Context) {
	health := &HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().Unix(),
	}

	// 检查数据库
	if err := h.checkDatabase(); err != nil {
		health.Status = "error"
		health.Services.Database = "error: " + err.Error()
		h.logger.Error("Database health check failed", zap.Error(err))
	} else {
		health.Services.Database = "ok"
	}

	// 检查 Redis（如果使用）
	// ...

	// 返回状态码
	if health.Status == "ok" {
		response.Success(c, health)
	} else {
		c.JSON(503, health) // Service Unavailable
	}
}

// checkDatabase 检查数据库连接
func (h *HealthHandler) checkDatabase() error {
	sqlDB, err := h.db.DB()
	if err != nil {
		return err
	}

	// Ping 数据库
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return sqlDB.PingContext(ctx)
}

// HealthResponse 健康检查响应
type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp int64             `json:"timestamp"`
	Services  ServiceStatus     `json:"services"`
}

// ServiceStatus 服务状态
type ServiceStatus struct {
	Database string `json:"database"`
	Redis    string `json:"redis,omitempty"`
}
```

### 详细的健康检查

```go
// DetailedHealthCheck 详细健康检查
func (h *HealthHandler) DetailedHealthCheck(c *gin.Context) {
	health := &DetailedHealth{
		Status:    "ok",
		Timestamp: time.Now().Unix(),
		System:    h.getSystemInfo(),
		Services:  make(map[string]ServiceHealth),
	}

	// 数据库检查
	dbHealth := h.checkDatabaseDetailed()
	health.Services["database"] = dbHealth
	if !dbHealth.Healthy {
		health.Status = "degraded"
	}

	// 返回结果
	if health.Status == "ok" {
		response.Success(c, health)
	} else {
		c.JSON(503, health)
	}
}

// ServiceHealth 服务健康状态
type ServiceHealth struct {
	Healthy   bool   `json:"healthy"`
	Latency   string `json:"latency"`
	Message   string `json:"message,omitempty"`
	Timestamp int64  `json:"timestamp"`
}

// checkDatabaseDetailed 详细检查数据库
func (h *HealthHandler) checkDatabaseDetailed() ServiceHealth {
	health := ServiceHealth{
		Timestamp: time.Now().Unix(),
	}

	start := time.Now()

	// 1. 连接检查
	sqlDB, err := h.db.DB()
	if err != nil {
		health.Healthy = false
		health.Message = "Database connection error: " + err.Error()
		return health
	}

	// 2. Ping 检查
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		health.Healthy = false
		health.Message = "Database ping failed: " + err.Error()
		return health
	}

	// 3. 简单查询检查
	var count int64
	if err := h.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error; err != nil {
		health.Healthy = false
		health.Message = "Database query failed: " + err.Error()
		return health
	}

	// 4. 连接池检查
	stats := sqlDB.Stats()
	if stats.OpenConnections >= stats.MaxOpenConnections {
		health.Healthy = false
		health.Message = "Database connection pool exhausted"
		return health
	}

	health.Healthy = true
	health.Latency = time.Since(start).String()
	health.Message = fmt.Sprintf("OK (connections: %d/%d, idle: %d)",
		stats.OpenConnections, stats.MaxOpenConnections, stats.Idle)

	return health
}

// DetailedHealth 详细健康检查响应
type DetailedHealth struct {
	Status    int64                    `json:"status"`
	Timestamp int64                    `json:"timestamp"`
	System    SystemInfo               `json:"system"`
	Services  map[string]ServiceHealth `json:"services"`
}

// SystemInfo 系统信息
type SystemInfo struct {
	Hostname   string  `json:"hostname"`
	CPU        float64 `json:"cpu_percent"`
	Memory     MemoryInfo `json:"memory"`
	Disk       DiskInfo   `json:"disk"`
	Goroutines int      `json:"goroutines"`
}

// MemoryInfo 内存信息
type MemoryInfo struct {
	Used     uint64  `json:"used"`
	Total    uint64  `json:"total"`
	Percent  float64 `json:"percent"`
}

// DiskInfo 磁盘信息
type DiskInfo struct {
	Used     uint64  `json:"used"`
	Total    uint64  `json:"total"`
	Percent  float64 `json:"percent"`
}
```

## 性能指标收集

### Prometheus 集成

```go
// internal/pkg/metrics/prometheus.go
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP 请求总数
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	// HTTP 请求持续时间
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	// 数据库查询持续时间
	dbQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"query_type"},
	)

	// 当前 Goroutine 数量
	goroutines = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "goroutines_count",
			Help: "Current number of goroutines",
		},
	)

	// 内存使用
	memoryUsage = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "memory_usage_bytes",
			Help: "Current memory usage in bytes",
		},
	)
)

// RecordHTTPRequest 记录 HTTP 请求
func RecordHTTPRequest(method, path string, status int, duration float64) {
	httpRequestsTotal.WithLabelValues(method, path, string(status)).Inc()
	httpRequestDuration.WithLabelValues(method, path).Observe(duration)
}

// RecordDBQuery 记录数据库查询
func RecordDBQuery(queryType string, duration float64) {
	dbQueryDuration.WithLabelValues(queryType).Observe(duration)
}

// UpdateGoroutines 更新 Goroutine 数量
func UpdateGoroutines(count int) {
	goroutines.Set(float64(count))
}

// UpdateMemoryUsage 更新内存使用
func UpdateMemoryUsage(bytes uint64) {
	memoryUsage.Set(float64(bytes))
}
```

### 中间件集成

```go
// internal/middleware/metrics.go
package middleware

import (
	"iwan-station-gin/internal/pkg/metrics"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MetricsMiddleware 指标收集中间件
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()

		// 处理请求
		c.Next()

		// 记录指标
		duration := time.Since(start).Seconds()
		status := c.Writer.Status()
		method := c.Request.Method

		metrics.RecordHTTPRequest(method, path, status, duration)
	}
}
```

### 路由注册

```go
// internal/router/metrics.go
package router

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// RegisterMetrics 注册指标路由
func RegisterMetrics(r *gin.Engine) {
	// Prometheus 指标端点
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))
}
```

## 系统资源监控

### 资源收集器

```go
// internal/pkg/monitor/collector.go
package monitor

import (
	"iwan-station-gin/internal/pkg/metrics"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// Collector 资源收集器
type Collector struct {
	logger *zap.Logger
}

// NewCollector 创建收集器
func NewCollector(logger *zap.Logger) *Collector {
	return &Collector{logger: logger}
}

// Start 启动收集
func (c *Collector) Start() {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		c.collect()
	}
}

// collect 收集指标
func (c *Collector) collect() {
	// 1. CPU 使用率
	cpuPercent, _ := cpu.Percent(time.Second, false)
	if len(cpuPercent) > 0 {
		// 可以导出到 Prometheus
	}

	// 2. 内存使用
	memStat, _ := mem.VirtualMemory()
	metrics.UpdateMemoryUsage(memStat.Used)

	// 3. Goroutine 数量
	metrics.UpdateGoroutines(runtime.NumGoroutine())

	// 4. 磁盘使用
	diskStat, _ := disk.Usage("/")
	if diskStat.UsedPercent > 90 {
		c.logger.Warn("Disk usage high",
			zap.Float64("percent", diskStat.UsedPercent),
		)
	}

	// 5. 进程信息
	proc, _ := process.NewProcess(int32(os.Getpid()))
	if proc != nil {
		// 可以收集进程级别的指标
	}
}
```

## 告警通知

### 告警规则

```go
// internal/pkg/monitor/alert.go
package monitor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// AlertLevel 告警级别
type AlertLevel string

const (
	AlertLevelInfo     AlertLevel = "info"
	AlertLevelWarning  AlertLevel = "warning"
	AlertLevelCritical AlertLevel = "critical"
)

// Alert 告警
type Alert struct {
	Level     AlertLevel `json:"level"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	Timestamp time.Time  `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// Alerter 告警器
type Alerter struct {
	logger    *zap.Logger
	webhookURL string
}

// NewAlerter 创建告警器
func NewAlerter(logger *zap.Logger, webhookURL string) *Alerter {
	return &Alerter{
		logger:    logger,
		webhookURL: webhookURL,
	}
}

// SendAlert 发送告警
func (a *Alerter) SendAlert(alert *Alert) error {
	a.logger.Warn("Alert triggered",
		zap.String("level", string(alert.Level)),
		zap.String("title", alert.Title),
		zap.String("message", alert.Message),
	)

	// 发送到 Webhook（如钉钉、企业微信）
	if a.webhookURL != "" {
		return a.sendWebhook(alert)
	}

	return nil
}

// sendWebhook 发送 Webhook
func (a *Alerter) sendWebhook(alert *Alert) error {
	// 构建消息
	message := map[string]interface{}{
		"msgtype": "text",
		"text": map[string]string{
			"content": fmt.Sprintf("[%s] %s\n%s\n时间: %s",
				string(alert.Level),
				alert.Title,
				alert.Message,
				alert.Timestamp.Format("2006-01-02 15:04:05"),
			),
		},
	}

	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	// 发送请求
	resp, err := http.Post(a.webhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
```

### 告警规则检查

```go
// internal/pkg/monitor/rules.go
package monitor

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

// AlertRule 告警规则
type AlertRule struct {
	Name      string
	Check     func() (bool, string)
	Level     AlertLevel
	Interval  time.Duration
}

// CommonRules 通用告警规则
func CommonRules() []*AlertRule {
	return []*AlertRule{
		{
			Name: "high_cpu",
			Check: func() (bool, string) {
				percents, _ := cpu.Percent(time.Minute, false)
				if len(percents) > 0 && percents[0] > 80 {
					return true, fmt.Sprintf("CPU 使用率过高: %.1f%%", percents[0])
				}
				return false, ""
			},
			Level:    AlertLevelWarning,
			Interval: time.Minute,
		},
		{
			Name: "high_memory",
			Check: func() (bool, string) {
				stat, _ := mem.VirtualMemory()
				if stat.UsedPercent > 85 {
					return true, fmt.Sprintf("内存使用率过高: %.1f%%", stat.UsedPercent)
				}
				return false, ""
			},
			Level:    AlertLevelWarning,
			Interval: time.Minute,
		},
		{
			Name: "disk_full",
			Check: func() (bool, string) {
				stat, _ := disk.Usage("/")
				if stat.UsedPercent > 90 {
					return true, fmt.Sprintf("磁盘使用率过高: %.1f%%", stat.UsedPercent)
				}
				return false, ""
			},
			Level:    AlertLevelCritical,
			Interval: 5 * time.Minute,
		},
	}
}

// StartRuleCheck 启动规则检查
func (a *Alerter) StartRuleCheck(ctx context.Context, rules []*AlertRule) {
	for _, rule := range rules {
		go func(r *AlertRule) {
			ticker := time.NewTicker(r.Interval)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					triggered, message := r.Check()
					if triggered {
						a.SendAlert(&Alert{
							Level:     r.Level,
							Title:     r.Name,
							Message:   message,
							Timestamp: time.Now(),
						})
					}
				}
			}
		}(rule)
	}
}
```

## 监控面板

### 前端集成

```typescript
// src/api/monitor.ts
export interface SystemInfo {
  status: string
  cpu: number
  memory: {
    used: number
    total: number
    percent: number
  }
  disk: {
    used: number
    total: number
    percent: number
  }
  goroutines: number
}

export const getSystemInfo = () => {
  return request<SystemInfo>({
    url: '/api/v1/monitor/system',
    method: 'get'
  })
}
```

## 最佳实践

### ✅ 应该做的

1. **分层监控**：应用、数据库、系统都要监控
2. **合理阈值**：告警阈值要合理，避免误报
3. **告警分级**：info、warning、critical 分级处理
4. **定期检查**：定期检查监控是否正常工作
5. **文档化**：记录告警处理流程

### ❌ 不应该做的

1. **过度监控**：只监控关键指标
2. **忽略告警**：告警要及时处理
3. **阈值过低**：频繁的误报会导致麻木
4. **单一监控**：多种监控手段结合使用

## 下一步

系统监控完成后，让我们学习「[Nginx 反向代理配置](../chapter-10/nginx-config)」


