---
title: "动态配置管理"
description: "静态配置文件（config.yaml）的局限性："
---

# 动态配置管理

## 学习目标

完成本章后，你将：
- ✅ 理解动态配置的必要性
- ✅ 实现配置的数据库存储
- ✅ 掌握配置热更新机制
- ✅ 学会配置版本管理

## 为什么需要动态配置？

静态配置文件（config.yaml）的局限性：

| 问题 | 静态配置 | 动态配置 |
|------|---------|---------|
| 修改后生效 | 需要重启服务 | 即时生效 |
| 配置管理 | 手动编辑文件 | 可视化管理 |
| 配置历史 | 无 | 有版本记录 |
| 配置验证 | 启动时检查 | 实时验证 |
| 环境同步 | 手动复制 | 自动同步 |

## 配置表设计

### SQL 定义

```sql
CREATE TABLE system_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    `key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    value TEXT COMMENT '配置值',
    `type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型：string,number,boolean,json',
    `group` VARCHAR(50) COMMENT '配置分组',
    remark VARCHAR(255) COMMENT '配置说明',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_group (`group`),
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
```

### 模型定义

```go
// internal/model/system_config.go
package model

// SystemConfig 系统配置
type SystemConfig struct {
	ID        uint64    `gorm:"primary_key;auto_increment" json:"id"`
	Key       string    `gorm:"type:varchar(100);uniqueIndex;not null;comment:配置键" json:"key"`
	Value     string    `gorm:"type:text;comment:配置值" json:"value"`
	Type      string    `gorm:"type:varchar(20);default:string;comment:配置类型" json:"type"`
	Group     string    `gorm:"type:varchar(50);comment:配置分组" json:"group"`
	Remark    string    `gorm:"type:varchar(255);comment:配置说明" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (SystemConfig) TableName() string {
	return "system_configs"
}

// ConfigType 配置类型
type ConfigType string

const (
	ConfigTypeString  ConfigType = "string"
	ConfigTypeNumber  ConfigType = "number"
	ConfigTypeBoolean ConfigType = "boolean"
	ConfigTypeJSON    ConfigType = "json"
)
```

## 配置服务实现

### Repository 层

```go
// internal/repository/system_config.go
package repository

import (
	"context"
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// SystemConfigRepository 配置仓库
type SystemConfigRepository struct {
	db *gorm.DB
}

// NewSystemConfigRepository 创建配置仓库
func NewSystemConfigRepository(db *gorm.DB) *SystemConfigRepository {
	return &SystemConfigRepository{db: db}
}

// FindByKey 根据键查找配置
func (r *SystemConfigRepository) FindByKey(ctx context.Context, key string) (*model.SystemConfig, error) {
	var config model.SystemConfig
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&config).Error
	return &config, err
}

// FindByGroup 根据分组查找配置
func (r *SystemConfigRepository) FindByGroup(ctx context.Context, group string) ([]*model.SystemConfig, error) {
	var configs []*model.SystemConfig
	err := r.db.WithContext(ctx).Where("`group` = ?", group).Find(&configs).Error
	return configs, err
}

// GetAll 获取所有配置
func (r *SystemConfigRepository) GetAll(ctx context.Context) ([]*model.SystemConfig, error) {
	var configs []*model.SystemConfig
	err := r.db.WithContext(ctx).Find(&configs).Error
	return configs, err
}

// Create 创建配置
func (r *SystemConfigRepository) Create(ctx context.Context, config *model.SystemConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

// Update 更新配置
func (r *SystemConfigRepository) Update(ctx context.Context, config *model.SystemConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

// Delete 删除配置
func (r *SystemConfigRepository) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.SystemConfig{}, id).Error
}

// BatchUpdate 批量更新配置
func (r *SystemConfigRepository) BatchUpdate(ctx context.Context, configs map[string]string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for key, value := range configs {
			err := tx.Model(&model.SystemConfig{}).
				Where("key = ?", key).
				Update("value", value).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}
```

### Service 层

```go
// internal/service/system_config.go
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
	"strconv"
	"sync"
	"time"

	"go.uber.org/zap"
)

var (
	ErrConfigNotFound = errors.New("config not found")
	ErrInvalidType    = errors.New("invalid config type")
)

// SystemConfigService 配置服务
type SystemConfigService struct {
	repos      *repository.Repositories
	cache      *sync.Map
	logger     *zap.Logger
	mu         sync.RWMutex
	initOnce   sync.Once
}

// NewSystemConfigService 创建配置服务
func NewSystemConfigService(repos *repository.Repositories, logger *zap.Logger) *SystemConfigService {
	s := &SystemConfigService{
		repos:  repos,
		cache:  &sync.Map{},
		logger: logger,
	}

	// 启动时加载配置
	s.initCache(context.Background())

	return s
}

