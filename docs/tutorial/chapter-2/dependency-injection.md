# 依赖注入（Wire）

## 学习目标

完成本章后，你将：
- ✅ 理解依赖注入的原理
- ✅ 掌握 Wire 工具的使用
- ✅ 学会编写 Provider 函数
- ✅ 了解测试中的 Mock 方法

## 什么是依赖注入？

依赖注入（Dependency Injection, DI）是一种设计模式，用于实现控制反转（IoC）。简单来说，就是将对象的创建和依赖关系的管理从对象本身分离出来。

### 与 Spring 对比

```java
// Java Spring
@Service
public class UserService {
    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// Spring 自动注入依赖
```

```go
// Go
type UserService struct {
    repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
    return &UserService{repo: repo}
}

// 手动注入依赖
userRepo := repository.NewUserRepository(db)
userService := service.NewUserService(userRepo)
```

## 为什么需要依赖注入？

### 1. 便于测试

```go
// 使用接口，便于 Mock
type UserRepository interface {
    FindByID(ctx context.Context, id uint64) (*User, error)
}

// Service 只依赖接口
type UserService struct {
    repo UserRepository  // 接口，不是具体实现
}

// 测试时可以注入 Mock
mockRepo := &MockUserRepository{}
userService := NewUserService(mockRepo)
```

### 2. 降低耦合

```go
// 不好的做法：Service 创建自己的依赖
type UserService struct {
    repo *UserRepository
}

func NewUserService() *UserService {
    return &UserService{
        repo: NewUserRepository(db),  // 硬编码依赖
    }
}

// 好的做法：依赖从外部传入
type UserService struct {
    repo *UserRepository
}

func NewUserService(repo *UserRepository) *UserService {
    return &UserService{repo: repo}
}
```

### 3. 提高可维护性

依赖关系集中管理，修改起来更容易。

## 手动依赖注入

在小型项目中，手动注入完全可以满足需求：

```go
// cmd/server/main.go
func main() {
    // 加载配置
    cfg := config.Load("config/config.yaml")

    // 初始化基础设施
    db := database.InitMySQL(cfg.Database)
    rdb := database.InitRedis(cfg.Redis)
    logger := logger.New(cfg.Logger)

    // 初始化 Repository 层
    userRepo := repository.NewUserRepository(db)
    roleRepo := repository.NewRoleRepository(db)
    menuRepo := repository.NewMenuRepository(db)

    repos := &repository.Repositories{
        User: userRepo,
        Role: roleRepo,
        Menu: menuRepo,
    }

    // 初始化 Service 层
    userService := service.NewUserService(repos)
    authService := service.NewAuthService(repos, cfg.JWT, logger)
    roleService := service.NewRoleService(repos)
    menuService := service.NewMenuService(repos)

    services := &service.Services{
        User: userService,
        Auth: authService,
        Role: roleService,
        Menu: menuService,
    }

    // 初始化 Handler 层
    userHandler := v1.NewUserHandler(userService)
    authHandler := v1.NewAuthHandler(authService)
    roleHandler := v1.NewRoleHandler(roleService)

    // 注册路由
    r := gin.Default()
    v1.RegisterRoutes(r, services, logger)

    // 启动服务
    r.Run(":8080")
}
```

### 手动注入的优缺点

**优点：**
- 简单直观
- 不需要额外工具
- 适合小型项目

**缺点：**
- 代码冗长
- 容易出错
- 难以维护大型项目

## Wire 自动依赖注入

Wire 是 Google 开源的 Go 依赖注入代码生成工具。

### 安装 Wire

```bash
go install github.com/google/wire/cmd/wire@latest
```

### Wire 核心概念

#### 1. Provider

Provider 是一个可以创建依赖的函数：

```go
// internal/wire/providers.go
package wire

import (
    "iwan-station-gin/internal/config"
    "iwan-station-gin/internal/pkg/database"
    "iwan-station-gin/internal/pkg/logger"
    "iwan-station-gin/internal/repository"
    "iwan-station-gin/internal/service"
    "iwan-station-gin/internal/api/v1"
)

// Provider: 数据库
func ProvideDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
    return database.InitMySQL(cfg)
}

// Provider: Redis
func ProvideRedis(cfg config.RedisConfig) *redis.Client {
    return database.InitRedis(cfg)
}

// Provider: 日志
func ProvideLogger(cfg config.LoggerConfig) *zap.Logger {
    return logger.New(cfg)
}

// Provider: Repository 集合
func ProvideRepositories(
    db *gorm.DB,
) *repository.Repositories {
    return &repository.Repositories{
        User: repository.NewUserRepository(db),
        Role: repository.NewRoleRepository(db),
        Menu: repository.NewMenuRepository(db),
    }
}

// Provider: Service 集合
func ProvideServices(
    repos *repository.Repositories,
    cfg config.JWTConfig,
    logger *zap.Logger,
) *service.Services {
    return &service.Services{
        User: service.NewUserService(repos),
        Auth: service.NewAuthService(repos, cfg, logger),
        Role: service.NewRoleService(repos),
        Menu: service.NewMenuService(repos),
    }
}

// Provider: Handler 集合
func ProvideHandlers(
    services *service.Services,
) *v1.Handlers {
    return &v1.Handlers{
        User: v1.NewUserHandler(services.User),
        Auth: v1.NewAuthHandler(services.Auth),
        Role: v1.NewRoleHandler(services.Role),
    }
}
```

