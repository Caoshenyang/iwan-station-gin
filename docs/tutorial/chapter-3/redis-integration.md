---
title: "Redis 缓存集成"
description: "Redis（Remote Dictionary Server）是一个开源的内存数据结构存储系统，可以用作数据库、缓存和消息代理。"
---

# Redis 缓存集成

## 📚 官方文档

- **Redis 官方文档**: https://redis.io/docs/
- **go-redis GitHub**: https://github.com/redis/go-redis
- **Redis 命令参考**: https://redis.io/commands/

---

## 一、Redis 简介

### 1.1 什么是 Redis？

Redis（Remote Dictionary Server）是一个开源的内存数据结构存储系统，可以用作数据库、缓存和消息代理。

**核心特性**：
- 内存存储，极快的读写速度
- 支持多种数据结构（String、Hash、List、Set、Sorted Set）
- 支持数据持久化（RDB、AOF）
- 支持主从复制、哨兵、集群
- 支持事务、发布/订阅
- 支持 Lua 脚本

### 1.2 使用场景

| 场景 | 说明 | 数据类型 |
|------|------|----------|
| 缓存 | 热点数据缓存，减轻数据库压力 | String |
| 会话存储 | 用户登录状态、Session | String |
| 计数器 | 文章阅读量、点赞数 | String |
| 排行榜 | 热门文章、用户积分 | Sorted Set |
| 分布式锁 | 防止并发操作 | String |
| 消息队列 | 简单的异步任务 | List |
| 限流 | API 调用频率限制 | String |
| 标签系统 | 文章标签管理 | Set |

---

## 二、安装与配置

### 2.1 安装 Redis

**Windows**：
```bash
# 使用 Chocolatey
choco install redis-64

# 或下载 MSBuild 版本
# https://github.com/microsoftarchive/redis/releases
```

**Linux/Mac**：
```bash
# 使用包管理器
brew install redis    # Mac
apt install redis-server  # Ubuntu

# 或编译安装
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make install
```

### 2.2 启动 Redis

```bash
# 启动 Redis 服务
redis-server

# 指定配置文件启动
redis-server /path/to/redis.conf

# 后台启动
redis-server --daemonize yes

# 检查运行状态
redis-cli ping
# 返回：PONG
```

### 2.3 Go 客户端安装

```bash
# 安装 go-redis
go get -u github.com/redis/go-redis/v9
```

### 2.4 连接配置

```go
package database

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// RedisConfig Redis 配置
type RedisConfig struct {
    Host        string
    Port        int
    Password    string
    DB          int           // 数据库编号 0-15
    PoolSize    int           // 连接池大小
    MinIdleConn int           // 最小空闲连接
    DialTimeout time.Duration // 连接超时
    ReadTimeout time.Duration // 读取超时
    WriteTimeout time.Duration // 写入超时
}

// Addr 返回 Redis 地址
func (c *RedisConfig) Addr() string {
    return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// InitRedis 初始化 Redis 客户端
func InitRedis(cfg *RedisConfig) (*redis.Client, error) {
    client := redis.NewClient(&redis.Options{
        Addr:         cfg.Addr(),
        Password:     cfg.Password,
        DB:           cfg.DB,
        PoolSize:     cfg.PoolSize,
        MinIdleConns: cfg.MinIdleConn,
        DialTimeout:  cfg.DialTimeout,
        ReadTimeout:  cfg.ReadTimeout,
        WriteTimeout: cfg.WriteTimeout,
        PoolTimeout:  4 * time.Second,
    })

    // 测试连接
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("redis 连接失败: %w", err)
    }

    return client, nil
}
```

**配置文件**：
```yaml
# config/config.yaml
redis:
  host: localhost
  port: 6379
  password: ""        # 默认无密码
  db: 0               # 使用 0 号数据库
  pool_size: 10       # 连接池大小
  min_idle_conn: 5    # 最小空闲连接
```