// initCache 初始化配置缓存
func (s *SystemConfigService) initCache(ctx context.Context) {
	configs, err := s.repos.SystemConfig.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to load configs", zap.Error(err))
		return
	}

	for _, cfg := range configs {
		s.cache.Store(cfg.Key, cfg.Value)
	}

	s.logger.Info("Configs loaded", zap.Int("count", len(configs)))
}

// GetString 获取字符串配置
func (s *SystemConfigService) GetString(key string) (string, error) {
	if value, ok := s.cache.Load(key); ok {
		if str, ok := value.(string); ok {
			return str, nil
		}
	}
	return "", ErrConfigNotFound
}

// GetStringOrDefault 获取字符串配置（带默认值）
func (s *SystemConfigService) GetStringOrDefault(key, defaultValue string) string {
	if value, err := s.GetString(key); err == nil {
		return value
	}
	return defaultValue
}

// GetInt 获取整数配置
func (s *SystemConfigService) GetInt(key string) (int, error) {
	value, err := s.GetString(key)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(value)
}

// GetIntOrDefault 获取整数配置（带默认值）
func (s *SystemConfigService) GetIntOrDefault(key string, defaultValue int) int {
	if value, err := s.GetInt(key); err == nil {
		return value
	}
	return defaultValue
}

// GetBool 获取布尔配置
func (s *SystemConfigService) GetBool(key string) (bool, error) {
	value, err := s.GetString(key)
	if err != nil {
		return false, err
	}
	return strconv.ParseBool(value)
}

// GetBoolOrDefault 获取布尔配置（带默认值）
func (s *SystemConfigService) GetBoolOrDefault(key string, defaultValue bool) bool {
	if value, err := s.GetBool(key); err == nil {
		return value
	}
	return defaultValue
}

// GetJSON 获取 JSON 配置
func (s *SystemConfigService) GetJSON(key string, dest interface{}) error {
	value, err := s.GetString(key)
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(value), dest)
}

// Set 设置配置
func (s *SystemConfigService) Set(ctx context.Context, key, value string) error {
	// 更新数据库
	config, err := s.repos.SystemConfig.FindByKey(ctx, key)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新配置
			config = &model.SystemConfig{
				Key:   key,
				Value: value,
				Type:  model.ConfigTypeString,
			}
			if err := s.repos.SystemConfig.Create(ctx, config); err != nil {
				return err
			}
		} else {
			return err
		}
	} else {
		// 更新现有配置
		config.Value = value
		if err := s.repos.SystemConfig.Update(ctx, config); err != nil {
			return err
		}
	}

	// 更新缓存
	s.cache.Store(key, value)

	return nil
}

// BatchSet 批量设置配置
func (s *SystemConfigService) BatchSet(ctx context.Context, configs map[string]string) error {
	// 更新数据库
	if err := s.repos.SystemConfig.BatchUpdate(ctx, configs); err != nil {
		return err
	}

	// 更新缓存
	for key, value := range configs {
		s.cache.Store(key, value)
	}

	return nil
}

// Delete 删除配置
func (s *SystemConfigService) Delete(ctx context.Context, key string) error {
	// 从数据库删除
	config, err := s.repos.SystemConfig.FindByKey(ctx, key)
	if err != nil {
		return err
	}

	if err := s.repos.SystemConfig.Delete(ctx, config.ID); err != nil {
		return err
	}

	// 从缓存删除
	s.cache.Delete(key)

	return nil
}

// Refresh 刷新配置缓存
func (s *SystemConfigService) Refresh(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 清空缓存
	s.cache = &sync.Map{}

	// 重新加载
	s.initCache(ctx)
}
```

## 配置 API

### Handler 实现

```go
// internal/api/v1/system_config.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// SystemConfigHandler 配置处理器
type SystemConfigHandler struct {
	configService *service.SystemConfigService
}

// NewSystemConfigHandler 创建配置处理器
func NewSystemConfigHandler(configService *service.SystemConfigService) *SystemConfigHandler {
	return &SystemConfigHandler{
		configService: configService,
	}
}

// GetByGroup 获取分组配置
func (h *SystemConfigHandler) GetByGroup(c *gin.Context) {
	group := c.Query("group")
	if group == "" {
		response.Error(c, response.InvalidParams)
		return
	}

	configs, err := h.configService.GetByGroup(c.Request.Context(), group)
	if err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.Success(c, configs)
}

// SetConfig 设置配置
func (h *SystemConfigHandler) SetConfig(c *gin.Context) {
	var req struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	if err := h.configService.Set(c.Request.Context(), req.Key, req.Value); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.SuccessWithMessage(c, nil, "配置更新成功")
}

// BatchSetConfig 批量设置配置
func (h *SystemConfigHandler) BatchSetConfig(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.InvalidParams)
		return
	}

	if err := h.configService.BatchSet(c.Request.Context(), req); err != nil {
		response.Error(c, response.InternalServerError)
		return
	}

	response.SuccessWithMessage(c, nil, "批量配置更新成功")
}

