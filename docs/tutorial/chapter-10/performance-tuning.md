---
title: "性能优化"
description: "Iwan Station Gin 文档：性能优化。"
---

# 性能优化

## 学习目标

完成本章后，你将：
- ✅ 掌握数据库查询优化
- ✅ 学会连接池配置
- ✅ 了解缓存策略
- ✅ 掌握应用层优化技巧

## 优化概述

性能优化的层次：

```
┌─────────────────────────────────────┐
│         应用层优化                    │  ← 代码、算法
├─────────────────────────────────────┤
│         数据库层优化                  │  ← 查询、索引
├─────────────────────────────────────┤
│         网络层优化                    │  ← 连接池、压缩
├─────────────────────────────────────┤
│         系统层优化                    │  ← 内核、硬件
└─────────────────────────────────────┘
```

## 数据库优化

### 1. 索引优化

```go
// 为常用查询字段添加索引
db.Exec("CREATE INDEX idx_users_username ON users(username)")
db.Exec("CREATE INDEX idx_users_email ON users(email)")
db.Exec("CREATE INDEX idx_articles_status ON articles(status)")
db.Exec("CREATE INDEX idx_articles_created_at ON articles(created_at)")

// 复合索引（注意顺序）
db.Exec("CREATE INDEX idx_articles_status_created ON articles(status, created_at)")

// 覆盖索引
db.Exec("CREATE INDEX idx_users_list ON users(status, created_at) INCLUDE (username, nickname)")
```

### 2. 查询优化

```go
// ❌ 不好：N+1 查询
func (s *ArticleService) ListWithTags(ctx context.Context) ([]*Article, error) {
    articles, _ := s.repos.Article.List(ctx)

    // N+1 问题
    for _, article := range articles {
        tags, _ := s.repos.Tag.GetByArticleID(ctx, article.ID)
        article.Tags = tags
    }

    return articles, nil
}

// ✅ 好：使用 Joins 或 Preload
func (s *ArticleService) ListWithTags(ctx context.Context) ([]*Article, error) {
    var articles []*Article
    err := s.db.WithContext(ctx).
        Preload("Tags").
        Find(&articles).Error
    return articles, err
}
```

### 3. 分页优化

```go
// 使用游标分页（大数据集）
type CursorPagination struct {
    Limit  int    `form:"limit"`
    Cursor uint64 `form:"cursor"`
}

func (r *ArticleRepository) ListCursor(ctx context.Context, req *CursorPagination) ([]*Article, error) {
    var articles []*Article
    query := r.db.WithContext(ctx).

    if req.Cursor > 0 {
        query = query.Where("id < ?", req.Cursor)
    }

    err := query.
        Order("id DESC").
        Limit(req.Limit).
        Find(&articles).Error

    return articles, err
}
```

### 4. 批量操作

```go
// ❌ 不好：循环插入
for _, user := range users {
    db.Create(&user)
}

// ✅ 好：批量插入
db.CreateInBatches(users, 100)

// 或使用 Create
db.Create(&users) // GORM 自动分批
```

## 连接池优化

### 数据库连接池

```go
// internal/pkg/database/mysql.go
package database

import (
	"iwan-station-gin/internal/config"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func InitMySQL(cfg config.DatabaseConfig) (*gorm.DB, error) {
    dsn := buildDSN(cfg)

    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        // 跳过默认事务（提高性能）
        SkipDefaultTransaction: true,
        // 预编译 SQL
        PrepareStmt: true,
    })
    if err != nil {
        return nil, err
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    // 连接池配置
    // SetMaxOpenConns 设置打开数据库连接的最大数量
    sqlDB.SetMaxOpenConns(cfg.MaxOpenConns) // 根据业务调整，通常 100-200

    // SetMaxIdleConns 设置空闲连接池中连接的最大数量
    sqlDB.SetMaxIdleConns(cfg.MaxIdleConns) // 通常为 MaxOpenConns 的 50%-80%

    // SetConnMaxLifetime 设置连接可复用的最长时间
    sqlDB.SetConnMaxLifetime(time.Hour) // 防止长时间使用的连接出现问题

    return db, nil
}
```

