---
title: "缓存优化策略"
description: "缓存可以显著提高系统性能："
---

# 缓存优化策略

::: tip 💡 怎么读这页
这页讲解缓存策略和常见问题。建议先掌握 Cache-Aside 模式，再了解穿透、击穿、雪崩的解决方案。
:::

## 页面导航

[[toc]]

## 学习目标

完成本章后，你将：
- ✅ 理解 Redis 缓存的使用场景
- ✅ 掌握缓存读写策略
- ✅ 学会缓存穿透、击穿、雪崩的解决方案
- ✅ 了解缓存预热和更新策略

## 为什么需要缓存？

缓存可以显著提高系统性能：

| 操作 | 数据库查询 | Redis 缓存 |
|------|-----------|-----------|
| 响应时间 | 100-500ms | 1-5ms |
| QPS | 1000-5000 | 50000-100000 |
| 成本 | 高（CPU/IO） | 低（内存） |

## Redis 配置

### 初始化 Redis

```go
// internal/pkg/database/redis.go
package database

import (
	"context"
	"fmt"
	"iwan-station-gin/internal/config"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// InitRedis 初始化 Redis
func InitRedis(cfg config.RedisConfig, logger *zap.Logger) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: cfg.PoolSize,
	})

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis connection failed", zap.Error(err))
		// 根据需求决定是否返回错误
	} else {
		logger.Info("Redis connected successfully")
	}

	return rdb
}
```

### 配置文件

```yaml
# config/config.yaml
redis:
  host: localhost
  port: 6379
  password: ""
  db: 0
  pool_size: 10
```

## 缓存读写策略

### Cache-Aside（旁路缓存）

最常用的缓存策略：

```go
// internal/service/cache.go
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// CacheService 缓存服务
type CacheService struct {
	rdb    *redis.Client
	logger *zap.Logger
}

// NewCacheService 创建缓存服务
func NewCacheService(rdb *redis.Client, logger *zap.Logger) *CacheService {
	return &CacheService{
		rdb:    rdb,
		logger: logger,
	}
}

// Get 获取缓存
func (s *CacheService) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return err
	}

	return json.Unmarshal([]byte(val), dest)
}

// Set 设置缓存
func (s *CacheService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return s.rdb.Set(ctx, key, data, expiration).Err()
}

// Delete 删除缓存
func (s *CacheService) Delete(ctx context.Context, keys ...string) error {
	return s.rdb.Del(ctx, keys...).Err()
}

// Exists 检查缓存是否存在
func (s *CacheService) Exists(ctx context.Context, key string) (bool, error) {
	count, err := s.rdb.Exists(ctx, key).Result()
	return count > 0, err
}
```

### 使用示例

```go
// GetByID 获取用户（带缓存）
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	// 1. 尝试从缓存获取
	cacheKey := fmt.Sprintf("user:%d", id)
	var user model.User

	if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
		s.logger.Debug("Cache hit", zap.String("key", cacheKey))
		return &user, nil
	}

	// 2. 缓存未命中，从数据库获取
	user, err := s.repos.User.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 3. 写入缓存
	if err := s.cache.Set(ctx, cacheKey, user, time.Hour); err != nil {
		s.logger.Warn("Failed to set cache", zap.Error(err))
	}

	return user, nil
}

// Update 更新用户（删除缓存）
func (s *UserService) Update(ctx context.Context, user *model.User) error {
	// 1. 更新数据库
	if err := s.repos.User.Update(ctx, user); err != nil {
		return err
	}

	// 2. 删除缓存
	cacheKey := fmt.Sprintf("user:%d", user.ID)
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		s.logger.Warn("Failed to delete cache", zap.Error(err))
	}

	return nil
}
```

## 缓存问题解决方案

### 1. 缓存穿透（查询不存在的数据）

**问题**：大量查询不存在的数据，缓存和数据库都没有，每次都查数据库

**解决方案1：布隆过滤器**

