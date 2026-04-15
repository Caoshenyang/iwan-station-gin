# 快速参考

本手册提供项目各技术模块的快速参考，适合有经验的开发者查阅。

## 框架指南

- [Gin 框架指南](./framework/gin-guide.md) - HTTP 路由、中间件、参数处理
- [GORM 指南](./framework/gorm-guide.md) - 数据库操作、模型定义、关联查询
- [Zap 日志指南](./framework/zap-guide.md) - 结构化日志、日志轮转

## 认证授权

- [JWT 指南](./auth/jwt-guide.md) - Token 生成、验证、刷新
- [RBAC 指南](./auth/rbac-guide.md) - 权限模型、Casbin 配置

## 业务模块

- [用户管理 API](./modules/user-management.md) - 用户 CRUD、密码管理
- [内容管理 API](./modules/content-management.md) - 分类、标签、文章
- [统计 API](./modules/statistics.md) - 数据统计、缓存策略

## 前端开发

- [Vue 3 最佳实践](./frontend/vue3-best-practices.md) - Composition API、响应式系统
- [API 集成](./frontend/api-integration.md) - 请求封装、错误处理
- [组件开发](./frontend/component-guide.md) - 组件设计、状态管理

## 部署运维

- [Docker 参考](./deployment/docker-reference.md) - Dockerfile、Compose 配置
- [故障排查](./deployment/troubleshooting.md) - 常见问题、解决方案

## 项目结构

```
backend/
├── cmd/server/          # 应用入口
├── internal/
│   ├── api/            # HTTP 处理器
│   ├── service/        # 业务逻辑
│   ├── repository/     # 数据访问
│   ├── model/          # 数据模型
│   ├── middleware/     # 中间件
│   └── pkg/            # 工具函数
└── config/             # 配置文件
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