#### 2. Injector

Injector 是 Wire 生成的函数，用于初始化整个应用：

```go
// internal/wire/wire.go
//go:build wireinject
// +build wireinject

package wire

import (
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
    "iwan-station-gin/internal/config"
    "iwan-station-gin/internal/api/v1"
)

// App 应用结构
type App struct {
    Router   *gin.Engine
    Handlers *v1.Handlers
    Logger   *zap.Logger
    Config   *config.Config
}

// InitializeApp 初始化应用
func InitializeApp(cfgPath string) (*App, error) {
    wire.Build(
        // 加载配置
        config.LoadConfig,

        // 基础设施
        ProvideDB,
        ProvideRedis,
        ProvideLogger,

        // Repository 层
        ProvideRepositories,

        // Service 层
        ProvideServices,

        // Handler 层
        ProvideHandlers,

        // 应用
        NewApp,
    )
    return &App{}, nil
}
```

#### 3. Wire.Build

`wire.Build` 告诉 Wire 哪些 Provider 可以使用，Wire 会自动分析依赖关系并生成代码。

### 运行 Wire

```bash
cd internal/wire
wire
```

Wire 会生成 `wire_gen.go` 文件：

```go
// Code generated by Wire. DO NOT EDIT.

package wire

import (
    "iwan-station-gin/internal/config"
    "iwan-station-gin/internal/api/v1"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

func InitializeApp(cfgPath string) (*App, error) {
    config, err := config.LoadConfig(cfgPath)
    if err != nil {
        return nil, err
    }
    db, err := ProvideDB(config.Database)
    if err != nil {
        return nil, err
    }
    redisClient := ProvideRedis(config.Redis)
    logger := ProvideLogger(config.Logger)
    repositories := ProvideRepositories(db)
    services := ProvideServices(repositories, config.JWT, logger)
    handlers := ProvideHandlers(services)
    app := NewApp(config, handlers, logger)
    return app, nil
}
```

## 完整的 Wire 示例

### 1. 定义应用结构

```go
// internal/app/app.go
package app

import (
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
    "iwan-station-gin/internal/api/v1"
    "iwan-station-gin/internal/config"
)

type App struct {
    Config   *config.Config
    Router   *gin.Engine
    Handlers *v1.Handlers
    Logger   *zap.Logger
}

func NewApp(
    cfg *config.Config,
    handlers *v1.Handlers,
    logger *zap.Logger,
) *App {
    r := gin.Default()

    // 注册路由
    v1.RegisterRoutes(r, handlers, logger)

    return &App{
        Config:   cfg,
        Router:   r,
        Handlers: handlers,
        Logger:   logger,
    }
}

func (a *App) Run() error {
    addr := fmt.Sprintf(":%d", a.Config.Server.Port)
    a.Logger.Info("Starting server", zap.String("address", addr))
    return a.Router.Run(addr)
}
```

### 2. 编写 Wire 文件

```go
// internal/wire/wire.go
//go:build wireinject
// +build wireinject

package wire

import (
    "iwan-station-gin/internal/app"
    "iwan-station-gin/internal/api/v1"
    "iwan-station-gin/internal/config"
    "iwan-station-gin/internal/pkg/database"
    "iwan-station-gin/internal/pkg/logger"
    "iwan-station-gin/internal/repository"
    "iwan-station-gin/internal/service"
)

// InitializeApp 初始化应用
func InitializeApp(cfgPath string) (*app.App, error) {
    wire.Build(
        // 配置
        config.LoadConfig,

        // 基础设施
        database.ProvideDB,
        database.ProvideRedis,
        logger.ProvideLogger,

        // Repository 层
        repository.ProvideUserRepository,
        repository.ProvideRoleRepository,
        repository.ProvideMenuRepository,
        repository.ProvideRepositories,

        // Service 层
        service.ProvideUserService,
        service.ProvideAuthService,
        service.ProvideRoleService,
        service.ProvideMenuService,
        service.ProvideServices,

        // Handler 层
        v1.ProvideUserHandler,
        v1.ProvideAuthHandler,
        v1.ProvideRoleHandler,
        v1.ProvideHandlers,

        // 应用
        app.NewApp,
    )
    return &app.App{}, nil
}
```