```go
// internal/pkg/bloom/filter.go
package bloom

import (
	"github.com/bits-and-blooms/bloom/v3"
)

// BloomFilter 布隆过滤器
type BloomFilter struct {
	filter *bloom.BloomFilter
}

// NewBloomFilter 创建布隆过滤器
func NewBloomFilter(n uint, fp float64) *BloomFilter {
	return &BloomFilter{
		filter: bloom.NewWithEstimates(n, fp),
	}
}

// Add 添加元素
func (b *BloomFilter) Add(data []byte) {
	b.filter.Add(data)
}

// Exists 检查元素是否存在
func (b *BloomFilter) Exists(data []byte) bool {
	return b.filter.Test(data)
}

// 使用示例
var userIDFilter = NewBloomFilter(1000000, 0.01)

// 初始化时加载所有用户ID
func initUserIDFilter() {
	// 从数据库加载所有用户ID
	userIDs := getAllUserIDs()
	for _, id := range userIDs {
		userIDFilter.Add([]byte(fmt.Sprintf("user:%d", id)))
	}
}

// 检查用户是否存在
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	key := fmt.Sprintf("user:%d", id)

	// 先检查布隆过滤器
	if !userIDFilter.Exists([]byte(key)) {
		// 100% 不存在，直接返回
		return nil, ErrUserNotFound
	}

	// 可能存在，继续查询缓存和数据库
	// ...
}
```

**解决方案2：缓存空值**

```go
// GetByID 缓存空值
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	cacheKey := fmt.Sprintf("user:%d", id)

	// 1. 尝试从缓存获取
	var user model.User
	err := s.cache.Get(ctx, cacheKey, &user)

	if err == nil {
		// 缓存命中
		return &user, nil
	}

	if err != ErrCacheMiss {
		// 缓存错误
		return nil, err
	}

	// 2. 从数据库获取
	user, dbErr := s.repos.User.FindByID(ctx, id)
	if dbErr != nil {
		// 用户不存在，缓存空值（5分钟）
		if errors.Is(dbErr, gorm.ErrRecordNotFound) {
			s.cache.Set(ctx, cacheKey, nil, 5*time.Minute)
			return nil, ErrUserNotFound
		}
		return nil, dbErr
	}

	// 3. 写入缓存
	s.cache.Set(ctx, cacheKey, user, time.Hour)

	return &user, nil
}
```

### 2. 缓存击穿（热点 Key 过期）

**问题**：热点 Key 过期时，大量请求同时查询数据库

**解决方案：分布式锁**

```go
// GetByID 使用分布式锁
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	cacheKey := fmt.Sprintf("user:%d", id)
	lockKey := fmt.Sprintf("lock:user:%d", id)

	// 1. 尝试从缓存获取
	var user model.User
	if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
		return &user, nil
	}

	// 2. 获取分布式锁
	lock := s.acquireLock(ctx, lockKey, 10*time.Second)
	if !lock {
		// 获取锁失败，等待后重试
		time.Sleep(100 * time.Millisecond)
		return s.GetByID(ctx, id) // 递归重试
	}
	defer s.releaseLock(ctx, lockKey)

	// 3. 再次检查缓存（double check）
	if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
		return &user, nil
	}

	// 4. 从数据库获取
	user, err := s.repos.User.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 5. 写入缓存
	s.cache.Set(ctx, cacheKey, user, time.Hour)

	return &user, nil
}

// acquireLock 获取锁
func (s *CacheService) acquireLock(ctx context.Context, key string, expiration time.Duration) bool {
	return s.rdb.SetNX(ctx, key, "1", expiration).Val() == true
}

// releaseLock 释放锁
func (s *CacheService) releaseLock(ctx context.Context, key string) {
	s.rdb.Del(ctx, key)
}
```

### 3. 缓存雪崩（大量 Key 同时过期）

**问题**：大量 Key 同时过期，请求全部打到数据库

**解决方案：随机过期时间**

```go
// SetWithRandomTTL 设置缓存（随机过期时间）
func (s *CacheService) SetWithRandomTTL(ctx context.Context, key string, value interface{}, baseExpiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	// 添加随机时间（0-20%的基准时间）
	randomDuration := time.Duration(rand.Int63n(int64(baseExpiration) / 5))
	expiration := baseExpiration + randomDuration

	return s.rdb.Set(ctx, key, data, expiration).Err()
}
```

**解决方案：互斥锁**

```go
// GetByID 使用互斥锁防止雪崩
func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	cacheKey := fmt.Sprintf("user:%d", id)
	lockKey := fmt.Sprintf("lock:user:%d", id)

	// 尝试获取缓存
	var user model.User
	if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
		return &user, nil
	}

	// 获取锁
	if s.acquireLock(ctx, lockKey, 5*time.Second) {
		defer s.releaseLock(ctx, lockKey)

		// 双重检查
		if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
			return &user, nil
		}

		// 从数据库加载
		user, err := s.repos.User.FindByID(ctx, id)
		if err != nil {
			return nil, err
		}

		// 写入缓存（随机过期时间）
		s.cache.SetWithRandomTTL(ctx, cacheKey, user, time.Hour)

		return &user, nil
	}

	// 获取锁失败，返回过期数据或等待
	time.Sleep(50 * time.Millisecond)
	return s.GetByID(ctx, id)
}
```