**Java 对比**：
```java
// Spring Boot + Jedis/Lettuce
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

---

## 三、基础操作

### 3.1 String 操作

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var ctx = context.Background()

// 设置值
func SetString(client *redis.Client, key, value string) error {
    return client.Set(ctx, key, value, 0).Err()
}

// 设置值（带过期时间）
func SetStringWithExpire(client *redis.Client, key, value string, expiration time.Duration) error {
    return client.Set(ctx, key, value, expiration).Err()
}

// 获取值
func GetString(client *redis.Client, key string) (string, error) {
    return client.Get(ctx, key).Result()
}

// 删除值
func DeleteKey(client *redis.Client, key string) error {
    return client.Del(ctx, key).Err()
}

// 检查键是否存在
func ExistsKey(client *redis.Client, key string) (bool, error) {
    result, err := client.Exists(ctx, key).Result()
    return result > 0, err
}

// 设置过期时间
func ExpireKey(client *redis.Client, key string, expiration time.Duration) error {
    return client.Expire(ctx, key, expiration).Err()
}

// 使用示例
func ExampleString() {
    client, _ := InitRedis(&RedisConfig{
        Host: "localhost",
        Port: 6379,
    })

    // 设置用户信息
    client.Set(ctx, "user:123", `{"id":123,"name":"iwan"}`, time.Hour)

    // 获取用户信息
    val, _ := client.Get(ctx, "user:123").Result()
    fmt.Println(val) // {"id":123,"name":"iwan"}

    // 删除
    client.Del(ctx, "user:123")
}
```

### 3.2 计数器操作

```go
// 自增（原子操作）
func Increment(client *redis.Client, key string) (int64, error) {
    return client.Incr(ctx, key).Result()
}

// 自增指定值
func IncrementBy(client *redis.Client, key string, value int64) (int64, error) {
    return client.IncrBy(ctx, key, value).Result()
}

// 自减
func Decrement(client *redis.Client, key string) (int64, error) {
    return client.Decr(ctx, key).Result()
}

// 使用示例：文章阅读量
func IncrementViewCount(client *redis.Client, articleID int64) error {
    key := fmt.Sprintf("article:%d:views", articleID)

    // 自增
    newCount, err := client.Incr(ctx, key).Result()
    if err != nil {
        return err
    }

    // 首次设置过期时间（7天）
    if newCount == 1 {
        client.Expire(ctx, key, 7*24*time.Hour)
    }

    // 异步同步到数据库
    go syncViewCountToDB(articleID, newCount)

    return nil
}
```

### 3.3 Hash 操作

```go
// Hash 设置字段
func HashSet(client *redis.Client, key, field string, value interface{}) error {
    return client.HSet(ctx, key, field, value).Err()
}

// Hash 获取字段
func HashGet(client *redis.Client, key, field string) (string, error) {
    return client.HGet(ctx, key, field).Result()
}

// Hash 获取所有字段
func HashGetAll(client *redis.Client, key string) (map[string]string, error) {
    return client.HGetAll(ctx, key).Result()
}

// Hash 删除字段
func HashDelete(client *redis.Client, key string, fields ...string) error {
    return client.HDel(ctx, key, fields...).Err()
}

// 使用示例：用户对象缓存
func CacheUser(client *redis.Client, user *User) error {
    key := fmt.Sprintf("user:%d", user.ID)

    // 方式1：HMSET 一次性设置多个字段
    userMap := map[string]interface{}{
        "id":       user.ID,
        "username": user.Username,
        "email":    user.Email,
        "status":   user.Status,
    }
    return client.HSet(ctx, key, userMap).Err()
}

func GetUserFromCache(client *redis.Client, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)

    // 获取所有字段
    result, err := client.HGetAll(ctx, key).Result()
    if err != nil {
        return nil, err
    }

    if len(result) == 0 {
        return nil, redis.Nil // 缓存未命中
    }

    user := &User{
        ID:       parseInt(result["id"]),
        Username: result["username"],
        Email:    result["email"],
        Status:   parseInt(result["status"]),
    }

    return user, nil
}
```

### 3.4 List 操作

