# 数据库连接与 GORM

## 📚 前置准备

> 💡 **本教程使用 Docker 运行 PostgreSQL**，无需本地安装数据库。
>
> 启动基础服务：
> ```bash
> ./scripts/start-dev.sh    # macOS/Linux
> .\scripts\start-dev.bat   # Windows
> ```

**Docker 服务连接信息：**

| 服务 | 主机 | 端口 | 用户名 | 密码 |
|------|------|------|--------|------|
| PostgreSQL | localhost | 5432 | iwan | iwan123456 |
| Redis | localhost | 6379 | - | iwan123456 |

---

## 📚 官方文档

- **GORM 官方文档**: https://gorm.io/zh_CN/docs/
- **GORM GitHub**: https://github.com/go-gorm/gorm
- **PostgreSQL 驱动**: https://github.com/go-gorm/postgres

---

## 一、GORM 简介

### 1.1 什么是 GORM？

GORM（Go Object-Relational Mapping）是 Go 语言中最流行的 ORM 库，类似于 Java 中的 Hibernate 或 MyBatis-Plus。

**核心特性**：
- ✅ 全功能 ORM
- ✅ 关联（一对一、一对多、多对多）
- ✅ 事务支持
- ✅ 自动迁移
- ✅ 钩子（Before/After Create/Save/Update/Delete/Find）
- ✅ 预加载（解决 N+1 查询）
- ✅ 复合主键支持
- ✅ SQL 构建器

### 1.2 Go vs Java：ORM 对比

| 特性 | Go (GORM) | Java (Hibernate/MyBatis) |
|------|-----------|--------------------------|
| 实体定义 | struct + tag | class + annotation |
| 主键策略 | 默认 ID 字段 | @Id 注解指定 |
| 关联映射 | 嵌入 struct | @OneToMany/@ManyToOne |
| 软删除 | DeletedAt gorm.DeletedAt | @SQLDelete 注解 |
| 事务处理 | db.Transaction() | @Transactional 注解 |
| 查询构建 | 链式调用 | Criteria API / HQL |

---

## 二、安装依赖

```bash
# 安装 GORM
go get -u gorm.io/gorm

# 安装 PostgreSQL 驱动
go get -u gorm.io/driver/postgres

# 安装 MySQL 驱动（可选）
go get -u gorm.io/driver/mysql
```

> 💡 **提示**：本教程推荐使用 PostgreSQL，同时也支持 MySQL。

### 2.2 连接数据库

本教程支持 **MySQL** 和 **PostgreSQL** 两种数据库，通过配置文件动态选择。

#### 双数据库支持实现

```go
package database

import (
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DbType 数据库类型
type DbType string

const (
	DbTypeMySQL      DbType = "mysql"
	DbTypePostgreSQL DbType = "postgresql"
)

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Type         DbType  // 数据库类型: mysql 或 postgresql
	Host         string
	Port         int
	Username     string
	Password     string
	Database     string
	Charset      string  // 仅 MySQL 使用
	MaxIdleConns int
	MaxOpenConns int
	MaxLifetime  int
}

// InitDB 初始化数据库连接（支持 MySQL 和 PostgreSQL）
func InitDB(cfg *DatabaseConfig) (*gorm.DB, error) {
	// 配置 GORM 日志级别
	gormLogger := logger.Default.LogMode(logger.Info)

	var dialector gorm.Dialector

	// 根据类型选择数据库驱动
	switch cfg.Type {
	case DbTypeMySQL:
		// MySQL DSN
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
			cfg.Username,
			cfg.Password,
			cfg.Host,
			cfg.Port,
			cfg.Database,
			cfg.Charset,
		)
		dialector = mysql.Open(dsn)

	case DbTypePostgreSQL:
		// PostgreSQL DSN
		dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Shanghai",
			cfg.Host,
			cfg.Port,
			cfg.Username,
			cfg.Password,
			cfg.Database,
		)
		dialector = postgres.Open(dsn)

	default:
		return nil, fmt.Errorf("unsupported database type: %s", cfg.Type)
	}

	// 连接数据库
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	})
	if err != nil {
		return nil, err
	}

	// 获取底层的 sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// 设置连接池
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.MaxLifetime) * time.Second)

	return db, nil
}
```

#### 配置文件示例

```yaml
# config/config.yaml
database:
  type: mysql            # 可选: mysql 或 postgresql
  host: localhost
  port: 3306             # MySQL: 3306, PostgreSQL: 5432
  username: iwan
  password: iwan123456
  database: iwan_station
  charset: utf8mb4       # 仅 MySQL 使用
  parse_time: true
  max_idle_conns: 10
  max_open_conns: 100
  max_lifetime: 3600
```

