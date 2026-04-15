# 统计 API

## 接口列表

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| GET | /api/v1/stats/overview | 概览统计 | 5分钟 |
| GET | /api/v1/stats/trend | 趋势数据 | 10分钟 |
| GET | /api/v1/stats/chart | 图表数据 | 15分钟 |

## 概览统计

```json
{
  "code": 0,
  "data": {
    "total_users": 1234,
    "total_articles": 567,
    "today_views": 8901,
    "active_users": 234
  }
}
```

## 趋势数据

```bash
GET /api/v1/stats/trend?period=7d&type=article
```

| 参数 | 说明 | 可选值 |
|------|------|--------|
| period | 时间范围 | 7d, 30d, 90d |
| type | 数据类型 | article, user, view |

## 图表数据

```json
{
  "code": 0,
  "data": {
    "labels": ["1月", "2月", "3月", "4月"],
    "datasets": [{
      "name": "文章数",
      "data": [12, 19, 3, 5]
    }]
  }
}
```

## 缓存策略

```go
// Redis 缓存
func (s *Service) GetOverview() (*Overview, error) {
    cacheKey := "stats:overview"

    // 尝试缓存
    if cached, err := s.redis.Get(cacheKey); err == nil {
        return cached, nil
    }

    // 从数据库计算
    stats, err := s.repo.CalculateOverview()
    if err != nil {
        return nil, err
    }

    // 缓存 5 分钟
    s.redis.Set(cacheKey, stats, 5*time.Minute)
    return stats, nil
}
```