```go
// 从左侧推入
func LPush(client *redis.Client, key string, values ...interface{}) error {
    return client.LPush(ctx, key, values...).Err()
}

// 从右侧推入
func RPush(client *redis.Client, key string, values ...interface{}) error {
    return client.RPush(ctx, key, values...).Err()
}

// 从左侧弹出
func LPop(client *redis.Client, key string) (string, error) {
    return client.LPop(ctx, key).Result()
}

// 获取列表范围
func LRange(client *redis.Client, key string, start, stop int64) ([]string, error) {
    return client.LRange(ctx, key, start, stop).Result()
}

// 使用示例：消息队列
func EnqueueTask(client *redis.Client, taskID string) error {
    return client.RPush(ctx, "queue:tasks", taskID).Err()
}

func DequeueTask(client *redis.Client) (string, error) {
    return client.LPop(ctx, "queue:tasks").Result()
}
```

### 3.5 Set 操作

```go
// 添加元素
func SAdd(client *redis.Client, key string, members ...interface{}) error {
    return client.SAdd(ctx, key, members...).Err()
}

// 获取所有元素
func SMembers(client *redis.Client, key string) ([]string, error) {
    return client.SMembers(ctx, key).Result()
}

// 检查元素是否存在
func SIsMember(client *redis.Client, key string, member interface{}) (bool, error) {
    return client.SIsMember(ctx, key, member).Result()
}

// 集合交集
func SInter(client *redis.Client, keys ...string) ([]string, error) {
    return client.SInter(ctx, keys...).Result()
}

// 使用示例：文章标签
func AddArticleTags(client *redis.Client, articleID int64, tags []string) error {
    key := fmt.Sprintf("article:%d:tags", articleID)
    return client.SAdd(ctx, key, tags).Err()
}

func GetArticleTags(client *redis.Client, articleID int64) ([]string, error) {
    key := fmt.Sprintf("article:%d:tags", articleID)
    return client.SMembers(ctx, key).Result()
}

// 查找具有相同标签的文章
func FindArticlesByTags(client *redis.Client, tags []string) ([]string, error) {
    // 构建所有标签文章集合的键
    keys := make([]string, len(tags))
    for i, tag := range tags {
        keys[i] = fmt.Sprintf("tag:%s:articles", tag)
    }
    // 求交集：同时包含所有标签的文章
    return client.SInter(ctx, keys...).Result()
}
```

### 3.6 Sorted Set 操作

```go
// 添加成员
func ZAdd(client *redis.Client, key string, score float64, member string) error {
    return client.ZAdd(ctx, key, redis.Z{
        Score:  score,
        Member: member,
    }).Err()
}

// 获取排名范围（升序）
func ZRange(client *redis.Client, key string, start, stop int64) ([]string, error) {
    return client.ZRange(ctx, key, start, stop).Result()
}

// 获取排名范围（降序）
func ZRevRange(client *redis.Client, key string, start, stop int64) ([]string, error) {
    return client.ZRevRange(ctx, key, start, stop).Result()
}

// 获取分数
func ZScore(client *redis.Client, key, member string) (float64, error) {
    return client.ZScore(ctx, key, member).Result()
}

// 增加分数
func ZIncrBy(client *redis.Client, key string, increment float64, member string) error {
    return client.ZIncrBy(ctx, key, increment, member).Err()
}

// 使用示例：热门文章排行榜
func IncrementArticleScore(client *redis.Client, articleID int64, score float64) error {
    member := fmt.Sprintf("%d", articleID)
    return client.ZIncrBy(ctx, "ranking:articles:hot", score, member).Err()
}

func GetTopArticles(client *redis.Client, limit int) ([]int64, error) {
    // 获取分数最高的前 N 篇文章
    results, err := client.ZRevRange(ctx, "ranking:articles:hot", 0, int64(limit-1)).Result()
    if err != nil {
        return nil, err
    }

    articleIDs := make([]int64, len(results))
    for i, id := range results {
        articleIDs[i] = parseInt(id)
    }
    return articleIDs, nil
}
```

---

## 四、缓存模式

### 4.1 Cache-Aside（旁路缓存）

