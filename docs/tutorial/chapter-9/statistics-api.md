---
title: "数据看板与统计接口"
description: "数据看板（Dashboard）是管理系统的核心功能，通过可视化图表展示系统关键指标，帮助管理者快速了解业务状况。"
---

# 数据看板与统计接口

::: tip 💡 怎么读这页
这页设计面向管理后台首页的统计接口。建议先看接口列表和返回格式，再深入查询实现。
:::

## 页面导航

[[toc]]

## 📚 相关文档

- **GORM 聚合查询**: https://gorm.io/docs/aggregation.html
- **Redis 最佳实践**: [Redis 缓存集成](./redis-cache)
- **图表库**: ECharts (https://echarts.apache.org/)

---

## 一、数据看板概述

### 1.1 什么是数据看板？

数据看板（Dashboard）是管理系统的核心功能，通过可视化图表展示系统关键指标，帮助管理者快速了解业务状况。

**核心价值**：
- 实时监控业务数据
- 快速发现异常和趋势
- 辅助决策分析
- 提升用户体验

### 1.2 常见统计指标

| 类别 | 指标 | 说明 |
|------|------|------|
| 用户统计 | 总用户数、今日新增、活跃用户 | 用户增长趋势 |
| 内容统计 | 文章总数、今日发布、待审核 | 内容生产情况 |
| 互动统计 | 阅读量、点赞数、评论数 | 用户参与度 |
| 系统统计 | 在线人数、请求量、响应时间 | 系统运行状态 |

---

## 二、统计接口设计

### 2.1 接口规范

```go
// 统计数据结构
type DashboardStats struct {
    // 用户统计
    UserStats UserStats `json:"user_stats"`

    // 内容统计
    ContentStats ContentStats `json:"content_stats"`

    // 互动统计
    InteractionStats InteractionStats `json:"interaction_stats"`

    // 系统统计
    SystemStats SystemStats `json:"system_stats"`

    // 趋势数据（最近7天）
    TrendData TrendData `json:"trend_data"`
}

type UserStats struct {
    TotalUsers      int64 `json:"total_users"`       // 总用户数
    TodayNewUsers   int64 `json:"today_new_users"`   // 今日新增
    ActiveUsers     int64 `json:"active_users"`      // 活跃用户（7天内）
    MonthlyGrowth   float64 `json:"monthly_growth"`  // 月增长率
}

type ContentStats struct {
    TotalArticles   int64 `json:"total_articles"`    // 文章总数
    PublishedCount  int64 `json:"published_count"`    // 已发布
    DraftCount      int64 `json:"draft_count"`       // 草稿数
    TodayPublished  int64 `json:"today_published"`   // 今日发布
    CategoryCount   int64 `json:"category_count"`    // 分类数
    TagCount        int64 `json:"tag_count"`         // 标签数
}

type InteractionStats struct {
    TotalViews      int64 `json:"total_views"`       // 总阅读量
    TodayViews      int64 `json:"today_views"`       // 今日阅读
    TotalLikes      int64 `json:"total_likes"`       // 总点赞数
    TotalComments   int64 `json:"total_comments"`    // 总评论数
}

type SystemStats struct {
    OnlineUsers     int64 `json:"online_users"`      // 在线用户
    TodayRequests   int64 `json:"today_requests"`    // 今日请求数
    AvgResponseTime int64 `json:"avg_response_time"` // 平均响应时间(ms)
}

type TrendData struct {
    Dates  []string `json:"dates"`   // 日期列表
    Users  []int64  `json:"users"`   // 用户增长
    Articles []int64 `json:"articles"` // 文章发布
    Views  []int64  `json:"views"`   // 阅读量
}
```

### 2.2 统计 Service

```go
package service

import (
    "context"
    "fmt"
    "time"

    "iwan-station-gin/internal/model"
    "iwan-station-gin/internal/repository"

    "github.com/redis/go-redis/v9"
    "go.uber.org/zap"
    "gorm.io/gorm"
)

type StatsService struct {
    repos *repository.Repositories
    rdb   *redis.Client
    db    *gorm.DB
    log   *zap.Logger
}

func NewStatsService(repos *repository.Repositories, rdb *redis.Client, db *gorm.DB, log *zap.Logger) *StatsService {
    return &StatsService{
        repos: repos,
        rdb:   rdb,
        db:    db,
        log:   log,
    }
}

// GetDashboardStats 获取仪表盘统计数据
func (s *StatsService) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
    stats := &DashboardStats{}

    // 并发获取各类统计数据
    errChan := make(chan error, 4)

    go func() {
        stats.UserStats = s.getUserStats(ctx)
        errChan <- nil
    }()

    go func() {
        stats.ContentStats = s.getContentStats(ctx)
        errChan <- nil
    }()

    go func() {
        stats.InteractionStats = s.getInteractionStats(ctx)
        errChan <- nil
    }()

    go func() {
        stats.SystemStats = s.getSystemStats(ctx)
        errChan <- nil
    }()

    // 等待所有 goroutine 完成
    for i := 0; i < 4; i++ {
        if err := <-errChan; err != nil {
            s.log.Error("获取统计数据失败", zap.Error(err))
        }
    }

    // 获取趋势数据
    stats.TrendData = s.getTrendData(ctx, 7)

    return stats, nil
}
```

---

## 三、用户统计实现

### 3.1 基础统计

```go
// getUserStats 获取用户统计
func (s *StatsService) getUserStats(ctx context.Context) UserStats {
    stats := UserStats{}

    // 总用户数
    s.db.WithContext(ctx).Model(&model.User{}).Count(&stats.TotalUsers)

    // 今日新增用户
    today := time.Now().Format("2006-01-02")
    s.db.WithContext(ctx).
        Model(&model.User{}).
        Where("DATE(created_at) = ?", today).
        Count(&stats.TodayNewUsers)

    // 活跃用户（7天内有登录）
    sevenDaysAgo := time.Now().AddDate(0, 0, -7)
    s.db.WithContext(ctx).
        Model(&model.User{}).
        Where("updated_at > ?", sevenDaysAgo).
        Count(&stats.ActiveUsers)

    // 月增长率
    stats.MonthlyGrowth = s.calculateUserGrowth(ctx)

    return stats
}

// calculateUserGrowth 计算月增长率
func (s *StatsService) calculateUserGrowth(ctx context.Context) float64 {
    now := time.Now()
    monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
    lastMonthStart := monthStart.AddDate(0, -1, 0)

    var thisMonthCount, lastMonthCount int64

    s.db.WithContext(ctx).
        Model(&model.User{}).
        Where("created_at >= ?", monthStart).
        Count(&thisMonthCount)

    s.db.WithContext(ctx).
        Model(&model.User{}).
        Where("created_at >= ? AND created_at < ?", lastMonthStart, monthStart).
        Count(&lastMonthCount)

    if lastMonthCount == 0 {
        return 0
    }

    growth := float64(thisMonthCount-lastMonthCount) / float64(lastMonthCount) * 100
    return growth
}
```

### 3.2 用户活跃度统计

```go
// UserActivity 用户活跃度统计
type UserActivity struct {
    Date       string `json:"date"`
    NewUsers   int64  `json:"new_users"`
    ActiveUsers int64 `json:"active_users"`
}

// GetUserActivityTrend 获取用户活跃度趋势
func (s *StatsService) GetUserActivityTrend(ctx context.Context, days int) ([]UserActivity, error) {
    var activities []UserActivity

    for i := days - 1; i >= 0; i-- {
        date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")

        activity := UserActivity{Date: date}

        // 当日新增用户
        s.db.WithContext(ctx).
            Model(&model.User{}).
            Where("DATE(created_at) = ?", date).
            Count(&activity.NewUsers)

        // 当日活跃用户（有更新记录的用户）
        s.db.WithContext(ctx).
            Model(&model.User{}).
            Where("DATE(updated_at) = ?", date).
            Count(&activity.ActiveUsers)

        activities = append(activities, activity)
    }

    return activities, nil
}
```

---

## 四、内容统计实现

### 4.1 文章统计

```go
// getContentStats 获取内容统计
func (s *StatsService) getContentStats(ctx context.Context) ContentStats {
    stats := ContentStats{}

    // 文章总数
    s.db.WithContext(ctx).Model(&model.Article{}).Count(&stats.TotalArticles)

    // 已发布文章
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Where("status = ?", 1).
        Count(&stats.PublishedCount)

    // 草稿数
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Where("status = ?", 0).
        Count(&stats.DraftCount)

    // 今日发布
    today := time.Now().Format("2006-01-02")
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Where("status = ? AND DATE(created_at) = ?", 1, today).
        Count(&stats.TodayPublished)

    // 分类数
    s.db.WithContext(ctx).Model(&model.Category{}).Count(&stats.CategoryCount)

    // 标签数
    s.db.WithContext(ctx).Model(&model.Tag{}).Count(&stats.TagCount)

    return stats
}
```

### 4.2 分类文章分布

```go
// CategoryArticleCount 分类文章统计
type CategoryArticleCount struct {
    CategoryID   uint64 `json:"category_id"`
    CategoryName string `json:"category_name"`
    ArticleCount int64  `json:"article_count"`
}

// GetCategoryStats 获取分类文章分布
func (s *StatsService) GetCategoryStats(ctx context.Context) ([]CategoryArticleCount, error) {
    var results []CategoryArticleCount

    err := s.db.WithContext(ctx).
        Table("categories").
        Select("categories.id as category_id, categories.name as category_name, COUNT(articles.id) as article_count").
        Joins("LEFT JOIN articles ON articles.category_id = categories.id").
        Group("categories.id").
        Order("article_count DESC").
        Scan(&results).Error

    return results, err
}
```

### 4.3 热门文章统计

```go
// HotArticle 热门文章
type HotArticle struct {
    ID         uint64 `json:"id"`
    Title      string `json:"title"`
    ViewCount  int64  `json:"view_count"`
    LikeCount  int    `json:"like_count"`
    CommentCount int   `json:"comment_count"`
}

// GetHotArticles 获取热门文章（基于阅读量）
func (s *StatsService) GetHotArticles(ctx context.Context, limit int) ([]HotArticle, error) {
    var articles []HotArticle

    // 从 Redis Sorted Set 获取
    articleIDs, err := s.rdb.ZRevRange(ctx, "ranking:articles:hot", 0, int64(limit-1)).Result()
    if err == nil && len(articleIDs) > 0 {
        // Redis 有数据，从数据库获取详细信息
        for _, id := range articleIDs {
            var article HotArticle
            s.db.WithContext(ctx).
                Table("articles").
                Select("id, title, view_count, like_count, comment_count").
                Where("id = ?", id).
                First(&article)
            articles = append(articles, article)
        }
        return articles, nil
    }

    // Redis 无数据，从数据库查询
    err = s.db.WithContext(ctx).
        Table("articles").
        Select("id, title, view_count, like_count, comment_count").
        Where("status = ?", 1).
        Order("view_count DESC").
        Limit(limit).
        Scan(&articles).Error

    return articles, err
}
```

---

## 五、互动统计实现

### 5.1 阅读量统计

```go
// getInteractionStats 获取互动统计
func (s *StatsService) getInteractionStats(ctx context.Context) InteractionStats {
    stats := InteractionStats{}

    // 总阅读量（从数据库）
    var totalViews int64
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Select("COALESCE(SUM(view_count), 0)").
        Scan(&totalViews)
    stats.TotalViews = totalViews

    // 今日阅读量（从 Redis 计数器）
    today := time.Now().Format("2006-01-02")
    todayViews, _ := s.rdb.Get(ctx, "stats:views:"+today).Int64()
    stats.TodayViews = todayViews

    // 总点赞数
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Select("COALESCE(SUM(like_count), 0)").
        Scan(&stats.TotalLikes)

    // 总评论数
    s.db.WithContext(ctx).
        Model(&model.Article{}).
        Select("COALESCE(SUM(comment_count), 0)").
        Scan(&stats.TotalComments)

    return stats
}

// IncrementView 增加文章阅读量
func (s *StatsService) IncrementView(ctx context.Context, articleID int64) error {
    // 1. Redis 计数器（今日统计）
    today := time.Now().Format("2006-01-02")
    todayKey := fmt.Sprintf("stats:views:%s", today)
    s.rdb.Incr(ctx, todayKey)
    s.rdb.Expire(ctx, todayKey, 48*time.Hour) // 保留2天

    // 2. 文章阅读量
    articleKey := fmt.Sprintf("article:%d:views", articleID)
    newCount, err := s.rdb.Incr(ctx, articleKey).Result()
    if err != nil {
        return err
    }

    // 首次设置过期时间
    if newCount == 1 {
        s.rdb.Expire(ctx, articleKey, 7*24*time.Hour)
    }

    // 3. 更新热门文章排行
    s.rdb.ZIncrBy(ctx, "ranking:articles:hot", 1, fmt.Sprintf("%d", articleID))

    // 4. 异步同步到数据库
    go func() {
        // 使用定时任务批量同步，避免频繁写库
        // 或使用消息队列处理
    }()

    return nil
}
```

### 5.2 互动趋势

```go
// InteractionTrend 互动趋势
type InteractionTrend struct {
    Date    string `json:"date"`
    Views   int64  `json:"views"`
    Likes   int64  `json:"likes"`
    Comments int64 `json:"comments"`
}

// GetInteractionTrend 获取互动趋势
func (s *StatsService) GetInteractionTrend(ctx context.Context, days int) ([]InteractionTrend, error) {
    var trends []InteractionTrend

    for i := days - 1; i >= 0; i-- {
        date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")

        trend := InteractionTrend{Date: date}

        // 从 Redis 获取当日统计
        views, _ := s.rdb.Get(ctx, "stats:views:"+date).Int64()
        trend.Views = views

        likes, _ := s.rdb.Get(ctx, "stats:likes:"+date).Int64()
        trend.Likes = likes

        comments, _ := s.rdb.Get(ctx, "stats:comments:"+date).Int64()
        trend.Comments = comments

        trends = append(trends, trend)
    }

    return trends, nil
}
```

---

## 六、系统统计实现

### 6.1 在线用户统计

```go
// getSystemStats 获取系统统计
func (s *StatsService) getSystemStats(ctx context.Context) SystemStats {
    stats := SystemStats{}

    // 在线用户（15分钟内有活动）
    onlineKey := "online:users"
    count, _ := s.rdb.PFCount(ctx, onlineKey).Result()
    stats.OnlineUsers = count

    // 今日请求数
    today := time.Now().Format("2006-01-02")
    requests, _ := s.rdb.Get(ctx, "stats:requests:"+today).Int64()
    stats.TodayRequests = requests

    // 平均响应时间（从 Redis）
    avgTime, _ := s.rdb.Get(ctx, "stats:avg_response_time").Int64()
    stats.AvgResponseTime = avgTime

    return stats
}

// RecordOnline 记录用户在线
func (s *StatsService) RecordOnline(ctx context.Context, userID int64) {
    onlineKey := "online:users"
    userKey := fmt.Sprintf("user:%d:last_active", userID)

    // 使用 HyperLogLog 统计（内存占用小）
    s.rdb.PFAdd(ctx, onlineKey, userID)
    s.rdb.Expire(ctx, onlineKey, 15*time.Minute)

    // 记录用户最后活跃时间
    s.rdb.Set(ctx, userKey, time.Now().Unix(), 15*time.Minute)
}

// RecordRequest 记录请求
func (s *StatsService) RecordRequest(ctx context.Context, latency int64) {
    today := time.Now().Format("2006-01-02")

    // 请求计数
    s.rdb.Incr(ctx, "stats:requests:"+today)
    s.rdb.Expire(ctx, "stats:requests:"+today, 48*time.Hour)

    // 响应时间（使用简单移动平均）
    avgKey := "stats:avg_response_time"
    currentAvg, _ := s.rdb.Get(ctx, avgKey).Int64()
    if currentAvg == 0 {
        currentAvg = latency
    } else {
        // EMA: 新平均值 = 0.1 * 新值 + 0.9 * 旧平均值
        currentAvg = (latency + currentAvg*9) / 10
    }
    s.rdb.Set(ctx, avgKey, currentAvg, 5*time.Minute)
}
```

---

## 七、趋势数据实现

### 7.1 综合趋势

```go
// getTrendData 获取趋势数据
func (s *StatsService) getTrendData(ctx context.Context, days int) TrendData {
    trend := TrendData{
        Dates:    make([]string, days),
        Users:    make([]int64, days),
        Articles: make([]int64, days),
        Views:    make([]int64, days),
    }

    for i := days - 1; i >= 0; i-- {
        date := time.Now().AddDate(0, 0, -i)
        dateStr := date.Format("2006-01-02")
        idx := days - 1 - i

        trend.Dates[idx] = dateStr

        // 新增用户
        s.db.WithContext(ctx).
            Model(&model.User{}).
            Where("DATE(created_at) = ?", dateStr).
            Count(&trend.Users[idx])

        // 发布文章
        s.db.WithContext(ctx).
            Model(&model.Article{}).
            Where("status = 1 AND DATE(created_at) = ?", dateStr).
            Count(&trend.Articles[idx])

        // 阅读量（从 Redis）
        views, _ := s.rdb.Get(ctx, "stats:views:"+dateStr).Int64()
        trend.Views[idx] = views
    }

    return trend
}
```

### 7.2 实时统计（WebSocket 推送）

```go
// RealtimeStats 实时统计数据
type RealtimeStats struct {
    OnlineUsers  int64 `json:"online_users"`
    TodayViews   int64 `json:"today_views"`
    RequestCount int64 `json:"request_count"`
    Timestamp    int64 `json:"timestamp"`
}

// PublishRealtimeStats 发布实时统计（用于 WebSocket 推送）
func (s *StatsService) PublishRealtimeStats(ctx context.Context) error {
    stats := RealtimeStats{
        OnlineUsers: s.getOnlineUserCount(ctx),
        TodayViews:  s.getTodayViews(ctx),
        Timestamp:   time.Now().Unix(),
    }

    data, err := json.Marshal(stats)
    if err != nil {
        return err
    }

    // 发布到 Redis 频道
    return s.rdb.Publish(ctx, "stats:realtime", data).Err()
}

// 订阅实时统计
func SubscribeRealtimeStats(ctx context.Context) <-chan *RealtimeStats {
    pubsub := rdb.Subscribe(ctx, "stats:realtime")
    ch := make(chan *RealtimeStats)

    go func() {
        defer close(ch)
        defer pubsub.Close()

        for {
            msg, err := pubsub.ReceiveMessage(ctx)
            if err != nil {
                return
            }

            var stats RealtimeStats
            if err := json.Unmarshal([]byte(msg.Payload), &stats); err != nil {
                continue
            }

            select {
            case ch <- &stats:
            case <-ctx.Done():
                return
            }
        }
    }()

    return ch
}
```

---

## 八、缓存策略

### 8.1 多级缓存

```go
// GetDashboardStatsWithCache 带缓存的统计数据获取
func (s *StatsService) GetDashboardStatsWithCache(ctx context.Context) (*DashboardStats, error) {
    cacheKey := "dashboard:stats"

    // 1. 先查 Redis 缓存（5分钟）
    cached, err := s.rdb.Get(ctx, cacheKey).Result()
    if err == nil {
        var stats DashboardStats
        if err := json.Unmarshal([]byte(cached), &stats); err == nil {
            return &stats, nil
        }
    }

    // 2. 缓存未命中，查询数据库
    stats, err := s.GetDashboardStats(ctx)
    if err != nil {
        return nil, err
    }

    // 3. 写入缓存
    data, _ := json.Marshal(stats)
    s.rdb.Set(ctx, cacheKey, data, 5*time.Minute)

    return stats, nil
}
```

### 8.2 定时同步策略

```go
// SyncStatsToDB 定时将 Redis 统计数据同步到数据库
func (s *StatsService) SyncStatsToDB(ctx context.Context) {
    ticker := time.NewTicker(10 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            s.syncViewCounts(ctx)
            s.syncOnlineStats(ctx)
        case <-ctx.Done():
            return
        }
    }
}

// syncViewCounts 同步阅读量到数据库
func (s *StatsService) syncViewCounts(ctx context.Context) {
    // 获取所有文章的阅读量缓存
    keys, err := s.rdb.Keys(ctx, "article:*:views").Result()
    if err != nil {
        return
    }

    for _, key := range keys {
        // 提取文章 ID
        var articleID int64
        fmt.Sscanf(key, "article:%d:views", &articleID)

        // 获取阅读量
        count, err := s.rdb.Get(ctx, key).Int64()
        if err != nil {
            continue
        }

        // 更新数据库
        s.db.Exec("UPDATE articles SET view_count = ? WHERE id = ?", count, articleID)

        // 清除已同步的缓存
        s.rdb.Del(ctx, key)
    }
}
```

---

## 九、API 实现

### 9.1 Handler

```go
package api

import (
    "iwan-station-gin/internal/service"
    "iwan-station-gin/internal/pkg/response"

    "github.com/gin-gonic/gin"
)

type DashboardHandler struct {
    statsService *service.StatsService
}

func NewDashboardHandler(statsService *service.StatsService) *DashboardHandler {
    return &DashboardHandler{statsService: statsService}
}

// GetStats 获取仪表盘统计数据
func (h *DashboardHandler) GetStats(c *gin.Context) {
    stats, err := h.statsService.GetDashboardStatsWithCache(c.Request.Context())
    if err != nil {
        response.Error(c, err)
        return
    }

    response.SuccessWithData(c, stats)
}

// GetUserTrend 获取用户趋势
func (h *DashboardHandler) GetUserTrend(c *gin.Context) {
    var req struct {
        Days int `form:"days" binding:"min=1,max=30"`
    }
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Error(c, err)
        return
    }

    if req.Days == 0 {
        req.Days = 7 // 默认7天
    }

    trend, err := h.statsService.GetUserActivityTrend(c.Request.Context(), req.Days)
    if err != nil {
        response.Error(c, err)
        return
    }

    response.SuccessWithData(c, trend)
}

// GetCategoryStats 获取分类统计
func (h *DashboardHandler) GetCategoryStats(c *gin.Context) {
    stats, err := h.statsService.GetCategoryStats(c.Request.Context())
    if err != nil {
        response.Error(c, err)
        return
    }

    response.SuccessWithData(c, stats)
}

// GetHotArticles 获取热门文章
func (h *DashboardHandler) GetHotArticles(c *gin.Context) {
    var req struct {
        Limit int `form:"limit" binding:"min=1,max=100"`
    }
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Error(c, err)
        return
    }

    if req.Limit == 0 {
        req.Limit = 10
    }

    articles, err := h.statsService.GetHotArticles(c.Request.Context(), req.Limit)
    if err != nil {
        response.Error(c, err)
        return
    }

    response.SuccessWithData(c, articles)
}
```

### 9.2 路由注册

```go
func RegisterDashboardRoutes(r *gin.RouterGroup, handler *DashboardHandler) {
    dashboard := r.Group("/dashboard")
    {
        dashboard.GET("/stats", handler.GetStats)
        dashboard.GET("/trend/users", handler.GetUserTrend)
        dashboard.GET("/stats/categories", handler.GetCategoryStats)
        dashboard.GET("/articles/hot", handler.GetHotArticles)
    }
}
```

---

## 十、最佳实践

### 10.1 性能优化

| 场景 | 方案 | 说明 |
|------|------|------|
| 高频统计 | Redis 计数器 | 避免频繁写数据库 |
| 复杂查询 | 定时预计算 | 提前计算并缓存 |
| 实时数据 | WebSocket 推送 | 减少轮询 |
| 大量数据 | 分页查询 | 避免内存溢出 |

### 10.2 数据一致性

```go
// 定时校验 Redis 和数据库数据一致性
func (s *StatsService) ValidateConsistency(ctx context.Context) {
    // 获取数据库中的阅读量
    var dbCounts []struct {
        ID        uint64
        ViewCount int64
    }
    s.db.Model(&model.Article{}).
        Select("id, view_count").
        Find(&dbCounts)

    for _, item := range dbCounts {
        redisKey := fmt.Sprintf("article:%d:views", item.ID)
        redisCount, err := s.rdb.Get(ctx, redisKey).Int64()

        if err == redis.Nil {
            // Redis 无数据，使用数据库数据
            s.rdb.Set(ctx, redisKey, item.ViewCount, 24*time.Hour)
        } else if abs(redisCount-item.ViewCount) > 100 {
            // 差异过大，以数据库为准
            s.rdb.Set(ctx, redisKey, item.ViewCount, 24*time.Hour)
        }
    }
}
```

---

## 十一、练习任务

1. **基础任务**：实现文章阅读量统计和热门文章排行
2. **进阶任务**：实现用户活跃度趋势图（最近30天）
3. **高级任务**：实现实时统计 WebSocket 推送

---

## 课后阅读

- [ECharts 文档 - 折线图](https://echarts.apache.org/zh/option.html#series-line)
- [GORM 聚合查询](https://gorm.io/docs/aggregation.html)
- [Redis HyperLogLog](https://redis.io/docs/data-types/probabilistic/)

