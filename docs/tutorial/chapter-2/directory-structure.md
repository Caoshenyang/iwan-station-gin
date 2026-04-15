# 2.2 目录结构

## 完整项目结构

```
iwan-station-gin/
│
├── backend/                          # Go 后端项目
│   ├── cmd/
│   │   └── server/
│   │       └── main.go               # 应用入口
│   │
│   ├── internal/                     # 私有应用代码
│   │   ├── api/                      # HTTP 处理器（控制器）
│   │   │   └── v1/
│   │   │       ├── auth.go           # 认证接口
│   │   │       ├── user.go           # 用户接口
│   │   │       ├── role.go           # 角色接口
│   │   │       ├── menu.go           # 菜单接口
│   │   │       ├── article.go        # 文章接口
│   │   │       ├── category.go       # 分类接口
│   │   │       └── tag.go            # 标签接口
│   │   │
│   │   ├── service/                  # 业务逻辑层
│   │   │   ├── auth.go               # 认证服务
│   │   │   ├── user.go               # 用户服务
│   │   │   ├── role.go               # 角色服务
│   │   │   ├── menu.go               # 菜单服务
│   │   │   ├── article.go            # 文章服务
│   │   │   ├── category.go           # 分类服务
│   │   │   ├── tag.go                # 标签服务
│   │   │   └── helper.go             # 工具函数
│   │   │
│   │   ├── repository/               # 数据访问层
│   │   │   ├── base.go               # 基础仓储
│   │   │   ├── user.go               # 用户仓储
│   │   │   ├── role.go               # 角色仓储
│   │   │   ├── menu.go               # 菜单仓储
│   │   │   ├── article.go            # 文章仓储
│   │   │   ├── category.go           # 分类仓储
│   │   │   ├── tag.go                # 标签仓储
│   │   │   └── repository.go         # 仓储组合
│   │   │
│   │   ├── model/                    # 领域模型
│   │   │   ├── base.go               # 基础模型
│   │   │   └── models.go             # 所有模型
│   │   │
│   │   ├── middleware/               # HTTP 中间件
│   │   │   ├── auth.go               # JWT 认证
│   │   │   ├── permission.go         # 权限检查
│   │   │   └── common.go             # 公共中间件
│   │   │
│   │   ├── pkg/                      # 内部包
│   │   │   ├── database/
│   │   │   │   ├── mysql.go          # MySQL 连接
│   │   │   │   └── redis.go          # Redis 连接
│   │   │   ├── jwt/
│   │   │   │   └── jwt.go            # JWT 管理
│   │   │   ├── crypt/
│   │   │   │   └── crypt.go          # 密码加密
│   │   │   ├── response/
│   │   │   │   └── response.go       # 标准响应
│   │   │   └── logger/
│   │   │       └── logger.go         # 日志配置
│   │   │
│   │   └── router/
│   │       └── router.go             # 路由设置
│   │
│   ├── config/                       # 配置文件
│   │   ├── config.yaml               # 主配置
│   │   └── rbac_model.conf           # RBAC 模型
│   │
│   ├── logs/                         # 日志文件
│   ├── uploads/                      # 上传文件
│   ├── go.mod                        # Go 模块定义
│   └── go.sum                        # Go 模块校验和
│
├── docs/                             # VitePress 文档
│   ├── .vitepress/
│   │   └── config.ts                 # VitePress 配置
│   ├── guide/                        # 教程章节
│   ├── public/                       # 静态资源
│   ├── index.md                      # 首页
│   └── package.json                  # Node 依赖
│
└── web/                              # Vue 3 前端
    └── iwan-web/                      # Nuxt/Vue 项目
```

## 目录用途

### `/backend/cmd/server/`

**用途**：应用入口

包含 `main.go` 文件，负责：
- 加载配置
- 初始化数据库
- 设置路由
- 启动 HTTP 服务器
- 处理优雅关闭

### `/backend/internal/api/v1/`

**用途**：HTTP 请求处理器（控制器层）

对应 Spring 的 `@RestController` 或 MVC 模式中的控制器。

```go
// 用户处理器示例
type UserHandler struct {
    userService *service.UserService
}

func (h *UserHandler) Create(c *gin.Context) {
    // 处理创建用户请求
}
```

### `/backend/internal/service/`

**用途**：业务逻辑层

对应 Spring 的 `@Service` 类。

```go
// 用户服务示例
type UserService struct {
    repos  *repository.Repositories
    logger *zap.Logger
}

func (s *UserService) Create(ctx context.Context, req *CreateRequest) error {
    // 业务逻辑
}
```

