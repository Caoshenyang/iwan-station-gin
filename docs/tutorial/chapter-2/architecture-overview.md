# 架构概览

## 系统架构

本教程采用经典的**分层架构**设计，确保代码的可维护性和可测试性。

```mermaid
graph TB
    subgraph Clients["📱 客户端层"]
        Vue["Vue 3 前端"]
        Mobile["移动端<br/>(可选)"]
        Third["第三方应用<br/>(可选)"]
    end

    subgraph Gateway["🌐 API 网关层"]
        Nginx["Nginx 反向代理<br/>负载均衡 · SSL 终止 · 静态文件"]
    end

    subgraph Application["⚙️ 应用层 (Gin)"]
        Router["Gin 路由器"]
        Middleware["中间件<br/>认证 · 权限 · CORS"]
        Handler["Handler<br/>参数绑定 · 参数验证 · 调用服务"]
    end

    subgraph Business["💼 业务层 (Service)"]
        AuthService["AuthService<br/>登录 · 注册 · Token"]
        UserService["UserService<br/>用户管理 · 业务规则"]
        ArticleService["ArticleService<br/>文章管理 · 业务逻辑"]
    end

    subgraph Data["🗄️ 数据访问层 (Repository)"]
        UserRepo["UserRepository<br/>CRUD · 查询构建"]
        ArticleRepo["ArticleRepository<br/>CRUD · 关联查询"]
        RoleRepo["RoleRepository<br/>CRUD · 复杂查询"]
    end

    subgraph Storage["💾 数据层"]
        PostgreSQL[("PostgreSQL<br/>(GORM)")]
        Redis[("Redis<br/>(go-redis)")]
        MinIO[("MinIO<br/>(minio-go)")]
    end

    Clients -->|"HTTP/JSON"| Gateway
    Gateway --> Application
    Router --> Middleware
    Middleware --> Handler
    Handler --> Business
    Business --> Data
    Data --> Storage

    style Clients fill:#e1f5fe
    style Gateway fill:#fff3e0
    style Application fill:#f3e5f5
    style Business fill:#e8f5e9
    style Data fill:#fce4ec
    style Storage fill:#fff9c4
```

---

## 分层架构详解

### 1. Handler 层（控制器）

**目录**: `internal/api/v1/`

**职责**:
- 处理 HTTP 请求和响应
- 参数绑定和验证
- 调用 Service 层
- 格式化响应数据

**代码示例**:

```go
// internal/api/v1/user.go
package v1

type UserHandler struct {
    userService *service.UserService
}

// List 获取用户列表
func (h *UserHandler) List(c *gin.Context) {
    // 1. 绑定参数
    var req service.ListRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Error(c, err)
        return
    }

    // 2. 调用服务
    users, total, err := h.userService.List(c.Request.Context(), &req)
    if err != nil {
        response.Error(c, err)
        return
    }

    // 3. 返回响应
    response.Page(c, users, total, req.Page, req.PageSize)
}
```

**设计原则**:
- ✅ 薄层设计 - 只处理 HTTP 相关逻辑
- ✅ 不包含业务逻辑
- ✅ 统一错误处理
- ✅ 统一响应格式

---

### 2. Service 层（业务逻辑）

**目录**: `internal/service/`

**职责**:
- 实现业务逻辑
- 协调多个 Repository
- 事务管理
- 调用外部服务

**代码示例**:

```go
// internal/service/user.go
package service

type UserService struct {
    userRepo *repository.UserRepository
    roleRepo *repository.RoleRepository
    logger   *zap.Logger
}

// Create 创建用户
func (s *UserService) Create(ctx context.Context, req *CreateRequest) error {
    // 1. 业务验证
    if err := s.validateUsername(req.Username); err != nil {
        return err
    }

    // 2. 检查用户是否存在
    exists, err := s.userRepo.ExistsByUsername(ctx, req.Username)
    if err != nil {
        return err
    }
    if exists {
        return ErrUserAlreadyExists
    }

    // 3. 创建用户
    user := &model.User{
        Username: req.Username,
        Password: s.hashPassword(req.Password),
    }

    // 4. 保存到数据库
    return s.userRepo.Create(ctx, user)
}
```

**设计原则**:
- ✅ 包含业务规则
- ✅ 事务边界管理
- ✅ 可独立测试
- ❌ 不包含 HTTP 相关逻辑

---

### 3. Repository 层数据访问）

**目录**: `internal/repository/`

**职责**:
- 数据库 CRUD 操作
- 复杂查询构建
- 数据模型转换

**代码示例**:

```go
// internal/repository/user.go
package repository

type UserRepository struct {
    db *gorm.DB
}

// FindByID 根据 ID 查找用户
func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).First(&user, id).Error
    return &user, err
}

// ExistsByUsername 检查用户名是否存在
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
    var count int64
    err := r.db.WithContext(ctx).
        Model(&model.User{}).
        Where("username = ?", username).
        Count(&count).Error
    return count > 0, err
}
```

**设计原则**:
- ✅ 只包含数据访问逻辑
- ✅ 不包含业务逻辑
- ✅ 返回领域模型
- ❌ 不调用其他 Repository

---

## 依赖注入

### 构造器注入模式

