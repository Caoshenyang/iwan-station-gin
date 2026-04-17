---
title: "操作日志记录"
description: "操作日志记录用户在系统中的所有操作，用于："
---

# 操作日志记录

::: tip 💡 怎么读这页
这页实现操作日志的自动记录。建议先看日志中间件的核心逻辑，再看查询接口的实现。
:::

## 页面导航

[[toc]]

## 学习目标

完成本章后，你将：
- ✅ 理解操作日志的重要性
- ✅ 实现完整的操作日志系统
- ✅ 学会异步日志写入
- ✅ 掌握日志查询和分析

## 为什么需要操作日志？

操作日志记录用户在系统中的所有操作，用于：

| 用途 | 说明 | 示例 |
|------|------|------|
| 审计追溯 | 查询谁做了什么操作 | 谁删除了用户A |
| 安全分析 | 检测异常行为 | 用户在异常时间登录 |
| 问题排查 | 复现问题场景 | 操作失败时的上下文 |
| 数据统计 | 用户行为分析 | 最常用的功能 |
| 合规要求 | 满足法律法规 | 金融行业要求 |

## 日志表设计

### SQL 定义

```sql
CREATE TABLE operation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    username VARCHAR(50) COMMENT '用户名',
    module VARCHAR(50) COMMENT '模块名称',
    action VARCHAR(50) COMMENT '操作类型',
    method VARCHAR(10) COMMENT 'HTTP方法',
    path VARCHAR(255) COMMENT '请求路径',
    params TEXT COMMENT '请求参数',
    ip VARCHAR(50) COMMENT 'IP地址',
    user_agent VARCHAR(500) COMMENT '用户代理',
    status TINYINT DEFAULT 1 COMMENT '状态：1=成功，0=失败',
    error TEXT COMMENT '错误信息',
    latency BIGINT DEFAULT 0 COMMENT '耗时（毫秒）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_user_id (user_id),
    INDEX idx_module (module),
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

### 模型定义

```go
// internal/model/operation_log.go
package model

import "time"

