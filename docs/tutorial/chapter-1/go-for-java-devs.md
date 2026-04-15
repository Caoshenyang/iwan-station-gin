# 1.5 Go vs Java：快速入门指南

如果你有 Java 背景，本指南将帮助你快速理解 Go 的对应概念。

## 基础语法对比

### Hello World

**Java**
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

**Go**
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

### 变量声明

| Java | Go | 说明 |
|------|-----|-------|
| `String name = "John";` | `name := "John"` | 类型推断 |
| `final int AGE = 25;` | `const AGE = 25` | 常量 |
| `List<String> list;` | `var list []string` | 切片 |
| `Map<String, Integer> map;` | `var map map[string]int` | 字典 |

### 函数定义

**Java**
```java
public int add(int a, int b) {
    return a + b;
}
```

**Go**
```go
func add(a, b int) int {
    return a + b
}
```

### 多返回值（Go 特有！）

**Java** - 需要创建包装类
```java
public class Result {
    public int value;
    public String error;
}
```

**Go** - 原生支持
```go
func getValue() (int, error) {
    return 42, nil
}

value, err := getValue()
```

## 面向对象概念

### 类 vs 结构体

**Java**
```java
public class User {
    private String name;
    private int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() {
        return name;
    }
}
```

**Go**
```go
type User struct {
    Name string `json:"name"`
    Age  int    `json:"age"`
}

func NewUser(name string, age int) *User {
    return &User{Name: name, Age: age}
}
```

### 接口

**Java**
```java
public interface Repository {
    User findById(Long id);
    void save(User user);
}
```

**Go**
```go
type Repository interface {
    FindByID(id uint64) (*User, error)
    Save(user *User) error
}
```

**关键区别**：Go 接口是**隐式实现**的 - 不需要 `implements` 关键字！

### 方法

**Java**
```java
public class User {
    public String getFullName() {
        return name;
    }
}
```

**Go**
```go
func (u *User) GetFullName() string {
    return u.Name
}
```

## 错误处理

### Java 异常机制

```java
try {
    User user = repository.findById(1L);
} catch (NotFoundException e) {
    logger.error("User not found");
} catch (Exception e) {
    logger.error("Error");
}
```

### Go 错误返回

```go
user, err := repository.FindByID(1)
if err != nil {
    if errors.Is(err, ErrNotFound) {
        log.Error("User not found")
    } else {
        log.Error("Error", zap.Error(err))
    }
    return
}
```

**核心概念**：Go 使用显式的错误返回值，而不是异常机制。

## 并发编程

### Java 线程

```java
ExecutorService executor = Executors.newFixedThreadPool(10);
executor.submit(() -> {
    // 执行任务
});
```

### Go 协程

```go
go func() {
    // 执行任务
}()
```

**通道通信**：
```go
ch := make(chan int)
go func() {
    ch <- 42  // 发送
}()
value := <-ch  // 接收
```

## 集合类型

| Java | Go | 描述 |
|------|-----|-------------|
| `ArrayList<T>` | `[]T` | 动态数组 |
| `HashMap<K,V>` | `map[K]V` | 键值对 |
| `HashSet<T>` | `map[T]struct{}` | 唯一值集合 |

### 切片操作

```go
// 创建
nums := []int{1, 2, 3}

// 追加
nums = append(nums, 4)

// 切片
subset := nums[1:3]  // [2, 3]

// 遍历
for i, num := range nums {
    fmt.Println(i, num)
}
```

## 包管理

### Maven/Gradle vs Go Modules

**Maven (pom.xml)**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

**Go Modules (go.mod)**
```go
require github.com/gin-gonic/gin v1.10.0
```

### 常用命令

| Maven | Go Module |
|-------|-----------|
| `mvn clean install` | `go mod tidy` |
| `mvn dependency:tree` | `go mod graph` |
| `mvn test` | `go test ./...` |

## 框架对比

### Spring Boot vs Gin

| Spring Boot | Gin |
|-------------|-----|
| `@RestController` | 处理器函数 |
| `@GetMapping` | `router.GET()` |
| `@RequestBody` | `c.ShouldBindJSON()` |
| `@Autowired` | 构造器注入 |
| 应用上下文 | 手动依赖注入 |

### 示例：创建接口

**Spring Boot**
```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return ResponseEntity.ok(user);
    }
}
```

**Gin**
```go
func (h *UserHandler) GetByID(c *gin.Context) {
    id, _ := getUint64IDParam(c)
    user, err := h.userService.GetByID(c.Request.Context(), id)
    if err != nil {
        response.Error(c, response.NotFound)
        return
    }
    response.SuccessWithData(c, user)
}
```

## 数据库访问

### Spring Data JPA vs GORM

**Spring Data JPA**
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
```

**GORM**
```go
type UserRepository struct {
    *BaseRepository
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*User, error) {
    var user User
    err := r.DB.WithContext(ctx).Where("username = ?", username).First(&user).Error
    return &user, err
}
```

## 常用模式

### 依赖注入

**Java (Spring)**
```java
@Service
public class UserService {
    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

**Go**
```go
type UserService struct {
    repos  *Repositories
    logger *zap.Logger
}

func NewUserService(repos *Repositories, logger *zap.Logger) *UserService {
    return &UserService{
        repos:  repos,
        logger: logger,
    }
}
```

### Context 使用

**Go 的 `context`** 类似于 Spring 的事务上下文：

```go
func (s *Service) DoSomething(ctx context.Context) error {
    // ctx 携带截止时间、取消信号、值
    return s.repository.Create(ctx, model)
}
```

## 关键要点

1. **更简洁的语法** - 比 Java 更少的样板代码
2. **显式错误处理** - 没有异常，手动检查错误
3. **结构体代替类** - 没有继承，使用组合
4. **接口** - 隐式实现，更灵活
5. **协程** - 轻量级并发无处不在
6. **包** - 一个目录一个包，结构更简单

## Java 开发者资源

- [Go 语言漫游](https://go.dev/tour/)
- [Go by Example](https://gobyexample.com/)
- [Effective Go](https://go.dev/doc/effective_go)

准备好深入了解「[项目架构](/guide/architecture)」了吗？