```go
// 缓存-数据库分离模式
func GetUserWithCache(db *gorm.DB, rdb *redis.Client, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)

    // 1. 先查缓存
    val, err := rdb.Get(ctx, key).Result()
    if err == nil {
        // 缓存命中，反序列化
        var user User
        if err := json.Unmarshal([]byte(val), &user); err == nil {
            return &user, nil
        }
    }

    // 2. 缓存未命中，查数据库
    var user User
    if err := db.First(&user, userID).Error; err != nil {
        return nil, err
    }

    // 3. 写入缓存
    data, _ := json.Marshal(user)
    rdb.Set(ctx, key, data, time.Hour) // 缓存 1 小时

    return &user, nil
}
```

### 4.2 Read-Through / Write-Through

```go
// Write-Through：写缓存时同步写数据库
func UpdateUserWithCache(db *gorm.DB, rdb *redis.Client, user *User) error {
    // 1. 更新数据库
    if err := db.Save(user).Error; err != nil {
        return err
    }

    // 2. 更新缓存
    key := fmt.Sprintf("user:%d", user.ID)
    data, _ := json.Marshal(user)
    return rdb.Set(ctx, key, data, time.Hour).Err()
}
```

### 4.3 Write-Behind（异步写）

```go
// Write-Behind：先写缓存，异步同步到数据库
func UpdateUserAsync(db *gorm.DB, rdb *redis.Client, user *User) error {
    key := fmt.Sprintf("user:%d", user.ID)

    // 1. 立即更新缓存
    data, _ := json.Marshal(user)
    if err := rdb.Set(ctx, key, data, time.Hour).Err(); err != nil {
        return err
    }

    // 2. 异步更新数据库
    go func() {
        // 可以使用队列批量处理
        db.Save(user)
    }()

    return nil
}
```

---

## 五、缓存问题与解决方案

### 5.1 缓存穿透

**问题**：查询不存在的数据，每次都穿过缓存查数据库

**解决方案：布隆过滤器 + 缓存空值**

```go
import "github.com/bits-and-blooms/bloom/v3"

var filter = bloom.NewWithEstimates(1000000, 0.01)

// 初始化时加载所有有效 key 到布隆过滤器
func InitBloomFilter(db *gorm.DB) {
    var userIDs []int64
    db.Model(&User{}).Pluck("id", &userIDs)

    for _, id := range userIDs {
        filter.AddString(fmt.Sprintf("user:%d", id))
    }
}

// 查询前先检查
func GetUserWithBloom(db *gorm.DB, rdb *redis.Client, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)

    // 布隆过滤器检查
    if !filter.TestString(key) {
        return nil, ErrUserNotFound // 不存在，直接返回
    }

    // 后续查询逻辑...
}

// 缓存空值（短时间）
func GetUserCacheNull(db *gorm.DB, rdb *redis.Client, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)

    val, err := rdb.Get(ctx, key).Result()
    if err == nil {
        if val == "NULL" {
            return nil, ErrUserNotFound // 空值缓存
        }
        // 正常解析...
    }

    // 查询数据库
    var user User
    err = db.First(&user, userID).Error
    if err != nil {
        // 缓存空值，5 分钟过期
        if errors.Is(err, gorm.ErrRecordNotFound) {
            rdb.Set(ctx, key, "NULL", 5*time.Minute)
        }
        return nil, err
    }

    // 正常缓存...
}
```

### 5.2 缓存击穿

**问题**：热点 key 过期，大量请求打到数据库

**解决方案：互斥锁**

```go
import "github.com/go-redsync/redsync/v4"

func GetUserWithLock(db *gorm.DB, rdb *redis.Client, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)

    // 先查缓存
    val, err := rdb.Get(ctx, key).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(val), &user)
        return &user, nil
    }

    // 获取分布式锁
    mutex := redsync.New(rdb).NewMutex("lock:" + key)
    if err := mutex.Lock(); err != nil {
        return nil, err
    }
    defer mutex.Unlock()

    // 再次检查缓存（双重检查）
    val, err = rdb.Get(ctx, key).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(val), &user)
        return &user, nil
    }

    // 查询数据库
    var user User
    if err := db.First(&user, userID).Error; err != nil {
        return nil, err
    }

    // 写缓存
    data, _ := json.Marshal(user)
    rdb.Set(ctx, key, data, time.Hour)

    return &user, nil
}
```