// OperationLog 操作日志
type OperationLog struct {
	ID        uint64    `gorm:"primary_key;auto_increment" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	Username  string    `gorm:"type:varchar(50)" json:"username"`
	Module    string    `gorm:"type:varchar(50);index" json:"module"`
	Action    string    `gorm:"type:varchar(50);index" json:"action"`
	Method    string    `gorm:"type:varchar(10)" json:"method"`
	Path      string    `gorm:"type:varchar(255)" json:"path"`
	Params    string    `gorm:"type:text" json:"params,omitempty"`
	IP        string    `gorm:"type:varchar(50)" json:"ip"`
	UserAgent string    `gorm:"type:varchar(500)" json:"user_agent,omitempty"`
	Status    int       `gorm:"type:tinyint;default:1;index" json:"status"`
	Error     string    `gorm:"type:text" json:"error,omitempty"`
	Latency   int64     `gorm:"type:bigint;default:0" json:"latency"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名
func (OperationLog) TableName() string {
	return "operation_logs"
}
```

## 日志记录实现

### Repository 层

```go
// internal/repository/operation_log.go
package repository

import (
	"context"
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// OperationLogRepository 操作日志仓库
type OperationLogRepository struct {
	db *gorm.DB
}

// NewOperationLogRepository 创建操作日志仓库
func NewOperationLogRepository(db *gorm.DB) *OperationLogRepository {
	return &OperationLogRepository{db: db}
}

// Create 创建日志
func (r *OperationLogRepository) Create(ctx context.Context, log *model.OperationLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// List 获取日志列表
func (r *OperationLogRepository) List(ctx context.Context, req *ListRequest) ([]*model.OperationLog, int64, error) {
	var logs []*model.OperationLog
	var total int64

	query := r.db.WithContext(ctx).Model(&model.OperationLog{})

	// 用户过滤
	if req.UserID > 0 {
		query = query.Where("user_id = ?", req.UserID)
	}

	// 模块过滤
	if req.Module != "" {
		query = query.Where("module = ?", req.Module)
	}

	// 状态过滤
	if req.Status >= 0 {
		query = query.Where("status = ?", req.Status)
	}

	// 时间范围
	if !req.StartTime.IsZero() {
		query = query.Where("created_at >= ?", req.StartTime)
	}
	if !req.EndTime.IsZero() {
		query = query.Where("created_at <= ?", req.EndTime)
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	err := query.Order("id DESC").Limit(req.PageSize).Offset(offset).Find(&logs).Error

	return logs, total, err
}

// ListRequest 列表请求
type ListRequest struct {
	UserID    uint64
	Module    string
	Action    string
	Status    int
	StartTime time.Time
	EndTime   time.Time
	Page      int
	PageSize  int
}
```

### Service 层

```go
// internal/service/operation_log.go
package service

import (
	"context"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
	"sync"
	"time"

	"go.uber.org/zap"
)

// OperationLogService 操作日志服务
type OperationLogService struct {
	repo   *repository.OperationLogRepository
	logger *zap.Logger
	// 异步写入通道
	logChan chan *model.OperationLog
	// 等待组
	wg sync.WaitGroup
}

// NewOperationLogService 创建操作日志服务
func NewOperationLogService(
	repo *repository.OperationLogRepository,
	logger *zap.Logger,
) *OperationLogService {
	s := &OperationLogService{
		repo:    repo,
		logger:  logger,
		logChan: make(chan *model.OperationLog, 1000),
	}

	// 启动异步写入
	s.start()

	return s
}

// start 启动异步写入
func (s *OperationLogService) start() {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		for log := range s.logChan {
			if err := s.repo.Create(context.Background(), log); err != nil {
				s.logger.Error("Failed to save operation log",
					zap.Error(err),
					zap.Uint64("user_id", log.UserID),
					zap.String("action", log.Action),
				)
			}
		}
	}()
}

// Log 记录日志（异步）
func (s *OperationLogService) Log(log *model.OperationLog) {
	select {
	case s.logChan <- log:
	default:
		s.logger.Warn("Operation log channel is full, dropping log",
			zap.Uint64("user_id", log.UserID),
			zap.String("action", log.Action),
		)
	}
}

// LogSync 记录日志（同步）
func (s *OperationLogService) LogSync(ctx context.Context, log *model.OperationLog) error {
	return s.repo.Create(ctx, log)
}

// Close 关闭服务
func (s *OperationLogService) Close() {
	close(s.logChan)
	s.wg.Wait()
}
```

## 日志中间件

### 自动记录 HTTP 请求

```go
// internal/middleware/operation_log.go
package middleware

import (
	"bytes"
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/service"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// OperationLogMiddleware 操作日志中间件
type OperationLogMiddleware struct {
	logService *service.OperationLogService
	logger     *zap.Logger
}

// NewOperationLogMiddleware 创建操作日志中间件
func NewOperationLogMiddleware(
	logService *service.OperationLogService,
	logger *zap.Logger,
) *OperationLogMiddleware {
	return &OperationLogMiddleware{
		logService: logService,
		logger:     logger,
	}
}

// Log 记录操作日志
func (m *OperationLogMiddleware) Log() gin.HandlerFunc {
	// 不需要记录日志的路径
	skipPaths := map[string]bool{
		"/health":          true,
		"/api/v1/auth/login":  true,
		"/api/v1/auth/register": true,
	}

	return func(c *gin.Context) {
		// 跳过不需要记录的路径
		if skipPaths[c.Request.URL.Path] {
			c.Next()
			return
		}

		// 记录开始时间
		start := time.Now()

		// 读取请求体（用于记录参数）
		var body string
		if c.Request.Body != nil && c.Request.Method != "GET" {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			body = string(bodyBytes)
			// 恢复请求体
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// 使用响应写入器包装
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// 处理请求
		c.Next()

		// 计算耗时
		latency := time.Since(start).Milliseconds()

		// 获取用户信息
		userID := v1.GetUserIDFromContext(c)
		username := v1.GetUsernameFromContext(c)

		// 确定模块和操作
		module, action := m.parsePath(c.Request.URL.Path)

		// 构建日志
		log := &model.OperationLog{
			UserID:    userID,
			Username:  username,
			Module:    module,
			Action:    action,
			Method:    c.Request.Method,
			Path:      c.Request.URL.Path,
			Params:    m.sanitizeParams(body),
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Status:    1,
			Latency:   latency,
			CreatedAt: time.Now(),
		}

		// 检查是否有错误
		if len(c.Errors) > 0 {
			log.Status = 0
			var errors []string
			for _, e := range c.Errors {
				errors = append(errors, e.Error())
			}
			log.Error = strings.Join(errors, "; ")
		}

		// 异步写入日志
		m.logService.Log(log)
	}
}

// parsePath 解析路径获取模块和操作
func (m *OperationLogMiddleware) parsePath(path string) (module, action string) {
	// /api/v1/user/list -> user, list
	// /api/v1/article/123 -> article, update

	parts := strings.Split(path, "/")
	if len(parts) >= 4 {
		module = parts[3]
	}
	if len(parts) >= 5 {
		action = parts[4]
		// 处理 ID 情况
		if action == "" || isNumeric(action) {
			action = "view"
		}
	}

	// 根据 HTTP 方法确定操作
	switch action {
	case "":
		if module != "" {
			action = "list"
		}
	default:
		// 保持原样
	}

	return module, action
}

// sanitizeParams 清理敏感参数
func (m *OperationLogMiddleware) sanitizeParams(body string) string {
	// 移除密码字段
	sensitive := []string{"password", "old_password", "new_password"}
	for _, field := range sensitive {
		body = strings.ReplaceAll(body, `"`+field+`":"`, `"`+field+`":"***"`)
	}
	return body
}

// bodyLogWriter 响应体写入器
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}
```

### 业务日志记录

```go
// 在 Service 中记录重要操作
func (s *UserService) Delete(ctx context.Context, id uint64) error {
	// 删除用户
	if err := s.repos.User.Delete(ctx, id); err != nil {
		// 记录失败日志
		s.logService.Log(&model.OperationLog{
			UserID:   GetUserIDFromContext(ctx),
			Module:   "user",
			Action:   "delete",
			Status:   0,
			Error:    err.Error(),
		})
		return err
	}

	// 记录成功日志
	s.logService.Log(&model.OperationLog{
		UserID:  GetUserIDFromContext(ctx),
		Module:  "user",
		Action:  "delete",
		Status:  1,
		Params:  fmt.Sprintf(`{"user_id": %d}`, id),
	})

	return nil
}
```

## 日志查询 API

### Handler 实现

```go
// internal/api/v1/operation_log.go
package v1

import (
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/repository"
	"time"

	"github.com/gin-gonic/gin"
)

// OperationLogHandler 操作日志处理器
type OperationLogHandler struct {
	logRepo *repository.OperationLogRepository
}

// NewOperationLogHandler 创建操作日志处理器
func NewOperationLogHandler(logRepo *repository.OperationLogRepository) *OperationLogHandler {
	return &OperationLogHandler{
		logRepo: logRepo,
	}
}

// ListRequest 查询请求
type ListRequest struct {
	UserID    uint64    `form:"user_id"`
	Module    string    `form:"module"`
	Action    string    `form:"action"`
	Status    int       `form:"status"`
	StartTime time.Time `form:"start_time" time_format:"2006-01-02 15:04:05"`
	EndTime   time.Time `form:"end_time" time_format:"2006-01-02 15:04:05"`
	Page      int       `form:"page,default=1"`
	PageSize  int       `form:"page_size,default=20"`
}

// List 获取操作日志列表
func (h *OperationLogHandler) List(c *gin.Context) {
	var req ListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	// 构建查询参数
	listReq := &repository.ListRequest{
		UserID:    req.UserID,
		Module:    req.Module,
		Action:    req.Action,
		Status:    req.Status,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Page:      req.Page,
		PageSize:  req.PageSize,
	}

	logs, total, err := h.logRepo.List(c.Request.Context(), listReq)
	if err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, gin.H{
		"list":  logs,
		"total": total,
	})
}
```

## 日志统计

### 统计接口

```go
// internal/service/operation_log_stats.go
package service

import (
	"context"
	"iwan-station-gin/internal/repository"
	"time"
)

// Stats 统计数据
type Stats struct {
	TotalRequests int64            `json:"total_requests"`
	SuccessCount  int64            `json:"success_count"`
	ErrorCount    int64            `json:"error_count"`
	AvgLatency    float64          `json:"avg_latency"`
	ModuleStats   map[string]int64 `json:"module_stats"`
	ActionStats   map[string]int64 `json:"action_stats"`
	HourlyStats   map[string]int64 `json:"hourly_stats"`
}

// GetStats 获取统计数据
func (s *OperationLogService) GetStats(ctx context.Context, startTime, endTime time.Time) (*Stats, error) {
	stats := &Stats{
		ModuleStats: make(map[string]int64),
		ActionStats: make(map[string]int64),
		HourlyStats: make(map[string]int64),
	}

	// 总请求数
	s.repo.GetStatsByTimeRange(ctx, startTime, endTime, &stats.TotalRequests)

	// 成功/失败统计
	s.repo.GetStatsByStatus(ctx, startTime, endTime, 1, &stats.SuccessCount)
	s.repo.GetStatsByStatus(ctx, startTime, endTime, 0, &stats.ErrorCount)

	// 平均耗时
	s.repo.GetAvgLatency(ctx, startTime, endTime, &stats.AvgLatency)

	// 模块统计
	s.repo.GetStatsByModule(ctx, startTime, endTime, &stats.ModuleStats)

	// 操作统计
	s.repo.GetStatsByAction(ctx, startTime, endTime, &stats.ActionStats)

	// 小时统计
	s.repo.GetStatsByHour(ctx, startTime, endTime, &stats.HourlyStats)

	return stats, nil
}
```

## 日志清理

### 定时清理旧日志

```go
// internal/service/operation_log_cleanup.go
package service

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// CleanupOldLogs 清理旧日志
func (s *OperationLogService) CleanupOldLogs(ctx context.Context, retainDays int) error {
	cutoff := time.Now().AddDate(0, 0, -retainDays)

	result := s.repo.db.WithContext(ctx).
		Where("created_at < ?", cutoff).
		Delete(&model.OperationLog{})

	if result.Error != nil {
		return result.Error
	}

	s.logger.Info("Cleaned up old operation logs",
		zap.Int64("count", result.RowsAffected),
		zap.Time("cutoff", cutoff),
	)

	return nil
}

// StartCleanupTask 启动清理任务
func (s *OperationLogService) StartCleanupTask() {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		// 保留90天的日志
		if err := s.CleanupOldLogs(ctx, 90); err != nil {
			s.logger.Error("Failed to cleanup old logs", zap.Error(err))
		}
	}
}
```

## 最佳实践

### ✅ 应该做的

1. **异步写入**：日志写入不应阻塞业务
2. **敏感信息脱敏**：密码等敏感信息不记录
3. **定期清理**：避免日志表过大
4. **关键操作同步**：重要操作可以同步写入
5. **索引优化**：为常用查询字段添加索引

### ❌ 不应该做的

1. **记录所有请求**：只记录重要的操作
2. **同步阻塞**：影响业务性能
3. **记录敏感信息**：密码、token 等
4. **无限期保存**：定期清理旧数据
5. **忽略错误日志**：失败日志很重要

## 下一步

操作日志完成后，让我们学习「[系统监控](./system-monitor)」


