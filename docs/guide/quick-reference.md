---
title: 快速参考
description: "面向熟悉 Go 和后台开发的读者，快速查阅 Gin、GORM、JWT、RBAC、前端对接与部署相关文档。"
---

# 快速参考

本手册提供项目各技术模块的快速参考，适合有经验的开发者查阅。

::: tip 使用方式
如果你正在按章节学习，优先从「[课程大纲](/tutorial/curriculum)」进入；如果你是带着具体问题来查文档，这一页更适合作为索引页。
:::

## 框架指南

- [Gin 框架指南](./framework/gin-guide) - HTTP 路由、中间件、参数处理
- [GORM 指南](./framework/gorm-guide) - 数据库操作、模型定义、关联查询
- [Zap 日志指南](./framework/zap-guide) - 结构化日志、日志轮转

## 认证授权

- [JWT 指南](./auth/jwt-guide) - Token 生成、验证、刷新
- [RBAC 指南](./auth/rbac-guide) - 权限模型、Casbin 配置

## 业务模块

- [用户管理 API](./modules/user-management) - 用户 CRUD、密码管理
- [内容管理 API](./modules/content-management) - 分类、标签、文章
- [统计 API](./modules/statistics) - 数据统计、缓存策略

## 前端开发

- [Vue 3 最佳实践](./frontend/vue3-best-practices) - Composition API、响应式系统
- [API 集成](./frontend/api-integration) - 请求封装、错误处理
- [组件开发](./frontend/component-guide) - 组件设计、状态管理

## 部署运维

- [Docker 参考](./deployment/docker-reference) - Dockerfile、Compose 配置
- [故障排查](./deployment/troubleshooting) - 常见问题、解决方案

## 文档写作

- [文档编写规范](./documentation-writing-standard) - 页面结构、扩展使用矩阵、发布前检查与项目内 Skill 约定
- [Markdown 扩展示例](./markdown-enhancements) - TOC、GitHub Alerts、代码聚焦、代码导入、数学公式与图片懒加载
- [教程验证清单](./tutorial-validation-checklist) - 深度体验整套教程时使用的逐章验证与问题记录模板

## 项目结构

```
server/
├── cmd/server/          # 应用入口
├── internal/
│   ├── api/            # HTTP 处理器
│   ├── service/        # 业务逻辑
│   ├── repository/     # 数据访问
│   ├── model/          # 数据模型
│   ├── middleware/     # 中间件
│   └── pkg/            # 工具函数
└── config/             # 配置文件

admin/
└── src/                # 管理后台前端（教程主线）
```

## 常用命令

```bash
# 运行服务
go run cmd/server/main.go

# 生成 Wire 依赖注入
wire gen ./internal/wire

# 运行测试
go test ./...

# 构建
go build -o bin/server cmd/server/main.go
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_ENV` | 运行环境 | `development` |
| `APP_PORT` | 服务端口 | `8080` |
| `DB_HOST` | 数据库地址 | `localhost` |
| `DB_PORT` | 数据库端口 | `3306` |
| `REDIS_ADDR` | Redis 地址 | `localhost:6379` |