### 5.3 缓存雪崩

**问题**：大量 key 同时过期，数据库压力激增

**解决方案：随机过期时间**

```go
// 设置带随机偏移的过期时间
func SetWithRandomExpire(rdb *redis.Client, key string, value interface{}, baseDuration time.Duration) error {
    // 基础时间 + 随机 0-30% 偏移
    randomOffset := time.Duration(rand.Int63n(int64(baseDuration) * 3 / 10))
    expiration := baseDuration + randomOffset

    return rdb.Set(ctx, key, value, expiration).Err()
}

// 使用示例
SetWithRandomExpire(rdb, "user:123", userData, time.Hour)
// 实际过期时间：1小时 + 0-18分钟随机
```

---

## 六、缓存封装

### 6.1 缓存接口

```go
package cache

import (
    "context"
    "encoding/json"
    "time"

    "github.com/redis/go-redis/v9"
)

// Cache 缓存接口
type Cache interface {
    Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
    Get(ctx context.Context, key string, dest interface{}) error
    Delete(ctx context.Context, keys ...string) error
    Exists(ctx context.Context, key string) (bool, error)
}

// RedisCache Redis 实现
type RedisCache struct {
    client *redis.Client
}

func NewRedisCache(client *redis.Client) *RedisCache {
    return &RedisCache{client: client}
}

func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.client.Set(ctx, key, data, expiration).Err()
}

func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
    val, err := c.client.Get(ctx, key).Result()
    if err != nil {
        return err
    }
    return json.Unmarshal([]byte(val), dest)
}

func (c *RedisCache) Delete(ctx context.Context, keys ...string) error {
    if len(keys) == 0 {
        return nil
    }
    return c.client.Del(ctx, keys...).Err()
}

func (c *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
    result, err := c.client.Exists(ctx, key).Result()
    return result > 0, err
}
```

### 6.2 通用缓存服务

```go
type CacheService struct {
    cache  Cache
    db     *gorm.DB
}

func NewCacheService(cache Cache, db *gorm.DB) *CacheService {
    return &CacheService{cache: cache, db: db}
}

// GetOrFetch 缓存未命中时从数据源获取
func (s *CacheService) GetOrFetch(ctx context.Context, key string, dest interface{}, fetch func() error, expiration time.Duration) error {
    // 先查缓存
    err := s.cache.Get(ctx, key, dest)
    if err == nil {
        return nil // 缓存命中
    }

    if err != redis.Nil {
        // 非缓存未命中错误，返回
        return err
    }

    // 缓存未命中，执行 fetch 函数获取数据
    if err := fetch(); err != nil {
        return err
    }

    // 写入缓存
    return s.cache.Set(ctx, key, dest, expiration)
}

// 使用示例
func (s *CacheService) GetUser(ctx context.Context, userID int64) (*User, error) {
    var user User
    key := fmt.Sprintf("user:%d", userID)

    err := s.GetOrFetch(ctx, key, &user, func() error {
        // 从数据库获取
        return s.db.First(&user, userID).Error
    }, time.Hour)

    return &user, err
}
```

---

## 七、分布式锁

### 7.1 简单分布式锁

```go
// ObtainLock 获取锁
func ObtainLock(client *redis.Client, key string, expiration time.Duration) (bool, error) {
    return client.SetNX(ctx, "lock:"+key, "1", expiration).Result()
}

// ReleaseLock 释放锁
func ReleaseLock(client *redis.Client, key string) error {
    return client.Del(ctx, "lock:"+key).Err()
}

// 使用示例
func ProcessTask(client *redis.Client, taskID string) error {
    // 获取锁（30秒过期）
    obtained, err := ObtainLock(client, taskID, 30*time.Second)
    if err != nil {
        return err
    }
    if !obtained {
        return ErrLockFailed // 锁已被占用
    }
    defer ReleaseLock(client, taskID)

    // 执行任务
    // ...
    return nil
}
```

