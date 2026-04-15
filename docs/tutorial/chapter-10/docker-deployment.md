# 10.1 Docker 部署

## 为什么使用 Docker？

Docker 提供：
- **一致性**：到处都是相同的环境
- **隔离性**：与本地设置无冲突
- **简洁性**：一个命令启动所有服务
- **可扩展性**：易于扩展服务

## Dockerfile 说明

### 后端 Dockerfile

```dockerfile
# 构建阶段
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# 运行阶段
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai
COPY --from=builder /app/main .
COPY --from=builder /app/config ./config
RUN mkdir -p logs uploads
EXPOSE 8080
CMD ["./main"]
```

### 多阶段构建的好处

1. **更小的镜像**：最终镜像只包含运行时依赖
2. **更安全**：生产镜像中没有构建工具
3. **更快**：更好的层缓存

## Docker Compose

本教程提供 MySQL 和 PostgreSQL 两种数据库的 Docker Compose 配置。

### MySQL 版本（docker-compose.mysql.yml）

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: iwan_station
      MYSQL_USER: iwan
      MYSQL_PASSWORD: iwan123456
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
    environment:
      - DB_TYPE=mysql
      - DB_HOST=mysql
      - DB_PORT=3306

volumes:
  mysql-data:
  redis-data:
```

### PostgreSQL 版本（docker-compose.postgres.yml）

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: iwan_station
      POSTGRES_USER: iwan
      POSTGRES_PASSWORD: iwan123456
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      - DB_TYPE=postgresql
      - DB_HOST=postgres
      - DB_PORT=5432

volumes:
  postgres-data:
  redis-data:
```

### 启动服务

```bash
# 使用 MySQL
docker-compose -f docker-compose.mysql.yml up -d

# 或使用 PostgreSQL
docker-compose -f docker-compose.postgres.yml up -d

# 查看日志
docker-compose -f docker-compose.mysql.yml logs -f
```

## 部署步骤

### 1. 构建镜像

```bash
# 构建后端镜像
docker build -t iwan-backend:latest ./backend

# 或使用 docker-compose 构建
docker-compose build
```

### 2. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查状态
docker-compose ps
```

### 3. 初始化设置

```bash
# 运行数据库迁移
docker-compose exec backend ./main migrate

# 创建管理员用户
docker-compose exec backend ./main create-admin
```

## 生产配置

### 环境变量

创建 `.env` 文件：

```bash
# 数据库
DB_HOST=mysql
DB_PORT=3306
DB_USER=iwan
DB_PASSWORD=iwan123456
DB_NAME=iwan_station

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your-production-secret-key

# 服务器
SERVER_MODE=release
SERVER_PORT=8080
```

### 更新 docker-compose.yml

```yaml
services:
  backend:
    env_file: .env
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Nginx 反向代理

```nginx
upstream backend {
    server backend:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

## SSL/HTTPS 设置

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期（添加到 crontab）
certbot renew --dry-run
```

## 健康检查

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 日志管理

```bash
# 查看日志
docker-compose logs -f backend

# 日志轮转（添加到 docker-compose.yml）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 备份策略

### 数据库备份

**MySQL 备份：**

```bash
# 备份脚本
docker-compose -f docker-compose.mysql.yml exec mysql mysqldump -u iwan -piwan123456 iwan_station > backup_mysql.sql

# 恢复
docker-compose -f docker-compose.mysql.yml exec -T mysql mysql -u iwan -piwan123456 iwan_station < backup_mysql.sql
```

**PostgreSQL 备份：**

```bash
# 备份脚本
docker-compose -f docker-compose.postgres.yml exec postgres pg_dump -U iwan iwan_station > backup_postgres.sql

# 恢复
docker-compose -f docker-compose.postgres.yml exec -T postgres psql -U iwan -d iwan_station < backup_postgres.sql
```

### 卷备份

**MySQL 卷备份：**

```bash
# 备份 MySQL 卷
docker run --rm -v iwan-station-gin_mysql-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql-backup.tar.gz /data
```

**PostgreSQL 卷备份：**

```bash
# 备份 PostgreSQL 卷
docker run --rm -v iwan-station-gin_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

## 故障排查

### 容器无法启动

```bash
# 查看日志
docker-compose logs backend

# 进入容器
docker-compose exec backend sh

# 检查配置
docker-compose exec backend cat /app/config/config.yaml
```

### 数据库连接问题

**MySQL 连接：**

```bash
# 测试 MySQL 连接
docker-compose -f docker-compose.mysql.yml exec backend mysql -h mysql -u iwan -piwan123456

# 检查 MySQL 是否就绪
docker-compose -f docker-compose.mysql.yml exec mysql mysqladmin ping -h localhost
```

**PostgreSQL 连接：**

```bash
# 测试 PostgreSQL 连接
docker-compose -f docker-compose.postgres.yml exec backend psql -h postgres -U iwan -d iwan_station

# 检查 PostgreSQL 是否就绪
docker-compose -f docker-compose.postgres.yml exec postgres pg_isready
```

### 性能问题

```bash
# 检查资源使用
docker stats

# 检查容器
docker inspect iwan-backend
```

## 扩展

### 水平扩展

```yaml
services:
  backend:
    deploy:
      replicas: 3

  nginx:
    # 在后端实例间负载均衡
```

### 垂直扩展

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

## 监控

### 容器指标

```bash
# 查看统计
docker stats

# 使用 Promtail + Loki 收集日志
# 使用 Grafana 进行可视化
```

## 下一步

部署完成后，查看「[项目总结](/guide/summary)」