#### 快速切换数据库

只需修改配置文件中的 `type` 和 `port`：

```yaml
# 使用 MySQL
database:
  type: mysql
  port: 3306
  charset: utf8mb4

# 或使用 PostgreSQL
database:
  type: postgresql
  port: 5432
  # charset 配置可以省略，PostgreSQL 不需要
```

**Java 对比**：
```java
// Spring Boot + JPA/Hibernate 配置
@Configuration
public class DatabaseConfig {

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        config.setUsername("root");
        config.setPassword("password");
        config.setMaximumPoolSize(10);
        return new HikariDataSource(config);
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory() {
        // ... JPA 配置
    }
}
```

---

## 三、模型定义

### 3.1 基础模型

GORM 使用 Go 的 struct 来定义模型，通过 tag 来配置字段属性。

```go
package model

import (
    "time"
    "gorm.io/gorm"
)

// 基础模型：包含公共字段
type BaseModel struct {
	ID        uint64         `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// 用户模型
type User struct {
	BaseModel
	Username string `gorm:"size:50;uniqueIndex;not null" json:"username"`
	Password string `gorm:"size:255;not null" json:"-"` // json:"-" 不输出密码
	Email    string `gorm:"size:100;uniqueIndex" json:"email"`
	Phone    string `gorm:"size:20" json:"phone"`
	Status   int    `gorm:"default:1" json:"status"`
}
```

**GORM Tag 说明**：

| Tag | 说明 | MySQL | PostgreSQL |
|-----|------|-------|------------|
| `primarykey` | 主键 | PRIMARY KEY | SERIAL / BIGSERIAL |
| `size:50` | 字段大小 | VARCHAR(50) | VARCHAR(50) |
| `uniqueIndex` | 唯一索引 | UNIQUE INDEX | UNIQUE INDEX |
| `not null` | 非空约束 | NOT NULL | NOT NULL |
| `default:1` | 默认值 | DEFAULT 1 | DEFAULT 1 |
| `index` | 普通索引 | INDEX | INDEX |
| `-` | 忽略字段 | - | - |

> 💡 **推荐使用 GORM 通用标签**：使用 `size:50` 而不是 `type:varchar(50)`，这样代码可以同时兼容 MySQL 和 PostgreSQL。

### 3.2 表名约定

GORM 默认使用 struct 名的复数形式作为表名：

| Struct | 表名 |
|--------|------|
| `User` | `users` |
| `Article` | `articles` |
| `Category` | `categories` |

自定义表名：

```go
// 方法1：实现 Tabler 接口
func (User) TableName() string {
    return "sys_user"
}

// 方法2：使用 Scopes 或临时指定
db.Table("custom_user").Find(&users)
```

**Java 对比**：
```java
// JPA 使用 @Table 指定表名
@Table(name = "sys_user")
public class User {
    // ...
}
```

### 3.3 自动迁移

```go
// 自动迁移表结构
func AutoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &User{},
        &Article{},
        &Category{},
    )
}

// 在 main 函数中调用
func main() {
    db, _ := InitDB(config)
    if err := AutoMigrate(db); err != nil {
        panic("迁移失败: " + err.Error())
    }
}
```

> ⚠️ **注意**：AutoMigrate 只会添加缺失的字段和索引，不会删除已有的列。

---

## 四、CRUD 操作

### 4.1 创建（Create）

```go
// 创建单条记录
func CreateUser(db *gorm.DB, user *User) error {
    return db.Create(user).Error
}

// 使用示例
user := &User{
    Username: "iwan",
    Email:    "iwan@example.com",
    Status:   1,
}
if err := CreateUser(db, user); err != nil {
    log.Println("创建失败:", err)
}
```

**批量创建**：

```go
// 批量插入（更高效）
users := []*User{
    {Username: "user1", Email: "user1@example.com"},
    {Username: "user2", Email: "user2@example.com"},
    {Username: "user3", Email: "user3@example.com"},
}
db.CreateInBatches(users, 100) // 每批 100 条
```

### 4.2 查询（Read）

```go
// 根据 ID 查询
var user User
db.First(&user, 1) // SELECT * FROM users WHERE id = 1

// 根据条件查询
db.Where("username = ?", "iwan").First(&user)

// 查询多条记录
var users []User
db.Find(&users)                    // 查询所有
db.Where("status = ?", 1).Find(&users) // 条件查询