### `/backend/internal/repository/`

**用途**：数据访问层

对应 Spring Data JPA 仓储或 MyBatis Mapper。

```go
// 用户仓储示例
type UserRepository struct {
    *BaseRepository
}

func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*User, error) {
    // 数据库查询
}
```

### `/backend/internal/model/`

**用途**：领域模型（实体）

对应 JPA `@Entity` 类。

```go
// 用户模型示例
type User struct {
    BaseModel
    Username string `gorm:"uniqueIndex;not null" json:"username"`
    Password string `json:"-"`
    Email    string `json:"email"`
}
```

### `/backend/internal/middleware/`

**用途**：HTTP 中间件

对应 Spring 过滤器/拦截器。

```go
// 认证中间件示例
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 检查 JWT token
    }
}
```

### `/backend/internal/pkg/`

**用途**：内部工具和包

应用特定的可重用代码：
- `database/` - 数据库连接管理
- `jwt/` - JWT token 处理
- `crypt/` - 密码哈希
- `response/` - 标准化 API 响应
- `logger/` - 日志设置

### `/backend/config/`

**用途**：配置文件

- `config.yaml` - 应用配置
- `rbac_model.conf` - Casbin RBAC 模型定义

## 命名规范

### 文件

| 模式 | 示例 | 用途 |
|------|------|------|
| `xxx.go` | `user.go` | 包文件 |
| `xxx_test.go` | `user_test.go` | 测试文件 |
| `middleware_xxx.go` | `middleware_auth.go` | 中间件文件（可选） |

### 包

| 目录 | 包名 | 导入 |
|-----------|--------|------|
| `internal/api/v1/` | `v1` | `import "iwan-station-gin/internal/api/v1"` |
| `internal/service/` | `service` | `import "iwan-station-gin/internal/service"` |
| `internal/pkg/jwt/` | `jwt` | `import "iwan-station-gin/internal/pkg/jwt"` |

### 结构体

| 类型 | 命名 | 示例 |
|------|------|------|
| 处理器 | `XxxHandler` | `UserHandler` |
| 服务 | `XxxService` | `UserService` |
| 仓储 | `XxxRepository` | `UserRepository` |
| 模型 | `Xxx` | `User` |
| 中间件 | `XxxMiddleware` | `AuthMiddleware` |

### 函数

| 类型 | 命名 | 示例 |
|------|------|------|
| 公开 | `ExportedFunction` | `CreateUser` (PascalCase) |
| 私有 | `internalFunction` | `createUser` (camelCase) |

### 导入路径

```go
// 导入内部包
import (
    "iwan-station-gin/internal/api/v1"
    "iwan-station-gin/internal/service"
    "iwan-station-gin/internal/model"
)

// 导入外部包
import (
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "go.uber.org/zap"
)
```

## 可见性规则

### `internal/` 目录

`internal/` 目录中的代码无法被外部项目导入。

```
✅ 有效：
backend/cmd/server/main.go 导入 internal/service

❌ 无效：
external-project 导入 iwan-station-gin/internal/service
```

这是 Go 的约定，用于隐藏实现细节。

### 导出 vs 未导出

```go
type UserService struct { ... }        // ✅ 可导出（公开）
type userService struct { ... }      // ❌ 未导出（私有）

func (s *UserService) Create() { ... } // ✅ 可导出
func (s *UserService) create() { ... } // ❌ 未导出

const MaxRetries = 3                    // ✅ 可导出
const maxRetries = 3                      // ❌ 未导出
```

## 文件组织最佳实践

### 1. 每个目录一个包

```
✅ 好的做法：
service/
  ├── user.go
  └── auth.go

❌ 不好的做法：
service/
  ├── user/
  │   └── user.go
  └── auth/
      └── auth.go
```

### 2. 相关代码放一起

```
user.go
  ├── UserService struct
  ├── List() 方法
  ├── Create() 方法
  └── Update() 方法
```

### 3. 接口和实现分离

```
repository/
  ├── base.go          # 接口定义
  ├── user.go          # 实现
  └── repository.go    # 组合
```

## 添加新功能流程

当添加新功能（如"文章"）时，创建：

1. **模型** - `internal/model/article.go`
2. **仓储** - `internal/repository/article.go`
3. **服务** - `internal/service/article.go`
4. **处理器** - `internal/api/v1/article.go`
5. **路由** - 更新 `internal/router/router.go`

## 总结

这种结构保持了代码的关注点分离，使项目易于维护和扩展。

下一步：了解「[配置管理](/guide/configuration)」