### 3. Provider 函数集合

```go
// internal/repository/providers.go
package repository

func ProvideUserRepository(db *gorm.DB) *UserRepository {
    return NewUserRepository(db)
}

func ProvideRoleRepository(db *gorm.DB) *RoleRepository {
    return NewRoleRepository(db)
}

func ProvideMenuRepository(db *gorm.DB) *MenuRepository {
    return NewMenuRepository(db)
}

func ProvideRepositories(
    userRepo *UserRepository,
    roleRepo *RoleRepository,
    menuRepo *MenuRepository,
) *Repositories {
    return &Repositories{
        User: userRepo,
        Role: roleRepo,
        Menu: menuRepo,
    }
}
```

### 4. 生成代码

```bash
cd internal/wire
wire
```

### 5. 使用生成的代码

```go
// cmd/server/main.go
package main

import (
    "flag"
    "iwan-station-gin/internal/wire"

    "go.uber.org/zap"
)

var configFile = flag.String("c", "config/config.yaml", "配置文件路径")

func main() {
    flag.Parse()

    // 使用 Wire 生成的初始化函数
    app, err := wire.InitializeApp(*configFile)
    if err != nil {
        panic(err)
    }

    // 启动应用
    if err := app.Run(); err != nil {
        app.Logger.Fatal("Failed to start server", zap.Error(err))
    }
}
```

## Wire 高级用法

### 1. Provider Set

将相关的 Provider 分组：

```go
// internal/wire/sets.go
package wire

var DatabaseSet = wire.NewSet(
    ProvideDB,
    ProvideRedis,
)

var RepositorySet = wire.NewSet(
    ProvideUserRepository,
    ProvideRoleRepository,
    ProvideMenuRepository,
    ProvideRepositories,
)

var ServiceSet = wire.NewSet(
    ProvideUserService,
    ProvideAuthService,
    ProvideRoleService,
    ProvideMenuService,
    ProvideServices,
)
```

使用 Provider Set：

```go
func InitializeApp(cfgPath string) (*app.App, error) {
    wire.Build(
        config.LoadConfig,
        DatabaseSet,
        RepositorySet,
        ServiceSet,
        HandlerSet,
        app.NewApp,
    )
    return &app.App{}, nil
}
```

### 2. 接口绑定

```go
// 定义接口
type CacheService interface {
    Get(key string) (string, error)
    Set(key, value string) error
}

// 实现接口
type RedisCache struct {
    client *redis.Client
}

func ProvideCache(client *redis.Client) CacheService {
    return &RedisCache{client: client}
}

// Wire 自动绑定
wire.Bind(new(CacheService), new(*RedisCache))
```

### 3. 结构体作为 Provider

```go
type Services struct {
    User *UserService
    Auth *AuthService
}

var ServiceSet = wire.NewSet(
    // 自动填充 Services 结构体
    wire.Struct(new(Services), "*"),
    ProvideUserService,
    ProvideAuthService,
)
```

## 测试中的依赖注入

### 使用 Wire 便于测试

```go
// 测试时使用 Mock
type MockUserRepository struct {
    Users []*User
}

func (m *MockUserRepository) FindByID(ctx context.Context, id uint64) (*User, error) {
    for _, user := range m.Users {
        if user.ID == id {
            return user, nil
        }
    }
    return nil, ErrUserNotFound
}

// 测试代码
func TestUserService(t *testing.T) {
    mockRepo := &MockUserRepository{
        Users: []*User{
            {ID: 1, Username: "test"},
        },
    }

    userService := NewUserService(mockRepo)

    user, err := userService.GetByID(context.Background(), 1)
    assert.NoError(t, err)
    assert.Equal(t, "test", user.Username)
}
```

## Java vs Go 对比

| 方面 | Java Spring | Go Wire |
|------|-------------|---------|
| 注入方式 | 反射 + 注解 | 代码生成 |
| 运行时开销 | 有（反射） | 无（编译时） |
| 类型安全 | 弱（运行时发现） | 强（编译时发现） |
| 调试难度 | 困难 | 简单 |
| 学习曲线 | 陡峭 | 平缓 |

## 最佳实践

### ✅ 应该做的

1. **使用接口抽象**：便于测试和替换实现
2. **Provider 职责单一**：每个 Provider 只做一件事
3. **合理分组**：使用 Provider Set 管理复杂项目
4. **测试友好**：设计便于 Mock 的依赖关系

### ❌ 不应该做的

1. **过度设计**：简单项目不需要 Wire
2. **循环依赖**：Wire 不支持循环依赖
3. **Provider 中做复杂逻辑**：保持 Provider 简单

## 下一步

了解依赖注入后，让我们学习「[用户模型设计](../chapter-4/user-model.html)」
