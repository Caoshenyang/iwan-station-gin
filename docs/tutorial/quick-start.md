---
title: 快速开始
description: "这是一条体验路线：基于现成项目快速跑通 Iwan Station Gin，先看到整体效果，再决定是否回到正式主线系统学习。"
---

# 🚀 快速开始

这一页服务的是一类非常具体的读者：  
**你想先看到项目跑起来，再决定是否从头系统学习。**

::: warning ⚠️ 这不是正式主线
如果你真正想掌握目录设计、架构拆分、认证权限和业务模块是怎么一步步搭起来的，请回到 **[课程大纲](./curriculum)**，按正式主线推进。
:::

## 这一页适合谁

- 想先确认项目最终大概长什么样
- 想快速启动环境，验证仓库是否可运行
- 想先体验完整系统，再回头按章节理解实现过程

## 你会在这页完成什么

跟着这页做完，你应该能得到这些结果：

- 基础依赖服务启动成功
- 后端服务能够运行
- 你知道管理后台和基础服务分别从哪里访问

## 前置要求

### 最小化安装（推荐）

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Docker | 20+ | 运行 PostgreSQL、Redis、MinIO 等基础服务 |
| Go | 1.21+ | 本地启动后端服务 |
| Node.js | 20+ | 本地启动前端或安装前端依赖 |

### 推荐工具

| 工具类型 | 推荐工具 | 说明 |
|----------|----------|------|
| IDE | VSCode / GoLand | 代码编辑 |
| API 调试 | Postman / Bruno / Insomnia | 接口验证 |
| 数据库工具 | DBeaver / Navicat | 数据库查看 |

## 第一步：获取项目

::: tip 💡 仓库地址说明
发布时请将下面的 `<your-repo-url>` 替换成正式仓库地址。  
如果项目已经在本地，可以直接进入项目目录继续后面的步骤。
:::

::: code-group
```bash [Windows]
git clone <your-repo-url>
cd iwan-station-gin
```

```bash [macOS/Linux]
git clone <your-repo-url>
cd iwan-station-gin
```
:::

## 第二步：启动基础服务

::: code-group
```powershell [Windows PowerShell]
.\scripts\start-dev.bat
```

```bash [macOS/Linux]
chmod +x scripts/*.sh
./scripts/start-dev.sh
```
:::

启动成功后，通常会包含这些基础服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| PostgreSQL | `localhost:5432` | 主数据库 |
| Redis | `localhost:6379` | 缓存服务 |
| MinIO API | `http://localhost:9000` | 对象存储接口 |
| MinIO 控制台 | `http://localhost:9001` | 对象存储管理界面 |

MinIO 默认账号一般为：`minioadmin` / `minioadmin123`

## 第三步：启动后端服务

```bash
cd server
go mod tidy
go run cmd/server/main.go
```

如果一切正常，后端服务通常会监听在：

- `http://localhost:8080`

## 第四步：验证项目是否跑起来

建议至少验证这几件事：

1. Docker 容器都已启动
2. 后端服务无报错
3. 数据库可以正常连接
4. MinIO 控制台能正常打开

如果仓库已经包含前端，你也可以继续启动前端并验证登录页与基础页面是否可访问。

## 跑通以后，下一步该做什么

### 如果你只是想确认项目可运行

到这里就够了，你已经完成了“体验路线”的目标。

### 如果你想真正学会怎么搭出来

现在请回到 **[课程大纲](./curriculum)**，然后从 **[第一章](./chapter-1/)** 正式开始。  
这样你会知道刚才那些服务、脚本、目录和配置，背后到底是怎么一步步长出来的。

## 遇到问题怎么办

- 环境与命令问题：看 [常见问题](./faq)
- 想重新建立路线感：回到 [开始这里](./)
- 想知道整套主线会走到哪：看 [课程大纲](./curriculum)

::: info 🧭 下一步
**[← 返回开始这里](./)**  
或者进入 **[课程大纲 →](./curriculum)**
:::
