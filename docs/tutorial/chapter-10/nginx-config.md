# Nginx 反向代理配置

## 学习目标

完成本章后，你将：
- ✅ 理解 Nginx 反向代理原理
- ✅ 掌握 Nginx 配置语法
- ✅ 实现 SSL/TLS 配置
- ✅ 学会负载均衡和缓存配置

## 为什么需要 Nginx？

Nginx 作为反向代理的优势：

| 特性 | 说明 |
|------|------|
| 高性能 | 处理大量并发连接 |
| 反向代理 | 隐藏后端服务器 |
| 负载均衡 | 分发请求到多个后端 |
| 静态文件 | 高效处理静态资源 |
| SSL 终结 | 统一管理 HTTPS |
| 缓存 | 减轻后端压力 |

## 基础配置

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS
brew install nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 基础配置文件

```nginx
# /etc/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript;

    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
```

## Gin 应用配置

### HTTP 配置

```nginx
# /etc/nginx/conf.d/iwan-station.conf

# 后端服务器
upstream backend {
    server 127.0.0.1:8080;
    # 可以添加多个服务器实现负载均衡
    # server 127.0.0.1:8081;
    # server 127.0.0.1:8082;

    # 保持连接
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    # 访问日志
    access_log /var/log/nginx/iwan-station-access.log;
    error_log /var/log/nginx/iwan-station-error.log;

    # 客户端最大请求体大小
    client_max_body_size 100M;

    # 代理超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # API 路由
    location /api/ {
        proxy_pass http://backend;

        # 代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态文件
    location /uploads/ {
        alias /path/to/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # 默认返回 404
    location / {
        return 404;
    }
}
```

## HTTPS/SSL 配置

### 使用 Let's Encrypt

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.example.com

# 自动续期
sudo certbot renew --dry-run
```

### SSL 配置

```nginx
# /etc/nginx/conf.d/iwan-station-ssl.conf

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name api.example.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # SSL 配置
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # 现代配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/api.example.com/chain.pem;

    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # 安全头
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 其余配置与 HTTP 相同
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /path/to/uploads/;
        expires 30d;
    }
}
```

## 负载均衡

### 负载均衡策略

```nginx
# 轮询（默认）
upstream backend_round_robin {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

# 最少连接
upstream backend_least_conn {
    least_conn;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

# IP 哈希
upstream backend_ip_hash {
    ip_hash;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

# 权重
upstream backend_weight {
    server 192.168.1.10:8080 weight=3;
    server 192.168.1.11:8080 weight=2;
    server 192.168.1.12:8080 weight=1;
}
```

### 健康检查

```nginx
upstream backend {
    server 192.168.1.10:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8080 max_fails=3 fail_timeout=30s;

    # 备用服务器
    server 192.168.1.20:8080 backup;
}
```

## 缓存配置

### 代理缓存

```nginx
# 定义缓存路径
proxy_cache_path /var/cache/nginx/api_cache
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;

server {
    listen 80;
    server_name api.example.com;

    location /api/v1/article/ {
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;

        # 缓存键
        proxy_cache_key "$scheme$request_method$host$request_uri";

        # 添加缓存状态头
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

### 静态文件缓存

```nginx
# 静态资源
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# HTML 文件
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public";
}
```

## 限流配置

### 请求限流

```nginx
# 定义限流区域
http {
    # 限制每个 IP 每秒 10 个请求
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # 限制并发连接数
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        # 应用限流
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn conn_limit 10;

            proxy_pass http://backend;
        }
    }
}
```

## 安全配置

### 防止攻击

```nginx
http {
    # 隐藏 Nginx 版本
    server_tokens off;

    # 限制请求大小
    client_max_body_size 10M;

    # 超时设置
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # 限制连接数
    limit_connections_per_ip 10;
    limit_requests_per_ip 20;
}

server {
    # 阻止非法请求
    location ~* \.(git|svn|env|htaccess)$ {
        deny all;
        return 404;
    }

    # 阻止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

## 日志配置

### 自定义日志格式

```nginx
http {
    # JSON 格式日志（便于解析）
    log_format json_log escape=json '{'
        '"time":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"upstream_response_time":"$upstream_response_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"http_x_forwarded_for":"$http_x_forwarded_for"'
    '}';

    server {
        access_log /var/log/nginx/access.log json_log;
    }
}
```

## 前端配置

### Vue 单页应用

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /var/www/html;
    index index.html;

    # Vue Router history 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## Docker 部署

### Docker Compose 配置

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: iwan-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./uploads:/var/www/uploads:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
    networks:
      - app-network
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: iwan-backend
    expose:
      - "8080"
    environment:
      - GIN_MODE=release
    volumes:
      - ./uploads:/app/uploads
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

## 监控

### Nginx 状态监控

```nginx
# 启用状态页面
server {
    listen 127.0.0.1:8080;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

### 使用 Prometheus 监控

```nginx
# 安装 nginx-prometheus-exporter
docker run -d \
  --name nginx-exporter \
  -p 9113:9113 \
  --network app-network \
  nginx/nginx-prometheus-exporter:latest \
  -nginx.scrape-uri=http://nginx:8080/nginx_status
```

## 最佳实践

### ✅ 应该做的

1. **使用 HTTPS**：所有生产环境使用 SSL
2. **启用 Gzip**：压缩响应体
3. **缓存静态文件**：减轻后端压力
4. **限制请求速率**：防止 DDoS 攻击
5. **定期更新**：保持 Nginx 版本最新

### ❌ 不应该做的

1. **使用默认配置**：根据需求调整配置
2. **忽略日志**：日志是排查问题的关键
3. **过度缓存**：动态内容不应该缓存
4. **忘记测试**：配置修改后要测试

## 常用命令

```bash
# 测试配置
sudo nginx -t

# 重载配置（不中断服务）
sudo nginx -s reload

# 停止服务
sudo nginx -s stop

# 查看进程
ps aux | grep nginx

# 查看错误日志
tail -f /var/log/nginx/error.log

# 查看访问日志
tail -f /var/log/nginx/access.log
```

## 下一步

Nginx 配置完成后，让我们学习「[性能优化](./performance-tuning.html)」