// 动态条件
conditions := map[string]interface{}{
    "status": 1,
    "email":  "iwan@example.com",
}
db.Where(conditions).First(&user)
```

**常用查询方法**：

| 方法 | 说明 | SQL 等价 |
|------|------|----------|
| `First()` | 查询第一条 | `SELECT * FROM users LIMIT 1` |
| `Last()` | 查询最后一条 | `SELECT * FROM users ORDER BY id DESC LIMIT 1` |
| `Take()` | 随机查询一条 | `SELECT * FROM users LIMIT 1` |
| `Find()` | 查询多条 | `SELECT * FROM users` |
| `Pluck()` | 查询单列 | `SELECT username FROM users` |
| `Count()` | 统计数量 | `SELECT COUNT(*) FROM users` |

### 4.3 更新（Update）

```go
// 更新整个 struct
db.Save(&user)

// 更新指定字段
db.Model(&user).Update("email", "new@example.com")

// 更新多个字段
db.Model(&user).Updates(map[string]interface{}{
    "email": "new@example.com",
    "status": 0,
})

// 更新多条记录
db.Model(&User{}).Where("status = ?", 1).Update("status", 0)

// 只更新更改的字段
db.Model(&user).Select("email").Updates(map[string]interface{}{
    "email":  "new@example.com",
    "status": 0, // 这个字段不会更新
})
```

**表达式更新**：

```go
// 原子操作：阅读量 +1
db.Model(&article).Where("id = ?", 1).
    UpdateColumn("view_count", gorm.Expr("view_count + ?", 1))
```

### 4.4 删除（Delete）

```go
// 根据 ID 删除
db.Delete(&user, 1)

// 根据条件删除
db.Where("username = ?", "iwan").Delete(&User{})

// 软删除（如果模型有 DeletedAt）
db.Delete(&user) // 不会真正删除记录，只是设置 deleted_at
```

**永久删除**：

```go
// 强制删除（绕过软删除）
db.Unscoped().Delete(&user)
```

---

## 五、关联查询

### 5.1 一对多关系

```go
// 用户模型（一）
type User struct {
    BaseModel
    Username string
    Articles []Article `gorm:"foreignKey:AuthorID" json:"articles"`
}

// 文章模型（多）
type Article struct {
    BaseModel
    Title     string
    AuthorID  uint64 `gorm:"not null;index"`
    Author    User   `gorm:"foreignKey:AuthorID" json:"author"`
}
```

**查询关联**：

```go
// 预加载：避免 N+1 查询问题
var articles []Article
db.Preload("Author").Find(&articles)

// 等价的 SQL（会被优化为一条 LEFT JOIN）
// SELECT * FROM articles
// SELECT * FROM users WHERE id IN (...)
```

**Java 对比**：
```java
// JPA 使用 @ManyToOne 和 @OneToMany
@Entity
public class Article {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;
}

@Entity
public class User {
    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Article> articles;
}
```

### 5.2 多对多关系

```go
// 文章模型
type Article struct {
    BaseModel
    Title string
    Tags  []Tag `gorm:"many2many:article_tags;" json:"tags"`
}

// 标签模型
type Tag struct {
    BaseModel
    Name     string
    Articles []Article `gorm:"many2many:article_tags;" json:"articles"`
}

// 中间表（自动创建）
type ArticleTag struct {
    ArticleID uint64 `gorm:"primaryKey"`
    TagID     uint64 `gorm:"primaryKey"`
}
```

**关联操作**：

```go
// 创建关联
article := &Article{Title: "GORM 教程"}
db.Create(article)

tag := &Tag{Name: "Go"}
db.Create(tag)

// 添加关联
db.Model(article).Association("Tags").Append(tag)

// 查询关联
db.Preload("Tags").First(&article, 1)

// 删除关联
db.Model(article).Association("Tags").Delete(tag)
```

### 5.3 Joins 查询

```go
// 内连接查询
var results []struct {
    Article
    AuthorName string
    AuthorEmail string
}

db.Table("articles").
    Select("articles.*, users.username as author_name, users.email as author_email").
    Joins("JOIN users ON users.id = articles.author_id").
    Scan(&results)
```

---

## 六、分页与排序

### 6.1 分页查询

```go
// 分页参数
type PageRequest struct {
    Page     int    `form:"page" binding:"min=1"`
    PageSize int    `form:"page_size" binding:"min=1,max=100"`
}

