---
title: "Docker 部署参考"
description: "Iwan Station Gin 文档：Docker 部署参考。"
---

# Docker 部署参考

## Dockerfile

```dockerfile
# 多阶段构建
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o server cmd/server/main.go

# 运行阶段
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/config ./config

EXPOSE 8080
CMD ["./server"]
```

## Docker Compose

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: iwan_station
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      DB_HOST: mysql
      REDIS_ADDR: redis:6379
    depends_on:
      - mysql
      - redis

  frontend:
    image: nginx:alpine
    volumes:
      - ./web/dist:/usr/share/nginx/html
    ports:
      - "80:80"

volumes:
  mysql_data:
  redis_data:
```

## 常用命令

```bash
# 构建镜像
docker build -t iwan-station .

# 运行容器
docker run -p 8080:8080 iwan-station

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| APP_ENV | 运行环境 | production |
| APP_PORT | 服务端口 | 8080 |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| REDIS_ADDR | Redis 地址 | localhost:6379 |
| JWT_SECRET | JWT 密钥 | - |