```go
// 1. Repository 层
func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

// 2. Service 层
func NewUserService(
    userRepo *UserRepository,
    roleRepo *RoleRepository,
    logger *zap.Logger,
) *UserService {
    return &UserService{
        userRepo: userRepo,
        roleRepo: roleRepo,
        logger:   logger,
    }
}

// 3. Handler 层
func NewUserHandler(userService *service.UserService) *UserHandler {
    return &UserHandler{
        userService: userService,
    }
}

// 4. 初始化 (main.go 或 wire.go)
func main() {
    // 初始化依赖
    db := database.InitDB(cfg)
    userRepo := repository.NewUserRepository(db)
    roleRepo := repository.NewRoleRepository(db)
    userService := service.NewUserService(userRepo, roleRepo, logger)
    userHandler := v1.NewUserHandler(userService)

    // 注册路由
    r := gin.Default()
    r.GET("/api/v1/users", userHandler.List)
}
```

### 依赖关系图

```mermaid
graph TB
    DB[(Database<br/>GORM)]

    subgraph Repositories["Repository 层"]
        UserRepo["UserRepository"]
        RoleRepo["RoleRepository"]
        ArticleRepo["ArticleRepository"]
    end

    subgraph Services["Service 层"]
        UserService["UserService"]
    end

    subgraph Handlers["Handler 层"]
        UserHandler["UserHandler"]
    end

    DB --> UserRepo
    DB --> RoleRepo
    DB --> ArticleRepo

    UserRepo --> UserService
    RoleRepo --> UserService
    ArticleRepo --> UserService

    UserService --> UserHandler

    style DB fill:#fff9c4
    style Repositories fill:#fce4ec
    style Services fill:#e8f5e9
    style Handlers fill:#f3e5f5
```

---

## 数据流向

### 请求处理流程

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant Nginx as 🌐 Nginx
    participant Router as 🔀 Gin Router
    participant Middleware as ⚙️ Middleware
    participant Handler as 📝 Handler
    participant Service as 💼 Service
    participant Repository as 🗄️ Repository
    participant DB as 💾 PostgreSQL

    User->>Nginx: HTTP 请求
    Note over Nginx: 静态文件 · SSL · 负载均衡
    Nginx->>Router: 转发请求

    Router->>Middleware: 中间件处理
    Note over Middleware: 认证 · 权限 · CORS

    Middleware->>Handler: 通过验证
    Note over Handler: 参数绑定 · 参数验证

    Handler->>Service: 调用业务逻辑
    Note over Service: 业务规则 · 事务管理

    Service->>Repository: 数据操作
    Note over Repository: CRUD · 查询构建

    Repository->>DB: SQL 执行
    DB-->>Repository: 返回数据
    Repository-->>Service: 领域模型
    Service-->>Handler: 业务结果
    Handler-->>User: JSON 响应
```

## 与 Spring Boot 对比

### 分层架构对比

| Spring Boot | Gin | 说明 |
|-------------|-----|------|
| `@RestController` | Handler (API) | 控制器层 |
| `@Service` | Service | 业务层 |
| `@Repository` | Repository | 数据访问层 |
| `@Component` | - | 组件 |

### 依赖注入对比

**Spring Boot (自动注入)**:
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

**Gin (显式注入)**:
```go
func NewUserService(userRepo *UserRepository) *UserService {
    return &UserService{
        userRepo: userRepo,
    }
}
```

### 事务管理对比

**Spring Boot**:
```java
@Transactional
public void createUser(User user) {
    // 自动事务管理
}
```

**Gin**:
```go
func (s *Service) CreateUser(ctx context.Context, user *User) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 手动事务管理
        return nil
    })
}
```

---

## 设计决策

### 为什么选择分层架构？

**优势**:
- ✅ **可测试性** - 每层可独立测试
- ✅ **可维护性** - 层间变化互不影响
- ✅ **可扩展性** - 易于添加新功能
- ✅ **可重用性** - 服务可在不同接口间复用

**权衡**:
- ⚠️ 更多文件和目录
- ⚠️ 略微更多的样板代码
- ⚠️ 初始复杂度较高

### 为什么选择 Gin？

**优势**:
- ⚡ 高性能（基于 httprouter）
- 🎯 简洁专注
- 🔧 良好的中间件生态
- 👥 社区活跃

**与其他框架对比**:

| 框架 | 性能 | 学习曲线 | 功能丰富度 |
|------|------|----------|-----------|
| Gin | ⭐⭐⭐⭐⭐ | 简单 | 适中 |
| Echo | ⭐⭐⭐⭐⭐ | 简单 | 适中 |
| Beego | ⭐⭐⭐ | 中等 | 丰富 |
| Fiber | ⭐⭐⭐⭐⭐ | 简单 | 适中 |

---

## 错误处理策略

### 分层错误处理

```go
// Repository 层 - 返回原始错误
func (r *UserRepository) FindByID(id uint64) (*User, error) {
    var user User
    err := r.First(&user, id).Error
    return &user, err  // GORM 错误
}

// Service 层 - 包装为业务错误
var (
    ErrUserNotFound = errors.New("用户不存在")
    ErrUserExists   = errors.New("用户已存在")
)

func (s *UserService) GetUser(id uint64) (*User, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, err
    }
    return user, nil
}

// Handler 层 - 转换为 HTTP 响应
func (h *UserHandler) GetUser(c *gin.Context) {
    user, err := h.service.GetUser(id)
    if err != nil {
        if errors.Is(err, ErrUserNotFound) {
            response.Error(c, response.NotFound)
        } else {
            response.Error(c, response.ServerError)
        }
        return
    }
    response.Success(c, user)
}
```

```mermaid
flowchart LR
    A[Hard edge] -->|Link text| B(Round edge)
    B --> C{Decision}
    C -->|One| D[Result one]
    C -->|Two| E[Result two]
```

---

## 下一步

了解「[目录结构](./directory-structure)」详细说明
