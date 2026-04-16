---
title: "环境搭建"
description: "本教程采用 Docker 运行所有基础服务（PostgreSQL、Redis、MinIO），你只需要安装 Go 和 Docker 即可！"
---

# 环境搭建

本教程采用 **Docker** 运行所有基础服务（PostgreSQL、Redis、MinIO），你只需要安装 Go 和 Docker 即可！

::: tip 推荐阅读方式
这一页涉及多个操作系统。优先展开你自己的平台命令，不必被其他平台的步骤打断节奏。
:::

---

## 📋 安装清单

| 软件 | 版本 | 用途 |
|------|------|------|
| **Go** | 1.26+ | 后端开发 |
| **Docker Desktop** | Latest | 运行基础服务 |
| **Node.js** | 20+ | 前端开发（第9章需要）|

---

## 1. Go 安装

::: code-group
```powershell [Windows]
# 使用 winget（推荐）
winget install GoLang.Go
```

```bash [macOS]
# 使用 Homebrew（推荐）
brew install go
```

```bash [Linux (Ubuntu/Debian)]
sudo apt update
sudo apt install golang-go
```
:::

::: details Windows 安装包方式
访问 [https://go.dev/dl/](https://go.dev/dl/) 下载 Windows 安装包并运行。
:::

### 验证安装

```bash
go version
# 输出: go version go1.26.x ...
```

### 配置国内镜像（可选，加速依赖下载）

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

---

## 2. Docker 安装

::: details Windows
1. 下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 运行安装程序
3. 安装完成后重启计算机
4. 启动 Docker Desktop
:::

::: details macOS
1. 下载 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. 打开下载的 `.dmg` 文件
3. 将 Docker 拖到 `Applications` 文件夹
4. 启动 Docker Desktop
:::

::: details Linux (Ubuntu/Debian)
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli container.io docker-compose-plugin
```
:::

### 验证安装

```bash
docker --version
docker compose version
```

---

## 3. 使用 Docker Compose 一键安装（推荐）

Docker Compose 可以通过一个配置文件管理多个容器，更加方便快捷。

### 3.1 创建数据目录

首先在 D 盘创建统一的数据目录：

::: code-group
```powershell [Windows PowerShell]
# 一键创建所有数据目录（推荐）
'D:\iwan-station-data\postgres','D:\iwan-station-data\redis','D:\iwan-station-data\minio' | ForEach-Object { mkdir $_ -Force }

# 验证目录创建
Get-ChildItem D:\iwan-station-data
```

```cmd [Windows CMD]
mkdir D:\iwan-station-data\postgres D:\iwan-station-data\redis D:\iwan-station-data\minio
dir D:\iwan-station-data
```

```bash [Windows Git Bash]
mkdir -p /d/iwan-station-data/{postgres,redis,minio}
ls -la /d/iwan-station-data/
```

```bash [macOS / Linux]
mkdir -p ~/iwan-station-data/{postgres,redis,minio}
ls -la ~/iwan-station-data/
```
:::

### 3.2 创建 docker-compose.yml

在 `D:\iwan-station-data` 目录下创建 `docker-compose.yml` 文件：

```yaml
name: iwan-station

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:16-alpine
    container_name: iwan-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: iwan
      POSTGRES_PASSWORD: iwan123456
      POSTGRES_DB: iwan_station
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - ./postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U iwan"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: iwan-redis
    restart: unless-stopped
    command: redis-server --requirepass iwan123456 --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - ./redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "iwan123456", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO 对象存储
  minio:
    image: minio/minio:latest
    container_name: iwan-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./minio:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres:
  redis:
  minio:
```

### 3.3 启动所有服务

```bash{2,5,8}
# 进入数据目录
cd D:\iwan-station-data

# 启动所有服务（后台运行）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f
```

启动成功后，在 Docker Desktop 中会看到一个名为 `iwan-station` 的 Stack，包含三个容器：
- iwan-postgres
- iwan-redis
- iwan-minio

### 3.4 验证服务

```bash{2,5,9}
# 验证 PostgreSQL
docker exec -it iwan-postgres psql -U iwan -d iwan_station -c "SELECT version();"

# 验证 Redis
docker exec -it iwan-redis redis-cli -a iwan123456 ping

# 验证 MinIO
curl http://localhost:9000/minio/health/live
```

### 3.5 常用管理命令

```bash
# 停止所有服务
docker compose stop

# 启动所有服务
docker compose start

# 重启所有服务
docker compose restart

# 停止并删除所有容器（保留数据）
docker compose down

# 停止并删除所有容器和数据卷（⚠️ 会丢失数据）
docker compose down -v

# 查看某个服务的日志
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio

# 进入某个容器
docker exec -it iwan-postgres sh
docker exec -it iwan-redis sh
```

### 3.6 自定义 Stack 名称

如果你想使用不同的 Stack 名称，可以通过以下方式：

**方式一：修改 docker-compose.yml**

```yaml
name: your-project-name  # 修改这里的名称
```

**方式二：使用命令行参数**

```bash
docker compose -p your-project-name up -d
```

**方式三：使用环境变量**

```bash
# Windows
set COMPOSE_PROJECT_NAME=your-project-name

# macOS/Linux
export COMPOSE_PROJECT_NAME=your-project-name

docker compose up -d
```

### 3.7 数据目录结构

所有数据都存储在 `D:\iwan-station-data` 目录下：

```
D:\iwan-station-data\
├── docker-compose.yml    # Compose 配置文件
├── postgres\             # PostgreSQL 数据
│   └── pgdata\
├── redis\                # Redis 数据（包含 appendonly.aof）
└── minio\                # MinIO 数据
```

### 3.8 MinIO 存储桶配置

访问 MinIO 控制台：http://localhost:9001
- 用户名：`minioadmin`
- 密码：`minioadmin123`

登录后创建以下存储桶：

| 存储桶名称 | 用途 |
|-----------|------|
| `iwan-uploads` | 通用文件上传 |
| `iwan-avatars` | 用户头像 |
| `iwan-files` | 其他文件 |

> 💡 **MinIO 文件存储提示**
>
> 在 `D:\iwan-station-data\minio\{bucket-name}\` 目录下，文件按以下方式存储：
> - **小文件**（< 128KB）：数据嵌入 `xl.meta` 中
> - **大文件**：分块存储为 `part.1`, `part.2`...
>
> > ⚠️ **重要**：MinIO 保存后的文件**无法直接查看源文件**，必须通过 MinIO 接口访问：
> > - 使用 MinIO 客户端 `mc cp` 下载
> > - 使用 HTTP API `http://localhost:9000/{bucket}/{filename}` 下载
> > - 不能直接复制 `xl.meta` 或 `part.*` 文件使用

### Docker Compose vs 单独 docker run

| 对比项 | Docker Compose | docker run |
|--------|----------------|------------|
| **配置方式** | 一个 YAML 文件 | 多个命令 |
| **启动方式** | 一条命令启动所有服务 | 需要逐个启动 |
| **数据管理** | 统一目录，清晰明了 | Docker volume，不易查找 |
| **网络配置** | 自动创建网络，容器名可直接访问 | 需要手动配置网络 |
| **适用场景** | **推荐**，适合开发环境 | 学习了解，或单个服务 |

---

## 4. 单独安装方式（可选）

如果你想学习了解或单独管理某个服务，可以使用以下方式。

### 4.1 PostgreSQL 安装

**创建数据卷：**

```bash
docker volume create iwan-postgres-data
```

**运行容器：**

```bash
docker run -d \
  --name iwan-postgres \
  --restart=unless-stopped \
  -e POSTGRES_USER=iwan \
  -e POSTGRES_PASSWORD=iwan123456 \
  -e POSTGRES_DB=iwan_station \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -p 5432:5432 \
  -v iwan-postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 4.2 Redis 安装

**创建数据卷：**

```bash
docker volume create iwan-redis-data
```

**运行容器：**

```bash
docker run -d \
  --name iwan-redis \
  --restart=unless-stopped \
  -p 6379:6379 \
  -v iwan-redis-data:/data \
  --appendonly yes \
  redis:7-alpine \
  redis-server --requirepass iwan123456
```

### 4.3 MinIO 安装

**创建数据卷：**

```bash
docker volume create iwan-minio-data
```

**运行容器：**

```bash
docker run -d \
  --name iwan-minio \
  --restart=unless-stopped \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  -p 9000:9000 \
  -p 9001:9001 \
  -v iwan-minio-data:/data \
  minio/minio:latest server /data --console-address ":9001"
```

---

## 5. 服务管理

### 查看所有服务状态

```bash
# 查看所有容器
docker ps -a

# 查看容器资源占用
docker stats

# 查看容器日志
docker logs -f iwan-postgres
docker logs -f iwan-redis
docker logs -f iwan-minio
```

### 批量操作

```bash
# 停止所有服务
docker stop iwan-postgres iwan-redis iwan-minio

# 启动所有服务
docker start iwan-postgres iwan-redis iwan-minio

# 删除所有容器（保留数据）
docker rm -f iwan-postgres iwan-redis iwan-minio

# 删除所有数据卷（⚠️ 会丢失所有数据）
docker volume rm iwan-postgres-data iwan-redis-data iwan-minio-data
```

---

## 6. 开发工具推荐

### VS Code

安装以下扩展：

```bash
# 推荐扩展
- Go                  # Go 语言支持
- Volar               # Vue 3 支持
- TypeScript Vue Plugin # TS 支持增强
```

### Go 工具链

```bash
# 安装有用的 Go 工具
go install golang.org/x/tools/gopls@latest         # 语言服务器
go install github.com/go-delve/delve/cmd/dlv@latest  # 调试器
go install github.com/air-verse/air@latest         # 热重载
```

### API 测试工具

- **Postman** - [https://www.postman.com/](https://www.postman.com/)
- **Insomnia** - [https://insomnia.rest/](https://insomnia.rest/)
- **Bruno** - [https://www.usebruno.com/](https://www.usebruno.com/)

### 数据库工具

- **DBeaver** - [https://dbeaver.io/](https://dbeaver.io/) (免费)
- **TablePlus** - [https://tableplus.com/](https://tableplus.com/) (macOS)
- **Navicat** - [https://www.navicat.com/](https://www.navicat.com/) (付费)

---

## 7. 常见问题

### 端口被占用

**Windows (PowerShell):**
```powershell
# 查看占用端口的进程
netstat -ano | findstr :5432

# 结束进程
Stop-Process -Id <PID> -Force
```

**macOS/Linux:**
```bash
# 查看占用端口的进程
lsof -ti:5432

# 结束进程
kill -9 $(lsof -ti:5432)
```

### Docker 启动失败

```bash
# 检查 Docker 是否运行
docker info

# 重启 Docker Desktop
# Windows: 在系统托盘右键点击 Restart
# macOS: 点击菜单栏的 Docker 图标选择 Restart
```

### Go 命令不识别

```bash
# 检查 Go 是否安装
go version

# 检查环境变量
echo $PATH  # macOS/Linux
echo %PATH% # Windows

# 确保 Go bin 目录在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin
```

---

## 8. 验证环境

运行以下命令验证所有服务正常运行：

```bash
# 1. 检查 Go
go version

# 2. 检查 Docker
docker --version
docker compose version

# 3. 检查所有容器状态
docker ps

# 4. 测试 PostgreSQL 连接
docker exec -it iwan-postgres psql -U iwan -d iwan_station -c "SELECT version();"

# 5. 测试 Redis 连接
docker exec -it iwan-redis redis-cli -a iwan123456 ping

# 6. 测试 MinIO 连接
curl http://localhost:9000/minio/health/live
```

全部通过后，环境配置完成！🎉

---

## 📚 下一步

环境搭建完成后，继续「[项目初始化](./project-init)」创建项目结构并配置依赖。