### Redis 连接池

```go
// internal/pkg/database/redis.go
package database

import (
	"context"
	"fmt"
	"iwan-station-gin/internal/config"
	"time"

	"github.com/redis/go-redis/v9"
)

func InitRedis(cfg config.RedisConfig) *redis.Client {
    rdb := redis.NewClient(&redis.Options{
        Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
        Password:     cfg.Password,
        DB:           cfg.DB,
        PoolSize:     cfg.PoolSize,     // 连接池大小，通常 10-50
        MinIdleConns: 5,                // 最小空闲连接数
        MaxRetries:   3,                // 最大重试次数
        DialTimeout:  5 * time.Second,  // 连接超时
        ReadTimeout:  3 * time.Second,  // 读超时
        WriteTimeout: 3 * time.Second,  // 写超时
        PoolTimeout:  4 * time.Second,  // 获取连接超时
    })

    // 测试连接
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := rdb.Ping(ctx).Err(); err != nil {
        panic(fmt.Sprintf("Redis connection failed: %v", err))
    }

    return rdb
}
```

## 应用层优化

### 1. 使用 Goroutine 池

```go
// internal/pkg/worker/pool.go
package worker

import (
	"sync"
)

// Worker Goroutine 池
type Pool struct {
	workerCount int
	taskQueue   chan func()
	wg          sync.WaitGroup
}

// NewPool 创建 Goroutine 池
func NewPool(workerCount int, queueSize int) *Pool {
	p := &Pool{
		workerCount: workerCount,
		taskQueue:   make(chan func(), queueSize),
	}

	// 启动 worker
	for i := 0; i < workerCount; i++ {
		p.wg.Add(1)
		go p.worker()
	}

	return p
}

// worker 处理任务
func (p *Pool) worker() {
	defer p.wg.Done()
	for task := range p.taskQueue {
		task()
	}
}

// Submit 提交任务
func (p *Pool) Submit(task func()) error {
	select {
	case p.taskQueue <- task:
		return nil
	default:
		return errors.New("task queue is full")
	}
}

// Close 关闭池
func (p *Pool) Close() {
	close(p.taskQueue)
	p.wg.Wait()
}
```

### 2. 响应压缩

```go
// internal/middleware/compress.go
package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/nanmu42/gzip"
)

// Gzip 压缩中间件
func Gzip() gin.HandlerFunc {
    return gzip.Gzip(gzip.DefaultCompression)
}

// 使用
router.Use(Gzip())
```

### 3. JSON 优化

```go
// 使用高效 JSON 库
import "github.com/json-iterator/go"

var json = jsoniter.ConfigCompatibleWithStandardLibrary

// 或使用 easyjson
//go:generate easyjson -all user.go
```

## 缓存优化

### 1. 多级缓存

```go
// internal/service/cache.go
type CacheService struct {
    localCache *cache.Cache    // 本地缓存（进程内）
    redis      *redis.Client   // Redis 缓存（分布式）
}

func (s *CacheService) Get(ctx context.Context, key string, dest interface{}) error {
    // 1. 先查本地缓存
    if val, ok := s.localCache.Get(key); ok {
        return json.Unmarshal(val.([]byte), dest)
    }

    // 2. 再查 Redis
    val, err := s.redis.Get(ctx, key).Bytes()
    if err == nil {
        // 回写本地缓存
        s.localCache.Set(key, val, 5*time.Minute)
        return json.Unmarshal(val, dest)
    }

    return ErrCacheMiss
}
```

### 2. 缓存预热

```go
// 启动时预热热点数据
func (s *UserService) WarmupCache(ctx context.Context) error {
    // 获取热点用户
    hotUserIDs := []uint64{1, 2, 3, 4, 5}

    for _, id := range hotUserIDs {
        user, err := s.repos.User.FindByID(ctx, id)
        if err != nil {
            continue
        }

        cacheKey := fmt.Sprintf("user:%d", id)
        s.cache.Set(ctx, cacheKey, user, time.Hour)
    }

    return nil
}
```

