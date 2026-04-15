# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 当前任务

**教程验证与文档修正**

- 职责：根据用户反馈纠正文档中的错误
- 方式：用户执行步骤，发现问题后反馈给我，我来修改
- 当前进度：第 1 章（环境搭建）> 项目初始化

---

## 项目概述

这是 **Iwan Station Gin（爱玩站 Gin）** 的文档站点 - 一个教授如何构建生产级 Go/Gin 后台管理系统的完整教程。此仓库仅包含 VitePress 文档，实际的 Go 后端代码单独维护。

## 工作目录

所有 VitePress 工作都在 `docs/` 子目录中进行。运行命令前必须先 `cd docs`。

## 常用命令

```bash
# 工作目录切换（必需）
cd docs

# 安装依赖（首次）
pnpm install

# 启动开发服务器（端口 15174）
pnpm docs:dev

# 构建生产版本
pnpm docs:build

# 预览生产构建
pnpm docs:preview
```

## 文档结构

```
docs/
├── index.md              # VitePress 首页（hero layout）
├── package.json          # pnpm 配置
├── .vitepress/
│   ├── config.mts        # VitePress 主配置（导航、侧边栏、端口等）
│   └── dist/             # 构建输出目录
├── tutorial/             # 渐进式教程（13 章）
│   ├── curriculum.md     # 课程大纲
│   ├── quick-start.md    # 快速开始
│   ├── faq.md           # 常见问题
│   └── chapter-N/        # 各章节内容
└── guide/               # 按主题组织的快速参考
    ├── framework/       # Gin、GORM、Zap 指南
    ├── auth/            # JWT、RBAC 指南
    ├── modules/         # 业务模块 API 参考
    ├── frontend/        # Vue 3 前端指南
    └── deployment/      # Docker 部署参考
```

## 教程架构

教程遵循渐进式学习路径：

1. **第 1-3 章**：基础准备（环境搭建、架构设计、基础框架）
2. **第 4-5 章**：认证与授权（JWT、Casbin RBAC）
3. **第 6-7 章**：业务功能模块（文章、分类、标签、文件上传、缓存）
4. **第 8 章**：系统管理（动态配置、操作日志、监控）
5. **第 9 章**：Vue 3 前端开发
6. **第 10 章**：生产部署（Docker、Nginx、性能优化）

## 技术栈

**后端**：Go 1.21+、Gin、GORM、JWT、Casbin、Redis、PostgreSQL/MySQL

**前端**：Vue 3、TypeScript、Element Plus

**部署**：Docker、Nginx

## 核心概念

### 四层架构
教程教授四层架构模式：
- API 层（Handler）- 处理 HTTP 请求/响应
- Service 层 - 业务逻辑
- Repository 层 - 数据访问
- Model 层 - 数据模型

### 中间件模式
Gin 中间件用于：
- JWT 认证
- Casbin RBAC 权限控制
- CORS 跨域处理
- 请求日志记录
- 恢复/panic 处理

### 依赖注入
项目使用 Wire 进行编译时依赖注入。

## 编辑文档时注意

1. 保持与现有 markdown 格式一致
2. 代码示例应完整可运行
3. 包含 "Go vs Java" 对比说明（目标受众包含 Java 开发者）
4. 使用正确的 VitePress 前置元数据
5. 以中文为主要语言
6. `ignoreDeadLinks: true` 已配置，未完成的章节链接不会导致构建失败

## VitePress 配置

- **开发服务器端口**：15174（在 `.vitepress/config.mts` 中配置）
- **搜索**：使用本地搜索（`provider: 'local'`）
- **语言**：`zh-CN`
- **Markdown 语法高亮**：支持 go、yaml、bash、javascript、typescript、vue、java、sql
- **重要配置文件**：`docs/.vitepress/config.mts` 包含所有导航和侧边栏结构

---

## 教程验证清单

> 当前状态：正在验证 **第 1 章 - 环境搭建 > 项目初始化**

### 第 1 章 - 环境搭建
- [x] Go 安装与配置
- [x] Docker Desktop 安装
- [x] Docker Compose 环境搭建
  - [x] 创建数据目录（Windows 优化）
  - [x] 移除 docker-compose.yml 过时 version 属性
  - [x] 添加 MinIO 文件存储说明
- [ ] 项目初始化（go mod）
- [ ] 开发工具配置（VSCode/GoLand）

### 第 2 章 - 架构设计
- [ ] 项目目录结构
- [ ] 四层架构设计
- [ ] 依赖注入（Wire）

### 第 3 章 - 基础框架
- [ ] Gin 框架配置
- [ ] GORM 数据库连接
- [ ] Zap 日志系统
- [ ] Redis 集成
- [ ] 配置管理

### 第 4 章 - JWT 认证
- [ ] 用户模型设计
- [ ] JWT 实现原理
- [ ] 认证 API
- [ ] 认证中间件

### 第 5 章 - RBAC 权限
- [ ] Casbin 集成
- [ ] 权限模型设计
- [ ] 权限中间件
- [ ] RBAC 设计

### 第 6 章 - 业务模块
- [ ] 文章模块
- [ ] 分类模块
- [ ] 标签模块
- [ ] 文件上传（MinIO）

### 第 7 章 - 缓存优化
- [ ] Redis 缓存策略
- [ ] 统计 API 优化

### 第 8 章 - 系统管理
- [ ] 动态配置
- [ ] 操作日志
- [ ] 系统监控

### 第 9 章 - Vue 3 前端
- [ ] 项目初始化
- [ ] 布局与菜单
- [ ] 登录认证
- [ ] API 请求封装

### 第 10 章 - 生产部署
- [ ] Docker 部署
- [ ] Nginx 配置
- [ ] 性能优化
- [ ] 故障排查
