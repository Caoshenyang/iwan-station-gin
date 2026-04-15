# 快速开始

欢迎来到 **Iwan Station Gin** 教程！这是一个从零开始构建生产级 Go + Gin + Vue 3 全栈项目的完整教程，包含前后端完整开发流程。

---

## 🎯 这个教程适合谁？

- ✅ **Go 语言初学者**：想系统学习 Go Web 开发
- ✅ **Java 开发者转型**：有 Spring 经验，想学习 Go
- ✅ **全栈开发者**：需要了解后端开发最佳实践
- ✅ **在校学生**：通过实战项目提升技能

> 💡 **为什么学这个教程？**
> - 完整的生产级项目，不是简单的 Hello World
> - 涵盖认证、权限、文件上传、缓存等核心功能
> - 包含前端开发，真正的全栈实战
> - 详细的代码解释和最佳实践

---

## 🛠️ 环境要求

### 最小化安装（推荐）

只需安装 Docker，其他服务都通过 Docker 运行：

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| **Docker** | 20+ | 运行所有基础服务 |
| **Go** | 1.21+ | 后端开发 |
| **Node.js** | 20+ | 前端开发 |

### 完整安装

如果你想本地安装所有服务：

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Go | 1.21+ | 后端开发 |
| PostgreSQL | 15+ | 数据库 |
| Redis | 7+ | 缓存 |
| MinIO | Latest | 对象存储 |
| Node.js | 20+ | 前端开发 |

### 推荐开发工具

| 工具类型 | 推荐工具 | 说明 |
|----------|----------|------|
| IDE | VSCode / GoLand | 代码编辑 |
| API 测试 | Postman / Insomnia | API 调试 |
| 数据库工具 | DBeaver / Navicat | 数据库管理 |
| Git 客户端 | GitKraken / SourceTree | 版本控制 |

---

## 🚀 5分钟快速体验

想先看看效果？跟着以下步骤快速启动：

### 前置要求

只需安装 **Docker**，其他所有服务都通过 Docker 运行：

- Docker Desktop（[下载地址](https://www.docker.com/products/docker-desktop/)）

### 快速启动

**Windows 用户：**

```bash
# 1. 克隆项目
git clone https://github.com/your-org/iwan-station-gin.git
cd iwan-station-gin

# 2. 一键启动基础服务
.\scripts\start-dev.bat
```

**macOS/Linux 用户：**

```bash
# 1. 克隆项目
git clone https://github.com/your-org/iwan-station-gin.git
cd iwan-station-gin

# 2. 给脚本添加执行权限
chmod +x scripts/*.sh

# 3. 一键启动基础服务
./scripts/start-dev.sh
```

启动后会自动运行以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| MinIO API | http://localhost:9000 | 对象存储 |
| MinIO 控制台 | http://localhost:9001 | 存储管理界面 |

MinIO 默认账号：`minioadmin` / `minioadmin123`

### 启动后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖
go mod tidy

# 复制配置文件
cp config/config.yaml.example config/config.yaml

# 启动服务
go run cmd/server/main.go
```

后端启动成功后访问：http://localhost:8080

### 停止服务

```bash
# Windows
.\scripts\stop-dev.bat

# macOS/Linux
./scripts/stop-dev.sh
```

---

## 📌 教程特色

- ✨ **实战导向**：构建完整的生产级项目
- 🎯 **循序渐进**：从基础到高级，逐步深入
- 📝 **详细注释**：每个代码片段都有详细解释
- 🔄 **最佳实践**：遵循 Go 语言规范和行业最佳实践
- 🌟 **双数据库支持**：PostgreSQL 和 MySQL 可选切换
- 🐳 **Docker 友好**：所有服务都支持 Docker 部署
- 📱 **全栈开发**：包含 Vue 3 前端开发

---

## 📞 遇到问题？

### 常见问题

查看 [常见问题解答](./faq.md) 获取快速帮助。

### 获取帮助

- 📖 查看对应章节的详细文档
- 🔍 搜索 issue 中是否有类似问题
- 💬 提交 issue 寻求帮助

---

## 🎓 准备好了吗？

让我们开始这段学习之旅吧！

<div style="text-align: center; margin: 32px 0;">

**[← 课程大纲](./curriculum.md)** **[第一章：课程介绍与准备 →](./chapter-1/)**

</div>