## HTTP 优化

### 1. HTTP/2

```nginx
# Nginx 配置
server {
    listen 443 ssl http2;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

### 2. 连接复用

```go
// HTTP 客户端配置
client := &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

### 3. 响应头优化

```go
// 添加缓存头
c.Header("Cache-Control", "public, max-age=3600")
c.Header("ETag", calculateETag(data))

// 检查 If-None-Match
if match := c.GetHeader("If-None-Match"); match == etag {
    c.Status(304)
    return
}
```

## 内存优化

### 1. 对象池

```go
// 使用 sync.Pool
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func getBuffer() *bytes.Buffer {
    return bufferPool.Get().(*bytes.Buffer)
}

func putBuffer(buf *bytes.Buffer) {
    buf.Reset()
    bufferPool.Put(buf)
}
```

### 2. 流式处理

```go
// ❌ 不好：一次性加载所有数据
data, _ := ioutil.ReadAll(r.Body)
process(data)

// ✅ 好：流式处理
scanner := bufio.NewScanner(r.Body)
for scanner.Scan() {
    processLine(scanner.Bytes())
}
```

## 性能监控

### 1. pprof

```go
import (
    _ "net/http/pprof"
    "net/http"
)

func init() {
    // 启用 pprof
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()
}
```

### 2. 自定义指标

```go
// 性能指标收集
type Metrics struct {
    RequestDuration prometheus.HistogramVec
    DBQueryDuration prometheus.HistogramVec
}

func NewMetrics() *Metrics {
    return &Metrics{
        RequestDuration: *promauto.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "http_request_duration_seconds",
                Help: "HTTP request duration",
            },
            []string{"method", "path"},
        ),
        DBQueryDuration: *promauto.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "db_query_duration_seconds",
                Help: "Database query duration",
            },
            []string{"query_type"},
        ),
    }
}
```

## 优化清单

### 数据库

- [ ] 添加必要的索引
- [ ] 避免全表扫描
- [ ] 使用批量操作
- [ ] 避免 N+1 查询
- [ ] 使用连接池
- [ ] 定期分析慢查询

### 缓存

- [ ] 使用 Redis 缓存热点数据
- [ ] 设置合理的过期时间
- [ ] 使用缓存预热
- [ ] 避免缓存穿透
- [ ] 防止缓存雪崩

### 应用

- [ ] 使用 Goroutine 池
- [ ] 避免内存泄漏
- [ ] 使用对象池
- [ ] 优化 JSON 序列化
- [ ] 压缩 HTTP 响应

### 网络

- [ ] 启用 HTTP/2
- [ ] 使用 CDN
- [ ] 优化 TCP 参数
- [ ] 使用连接复用

## 性能测试

### 使用 Apache Bench

```bash
# 安装
sudo apt install apache2-utils

# 测试
ab -n 1000 -c 100 http://localhost:8080/api/v1/article/list

# 结果分析
# - Requests per second: 请求/秒
# - Time per request: 平均响应时间
# - Transfer rate: 传输速率
```

### 使用 wrk

```bash
# 安装
sudo apt install wrk

# 测试
wrk -t4 -c100 -d30s http://localhost:8080/api/v1/article/list

# Lua 脚本测试
wrk -t4 -c100 -d30s -s script.lua http://localhost:8080
```

## 最佳实践

### ✅ 应该做的

1. **先测量后优化**：不知道瓶颈在哪里不要盲目优化
2. **从数据库开始**：数据库通常是最大瓶颈
3. **使用缓存**：合理使用缓存能大幅提升性能
4. **批量操作**：减少数据库往返次数
5. **监控指标**：持续监控性能指标

### ❌ 不应该做的

1. **过早优化**：满足需求后再优化
2. **过度优化**：边际收益递减
3. **忽略可读性**：代码可维护性也很重要
4. **忘记测试**：优化后要测试正确性
5. **忽视监控**：没有监控就无法评估效果

## 下一步

性能优化完成后，让我们学习「[故障排查](./troubleshooting)」


