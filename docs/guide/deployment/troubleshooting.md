---
title: "故障排查"
description: "Iwan Station Gin 文档：故障排查。"
---

# 故障排查

## 常见问题

### 数据库连接失败

```
Error: dial tcp: lookup mysql on 127.0.0.11:53: no such host
```

**解决方案**：
- 检查 `docker-compose.yml` 中服务名称
- 使用服务名而非 localhost 作为 host
- 确保 `depends_on` 配置正确

### Redis 连接超时

```
Error: dial tcp: connection refused
```

**解决方案**：
- 检查 Redis 是否启动：`docker-compose ps`
- 查看日志：`docker-compose logs redis`
- 验证端口配置

### JWT Token 无效

```
Error: signature is invalid
```

**解决方案**：
- 确保前后端使用相同的 `JWT_SECRET`
- 检查 token 过期时间
- 验证 clock skew（时间差）

### 容器启动失败

```
Error: Container exited with code 1
```

**解决方案**：
- 查看容器日志：`docker logs <container_id>`
- 检查配置文件是否挂载
- 验证环境变量

## 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务
docker-compose logs -f backend

# 查看最近 100 行
docker-compose logs --tail=100 backend

# 实时跟踪
docker-compose logs -f --tail=50 backend
```

## 性能问题

### 内存占用高

```bash
# 查看容器资源使用
docker stats

# 限制内存
docker-compose.yml:
services:
  backend:
    mem_limit: 512m
```

### 响应慢

1. 检查数据库查询：启用慢查询日志
2. 检查缓存命中率
3. 使用 pprof 分析性能

## 网络问题

```bash
# 检查网络
docker network inspect iwan-station_default

# 测试连通性
docker-compose exec backend ping mysql
docker-compose exec backend curl http://redis:6379
```

## 调试技巧

### 进入容器

```bash
docker-compose exec backend sh
docker-compose exec mysql mysql -uroot -p
```

### 重建服务

```bash
# 强制重建
docker-compose up -d --build --force-recreate

# 清理所有
docker-compose down -v
docker-compose up -d
```