### 7.2 Redisson 风格锁（更可靠）

```go
import (
    "github.com/go-redsync/redsync/v4"
    "github.com/redis/go-redis/v9"
)

func DistributedLockExample(client *redis.Client) error {
    // 创建 redsync 实例
    pool := redsync.New(goredis.NewPool(client))
    mutexname := "my-global-mutex"
    mutex := pool.NewMutex(mutexname,
        // 锁过期时间
        redsync.WithExpiry(10*time.Second),
        // 重试次数
        redsync.WithTries(5),
        // 重试间隔
        redsync.WithRetryDelay(500*time.Millisecond),
    )

    // 获取锁
    if err := mutex.Lock(); err != nil {
        return err
    }

    // 执行业务逻辑
    // ...

    // 释放锁
    if ok, err := mutex.Unlock(); !ok || err != nil {
        return err
    }

    return nil
}
```

---

## 八、性能优化

### 8.1 Pipeline（管道）

```go
// Pipeline 批量执行命令
func PipelineExample(client *redis.Client) error {
    pipe := client.Pipeline()

    // 批量设置
    for i := 0; i < 100; i++ {
        pipe.Set(ctx, fmt.Sprintf("key:%d", i), fmt.Sprintf("value:%d", i), 0)
    }

    // 一次性执行
    cmds, err := pipe.Exec(ctx)
    if err != nil {
        return err
    }

    // 检查结果
    for _, cmd := range cmds {
        if cmd.Err() != nil {
            log.Printf("命令执行失败: %v", cmd.Err())
        }
    }

    return nil
}
```

### 8.2 批量操作

```go
// MGet 批量获取
func MGetExample(client *redis.Client, keys []string) ([]interface{}, error) {
    return client.MGet(ctx, keys...).Result()
}

// MSet 批量设置
func MSetExample(client *redis.Client, kv map[string]interface{}) error {
    return client.MSet(ctx, kv).Err()
}
```

---

## 九、最佳实践

### 9.1 Key 命名规范

```go
// ✅ 好的命名
"user:123"                    // 用户信息
"user:123:session"            // 用户会话
"article:456:views"           // 文章阅读量
"cache:api:/api/users:list"   // API 响应缓存
"lock:order:789"              // 订单锁

// ❌ 不好的命名
"user123"                     // 缺少分隔符
"u-123"                       // 前缀不清晰
"data"                        // 语义不清
```

### 9.2 过期时间策略

```go
// 热点数据：较长过期时间
cache.Set("hot_articles", data, 1*time.Hour)

// 实时数据：较短过期时间
cache.Set("user_session", session, 30*time.Minute)

// 静态数据：很长过期时间
cache.Set("system_config", config, 24*time.Hour)
```

### 9.3 缓存预热

```go
// 应用启动时预热缓存
func WarmupCache(db *gorm.DB, cache Cache) {
    // 热点文章
    var articles []Article
    db.Where("status = 1").Order("view_count DESC").Limit(100).Find(&articles)

    for _, article := range articles {
        key := fmt.Sprintf("article:%d", article.ID)
        cache.Set(context.Background(), key, article, time.Hour)
    }

    // 系统配置
    var configs []SystemConfig
    db.Find(&configs)
    for _, cfg := range configs {
        key := fmt.Sprintf("config:%s", cfg.Key)
        cache.Set(context.Background(), key, cfg.Value, 24*time.Hour)
    }
}
```

---

## 十、练习任务

1. **基础任务**：实现文章阅读量缓存，定时同步到数据库
2. **进阶任务**：实现热门文章排行榜（Sorted Set）
3. **高级任务**：实现文章详情的缓存（Cache-Aside 模式），解决缓存穿透问题

---

## 课后阅读

- [Redis 官方文档 - 数据类型](https://redis.io/docs/data-types/)
- [go-redis 官方文档](https://redis.uptrace.dev/)
- [Redis 缓存设计模式](https://redis.io/docs/manual/patterns/)