## 缓存预热

### 启动时加载热点数据

```go
// internal/pkg/cache/warmup.go
package cache

import (
	"context"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
)

// WarmupCache 缓存预热
func WarmupCache(ctx context.Context, repos *repository.Repositories, cache *service.CacheService) error {
	// 1. 加载热点用户
	hotUsers := []uint64{1, 2, 3, 4, 5} // 管理员等
	for _, userID := range hotUsers {
		user, err := repos.User.FindByID(ctx, userID)
		if err != nil {
			continue
		}
		cache.Set(ctx, fmt.Sprintf("user:%d", userID), user, time.Hour)
	}

	// 2. 加载系统配置
	configs, _ := repos.SystemConfig.GetAll(ctx)
	for _, cfg := range configs {
		cache.Set(ctx, fmt.Sprintf("config:%s", cfg.Key), cfg.Value, 24*time.Hour)
	}

	// 3. 加载菜单树
	// ...

	return nil
}
```

### 定时刷新热点数据

```go
// RefreshHotData 定时刷新热点数据
func (s *UserService) RefreshHotData() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()

		// 获取最近访问的用户
		userIDs := s.getRecentUserIDs(ctx)

		// 预热到缓存
		for _, id := range userIDs {
			user, err := s.repos.User.FindByID(ctx, id)
			if err != nil {
				continue
			}
			s.cache.Set(ctx, fmt.Sprintf("user:%d", id), user, time.Hour)
		}
	}
}
```

## 缓存更新策略

### 更新 vs 删除

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 更新缓存 | 命中率高 | 可能更新失败 | 读多写少 |
| 删除缓存 | 一致性好 | 命中率暂时下降 | 写多读少 |

### 推荐：先更新数据库，再删除缓存

```go
// Update 更新用户
func (s *UserService) Update(ctx context.Context, user *model.User) error {
	// 1. 更新数据库
	if err := s.repos.User.Update(ctx, user); err != nil {
		return err
	}

	// 2. 删除缓存（让下次查询时重新加载）
	cacheKey := fmt.Sprintf("user:%d", user.ID)
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		s.logger.Warn("Failed to delete cache", zap.Error(err))
	}

	return nil
}
```

### 延迟双删

```go
// Update 延迟双删
func (s *UserService) Update(ctx context.Context, user *model.User) error {
	cacheKey := fmt.Sprintf("user:%d", user.ID)

	// 1. 删除缓存
	s.cache.Delete(ctx, cacheKey)

	// 2. 更新数据库
	if err := s.repos.User.Update(ctx, user); err != nil {
		return err
	}

	// 3. 延迟再删除一次（异步）
	go func() {
		time.Sleep(1 * time.Second)
		s.cache.Delete(context.Background(), cacheKey)
	}()

	return nil
}
```

## 缓存监控

### 监控指标

```go
// internal/service/cache_monitor.go
package service

// CacheMonitor 缓存监控
type CacheMonitor struct {
	rdb    *redis.Client
	logger *zap.Logger
}

// GetStats 获取缓存统计
func (m *CacheMonitor) GetStats(ctx context.Context) (*CacheStats, error) {
	info, err := m.rdb.Info(ctx, "stats").Result()
	if err != nil {
		return nil, err
	}

	// 解析 info 命令输出
	// ...

	return &CacheStats{
		Hits:   hits,
		Misses: misses,
		HitRate: float64(hits) / float64(hits + misses),
	}, nil
}

// CacheStats 缓存统计
type CacheStats struct {
	Hits   int64   `json:"hits"`
	Misses int64   `json:"misses"`
	HitRate float64 `json:"hit_rate"`
}
```

## 最佳实践

### ✅ 应该做的

1. **设置过期时间**：避免内存无限增长
2. **使用随机过期**：防止同时过期
3. **缓存空值**：防止缓存穿透
4. **使用锁**：防止缓存击穿
5. **监控命中率**：优化缓存策略

### ❌ 不应该做的

1. **缓存所有数据**：只缓存热点数据
2. **过期时间过长**：可能导致数据不一致
3. **忽略错误**：缓存失败不应影响业务
4. **过度依赖缓存**：缓存是优化，不是必需

## 下一步

缓存优化完成后，让我们学习「[动态配置管理](../chapter-8/dynamic-config)」