// 分页查询
func GetUsers(db *gorm.DB, req *PageRequest) ([]User, int64, error) {
    var users []User
    var total int64

    // 统计总数
    if err := db.Model(&User{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 分页查询
    offset := (req.Page - 1) * req.PageSize
    err := db.Offset(offset).Limit(req.PageSize).Find(&users).Error

    return users, total, err
}
```

### 6.2 排序

```go
// 单字段排序
db.Order("created_at DESC").Find(&articles)

// 多字段排序
db.Order("status ASC").Order("created_at DESC").Find(&articles)

// 动态排序
orderBy := "created_at"
if req.SortField != "" {
    orderBy = req.SortField
}
orderDir := "DESC"
if req.SortOrder == "asc" {
    orderDir = "ASC"
}
db.Order(orderBy + " " + orderDir).Find(&articles)
```

---

## 七、事务处理

### 7.1 自动事务

```go
// 自动提交/回滚
err := db.Transaction(func(tx *gorm.DB) error {
    // 创建文章
    if err := tx.Create(&article).Error; err != nil {
        return err // 返回错误会自动回滚
    }

    // 创建关联标签
    if err := tx.Create(&tag).Error; err != nil {
        return err
    }

    return nil // 返回 nil 会自动提交
})

if err != nil {
    log.Println("事务失败:", err)
}
```

### 7.2 手动事务

```go
// 开始事务
tx := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
        panic(r)
    }
}()

// 执行操作
if err := tx.Create(&article).Error; err != nil {
    tx.Rollback()
    return err
}

if err := tx.Create(&tag).Error; err != nil {
    tx.Rollback()
    return err
}

// 提交事务
return tx.Commit().Error
```

**Java 对比**：
```java
// Spring 使用 @Transactional 注解
@Transactional(rollbackFor = Exception.class)
public void createArticleWithTags(Article article, List<Tag> tags) {
    articleRepository.save(article);
    tagRepository.saveAll(tags);
    // 异常自动回滚
}
```

---

## 八、查询构建器

### 8.1 条件构建

```go
// WHERE 条件
db.Where("status = ?", 1).Find(&users)                     // status = 1
db.Where("status = ? AND age > ?", 1, 18).Find(&users)     // AND 条件
db.Where("created_at > ?", "2024-01-01").Find(&users)      // 日期比较

// IN 查询
db.Where("id IN ?", []int{1, 2, 3}).Find(&users)

// LIKE 查询
db.Where("username LIKE ?", "%iwan%").Find(&users)

// OR 条件
db.Where("status = ?", 1).Or("status = ?", 2).Find(&users)

// 子查询
db.Where("status IN (?)", db.Table("users").Select("DISTINCT status")).Find(&articles)
```

### 8.2 链式调用

```go
// 动态构建查询
query := db.Model(&Article{})

if status > 0 {
    query = query.Where("status = ?", status)
}

if categoryID > 0 {
    query = query.Where("category_id = ?", categoryID)
}

if keyword != "" {
    query = query.Where("title LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
}

var articles []Article
query.Offset(offset).Limit(pageSize).Find(&articles)
```

---

## 九、最佳实践

### 9.1 使用 Repository 模式

```go
// 定义 Repository 接口
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id uint64) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id uint64) error
    List(ctx context.Context, page, pageSize int) ([]User, int64, error)
}

// 实现
type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) FindByID(ctx context.Context, id uint64) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}
```

### 9.2 使用 Context 超时控制

```go
func (r *userRepository) FindByID(ctx context.Context, id uint64) (*User, error) {
    var user User
    // 带超时的 context
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    err := r.db.WithContext(ctx).First(&user, id).Error
    return &user, err
}
```

### 9.3 避免常见陷阱

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| N+1 查询 | 循环中执行查询 | 使用 `Preload` 预加载 |
| 内存泄漏 | 大量数据一次性加载 | 使用分页或游标 |
| 连接泄露 | 忘记关闭 Rows | 使用 `defer rows.Close()` |
| 软删除忽略 | 查询被软删除的数据 | 使用 `Unscoped()` |

---

## 十、练习任务

1. **基础任务**：创建一个文章管理系统的数据模型（Article、Category、Tag）
2. **进阶任务**：实现文章的分页、搜索、筛选功能
3. **高级任务**：使用事务实现文章发布时同时更新分类统计

---

## 课后阅读

- [GORM 官方文档 - 模型定义](https://gorm.io/zh_CN/docs/models.html)
- [GORM 官方文档 - 关联](https://gorm.io/zh_CN/docs/associations.html)
- [GORM 官方文档 - 事务](https://gorm.io/zh_CN/docs/transactions.html)