// RefreshConfig 刷新配置
func (h *SystemConfigHandler) RefreshConfig(c *gin.Context) {
	h.configService.Refresh(c.Request.Context())
	response.SuccessWithMessage(c, nil, "配置刷新成功")
}
```

## 热更新机制

### 配置变更通知

```go
// internal/service/config_watcher.go
package service

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// ConfigWatcher 配置监听器
type ConfigWatcher struct {
	rdb         *redis.Client
	configSvc   *SystemConfigService
	logger      *zap.Logger
	subscription *redis.PubSub
}

// NewConfigWatcher 创建配置监听器
func NewConfigWatcher(
	rdb *redis.Client,
	configSvc *SystemConfigService,
	logger *zap.Logger,
) *ConfigWatcher {
	return &ConfigWatcher{
		rdb:       rdb,
		configSvc: configSvc,
		logger:    logger,
	}
}

// Start 启动监听
func (w *ConfigWatcher) Start(ctx context.Context) {
	w.subscription = w.rdb.Subscribe(ctx, "config:update")

	ch := w.subscription.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-ch:
			w.logger.Info("Config update notification", zap.String("payload", msg.Payload))
			// 刷新配置
			w.configSvc.Refresh(ctx)
		}
	}
}

// NotifyConfigChange 通知配置变更
func (w *ConfigWatcher) NotifyConfigChange(ctx context.Context, key string) error {
	return w.rdb.Publish(ctx, "config:update", key).Err()
}
```

### 使用示例

```go
// 更新配置时发送通知
func (s *SystemConfigService) Set(ctx context.Context, key, value string) error {
	// ... 更新数据库和缓存

	// 发送通知
	if s.watcher != nil {
		s.watcher.NotifyConfigChange(ctx, key)
	}

	return nil
}
```

## 配置初始化

### 默认配置

```go
// internal/pkg/config/defaults.go
package config

import (
	"context"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
)

// InitDefaultConfigs 初始化默认配置
func InitDefaultConfigs(ctx context.Context, repos *repository.Repositories) error {
	defaults := []*model.SystemConfig{
		{
			Key:   "site.name",
			Value: "Iwan Station",
			Type:  "string",
			Group: "site",
			Remark: "站点名称",
		},
		{
			Key:   "site.logo",
			Value: "/uploads/logo.png",
			Type:  "string",
			Group: "site",
			Remark: "站点 Logo",
		},
		{
			Key:   "user.register_enabled",
			Value: "true",
			Type:  "boolean",
			Group: "user",
			Remark: "是否开放注册",
		},
		{
			Key:   "user.default_role",
			Value: "2",
			Type:  "number",
			Group: "user",
			Remark: "新用户默认角色ID",
		},
		{
			Key:   "upload.max_size",
			Value: "10485760",
			Type:  "number",
			Group: "upload",
			Remark: "最大上传文件大小（字节）",
		},
		{
			Key:   "upload.allowed_types",
			Value: `["jpg","jpeg","png","gif","pdf"]`,
			Type:  "json",
			Group: "upload",
			Remark: "允许上传的文件类型",
		},
	}

	for _, cfg := range defaults {
		// 检查是否存在
		_, err := repos.SystemConfig.FindByKey(ctx, cfg.Key)
		if err == nil {
			continue // 已存在
		}

		// 创建默认配置
		if err := repos.SystemConfig.Create(ctx, cfg); err != nil {
			return err
		}
	}

	return nil
}
```

## 配置分组管理

### 分组定义

```go
// internal/service/config_group.go
package service

// ConfigGroup 配置分组
type ConfigGroup struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Icon   string `json:"icon"`
	Order  int    `json:"order"`
}

// GetConfigGroups 获取所有分组
func GetConfigGroups() []*ConfigGroup {
	return []*ConfigGroup{
		{
			Key:   "site",
			Name:  "站点设置",
			Icon:  "setting",
			Order: 1,
		},
		{
			Key:   "user",
			Name:  "用户设置",
			Icon:  "user",
			Order: 2,
		},
		{
			Key:   "upload",
			Name:  "上传设置",
			Icon:  "upload",
			Order: 3,
		},
		{
			Key:   "email",
			Name:  "邮件设置",
			Icon:  "mail",
			Order: 4,
		},
		{
			Key:   "security",
			Name:  "安全设置",
			Icon:  "lock",
			Order: 5,
		},
	}
}
```

## 最佳实践

### ✅ 应该做的

1. **使用缓存**：配置读多写少，应该缓存
2. **热更新支持**：通过 Redis Pub/Sub 通知变更
3. **类型安全**：提供类型安全的获取方法
4. **默认值**：配置不存在时使用默认值
5. **分组管理**：按业务逻辑分组配置

### ❌ 不应该做的

1. **频繁修改**：配置不应该频繁变化
2. **忽略缓存**：每次都查数据库
3. **硬编码配置**：可变的配置应该动态化
4. **忽略错误**：配置获取失败应该有降级方案

## 下一步

动态配置完成后，让我们学习「[操作日志记录](./operation-logs)」


