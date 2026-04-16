---
title: "用户模型设计"
description: "用户模型是认证系统的基础，它决定了："
---

# 用户模型设计

## 学习目标

完成本章后，你将：
- ✅ 理解 GORM 模型定义
- ✅ 掌握用户表结构设计
- ✅ 学会数据验证规则
- ✅ 了解模型关联关系

## 为什么需要用户模型？

用户模型是认证系统的基础，它决定了：
- 用户数据的存储方式
- 认证流程的实现
- 权限系统的设计

## 用户表结构

### SQL 定义

**MySQL 版本：**

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    nickname VARCHAR(50) COMMENT '昵称',
    email VARCHAR(100) UNIQUE COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    avatar VARCHAR(255) COMMENT '头像URL',
    status TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    remark VARCHAR(255) COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间（软删除）',

    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

**PostgreSQL 版本：**

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    avatar VARCHAR(255),
    status INTEGER DEFAULT 1,
    remark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.password IS '密码（加密）';
COMMENT ON COLUMN users.status IS '状态：1=启用，0=禁用';
```

## GORM 模型定义

### 基础模型

创建 `internal/model/base.go`：

```go
package model

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel 基础模型，包含通用字段
type BaseModel struct {
	ID        uint64         `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}
```

### 用户模型

创建 `internal/model/user.go`：

```go
package model

// User 用户模型
type User struct {
	BaseModel
	Username string `gorm:"size:50;uniqueIndex;not null" json:"username" binding:"required"`
	Password string `gorm:"size:255;not null" json:"-" binding:"required,min=6"`
	Nickname string `gorm:"size:50" json:"nickname" binding:"required"`
	Email    string `gorm:"size:100;uniqueIndex" json:"email" binding:"omitempty,email"`
	Phone    string `gorm:"size:20" json:"phone" binding:"omitempty,len=11"`
	Avatar   string `gorm:"size:255" json:"avatar"`
	Status   int    `gorm:"default:1" json:"status"`
	Remark   string `gorm:"size:255" json:"remark"`

	// 关联关系（不存储在数据库）
	Roles []Role `gorm:"many2many:user_roles;joinForeignKey:UserID;joinReferences:RoleID" json:"roles,omitempty"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// BeforeCreate GORM 钩子：创建前
func (u *User) BeforeCreate(tx *gorm.DB) error {
	// 可以在这里添加创建前的逻辑
	return nil
}

// AfterFind GORM 钩子：查询后
func (u *User) AfterFind(tx *gorm.DB) error {
	// 清除密码，防止泄露
	u.Password = ""
	return nil
}
```

## 模型字段说明

### GORM 标签解析

```go
// 完整示例（推荐写法 - 兼容 MySQL 和 PostgreSQL）
Username string `gorm:"size:50;uniqueIndex;not null" json:"username" binding:"required"`

// GORM 标签部分
size:50                 // 字段大小（VARCHAR(50)）
uniqueIndex             // 唯一索引
not null                // 非空约束

// JSON 标签部分
json:"username"          // JSON 序列化时的字段名

// Binding 标签部分
binding:"required"       // 请求验证规则
```

**不推荐的写法**（仅适用于 MySQL）：
```go
// ❌ MySQL 特定语法
Username string `gorm:"type:varchar(50);primary_key;auto_increment;comment:用户名"`

// ✅ 推荐使用通用标签
Username string `gorm:"size:50;primarykey"`  // 同时兼容 MySQL 和 PostgreSQL
```

### 常用 GORM 标签

| 标签 | 说明 | MySQL | PostgreSQL | 示例 |
|------|------|-------|------------|------|
| `primarykey` | 主键 | PRIMARY KEY | SERIAL/BIGSERIAL | `primarykey` |
| `size` | 字段大小 | VARCHAR(n) | VARCHAR(n) | `size:50` |
| `uniqueIndex` | 唯一索引 | UNIQUE INDEX | UNIQUE INDEX | `uniqueIndex` |
| `index` | 普通索引 | INDEX | INDEX | `index` |
| `not null` | 非空 | NOT NULL | NOT NULL | `not null` |
| `default` | 默认值 | DEFAULT n | DEFAULT n | `default:1` |
| `-` | 忽略字段 | - | - | `json:"-"` |

> 💡 **推荐使用通用标签**：
> - 使用 `size:50` 而不是 `type:varchar(50)`
> - 使用 `primarykey` 而不是 `primary_key;auto_increment`
> - 这样可以让代码同时兼容 MySQL 和 PostgreSQL

### JSON 标签

```go
Username string `json:"username"`           // 正常序列化
Password string `json:"-"`                  // 不序列化（密码）
Avatar   string `json:"avatar,omitempty"`   // 为空时省略
```

### Binding 验证标签

```go
Username string `binding:"required"`                    // 必填
Email    string `binding:"omitempty,email"`            // 可选，但填写时必须是邮箱
Password string `binding:"required,min=6"`              // 必填，最少6位
Phone    string `binding:"omitempty,len=11"`            // 可选，但填写时必须是11位
Nickname string `binding:"required,max=50"`             // 必填，最多50字符
```

## 数据验证

### 模型验证

```go
package model

import (
	"errors"
	"strings"
	"unicode"
)

// Validate 验证用户数据
func (u *User) Validate() error {
	// 用户名验证
	if strings.TrimSpace(u.Username) == "" {
		return errors.New("用户名不能为空")
	}
	if len(u.Username) < 3 || len(u.Username) > 50 {
		return errors.New("用户名长度必须在3-50之间")
	}

	// 昵称验证
	if strings.TrimSpace(u.Nickname) == "" {
		return errors.New("昵称不能为空")
	}

	// 密码验证
	if len(u.Password) < 6 {
		return errors.New("密码长度不能少于6位")
	}

	// 邮箱验证（如果提供）
	if u.Email != "" && !strings.Contains(u.Email, "@") {
		return errors.New("邮箱格式不正确")
	}

	return nil
}

// ValidatePassword 验证密码强度
func ValidatePassword(password string) error {
	if len(password) < 6 {
		return errors.New("密码长度不能少于6位")
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	// 至少包含小写字母和数字
	if !hasLower || !hasNumber {
		return errors.New("密码必须包含小写字母和数字")
	}

	return nil
}
```

## 模型关联

### 用户-角色关系（多对多）

```go
// User 用户模型
type User struct {
	BaseModel
	Username string `json:"username"`
	// ... 其他字段

	// 多对多关系
	Roles []Role `gorm:"many2many:user_roles;joinForeignKey:UserID;joinReferences:RoleID" json:"roles,omitempty"`
}

// Role 角色模型
type Role struct {
	BaseModel
	Name string `json:"name"`
	Code string `json:"code"`
	// ... 其他字段

	// 多对多关系
	Users []User `gorm:"many2many:user_roles" json:"users,omitempty"`
}

// UserRole 关联表模型
type UserRole struct {
	ID        uint64    `gorm:"primary_key;auto_increment" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	RoleID    uint64    `gorm:"not null;index" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
}
```

### 使用关联

```go
// 创建用户并分配角色
func CreateUserWithRole(db *gorm.DB) error {
	user := &User{
		Username: "testuser",
		Password: "hashed_password",
		Roles: []Role{
			{ID: 1}, // 管理员角色
		},
	}

	return db.Create(user).Error
}

// 查询用户及其角色
func GetUserWithRoles(db *gorm.DB, userID uint64) (*User, error) {
	var user User
	err := db.Preload("Roles").First(&user, userID).Error
	return &user, err
}

// 为用户添加角色
func AddRoleToUser(db *gorm.DB, userID, roleID uint64) error {
	userRole := &UserRole{
		UserID: userID,
		RoleID: roleID,
	}
	return db.Create(userRole).Error
}
```

## 数据库迁移

### 自动迁移

```go
// cmd/server/main.go
func main() {
	db := database.InitMySQL(cfg)

	// 自动迁移
	if err := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		// ... 其他模型
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}
```

### 使用迁移函数

创建 `internal/pkg/database/migrate.go`：

```go
package database

import (
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// Migrate 执行数据库迁移
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.Menu{},
		&model.RoleMenu{},
		&model.Category{},
		&model.Tag{},
		&model.Article{},
		&model.ArticleTag{},
		&model.OperationLog{},
		&model.LoginLog{},
		&model.SystemConfig{},
	)
}

// CreateIndexes 创建额外的索引
func CreateIndexes(db *gorm.DB) error {
	// 用户表索引
	if err := db.Exec("CREATE INDEX idx_users_status ON users(status)").Error; err != nil {
		// 索引可能已存在，忽略错误
	}

	return nil
}

// SeedData 初始化种子数据
func SeedData(db *gorm.DB) error {
	// 检查是否已有数据
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count > 0 {
		return nil // 已有数据，跳过
	}

	// 创建默认管理员
	admin := &model.User{
		Username: "admin",
		Password: "$2a$10$...", // 加密后的密码
		Nickname: "系统管理员",
		Status:   1,
	}

	if err := db.Create(admin).Error; err != nil {
		return err
	}

	// 创建默认角色
	adminRole := &model.Role{
		Name: "管理员",
		Code: "admin",
	}

	if err := db.Create(adminRole).Error; err != nil {
		return err
	}

	// 分配角色
	userRole := &model.UserRole{
		UserID: admin.ID,
		RoleID: adminRole.ID,
	}

	return db.Create(userRole).Error
}
```

## 数据传输对象（DTO）

### 请求 DTO

```go
// internal/api/v1/dto/user.go
package dto

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname" binding:"required"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty,len=11"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Nickname string `json:"nickname" binding:"required"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty,len=11"`
	Avatar   string `json:"avatar"`
	Status   int    `json:"status" binding:"oneof=0 1"`
	Remark   string `json:"remark"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}
```

### 响应 DTO

```go
// UserResponse 用户响应
type UserResponse struct {
	ID        uint64 `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Avatar    string `json:"avatar"`
	Status    int    `json:"status"`
	CreatedAt string `json:"created_at"`
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	List  []*UserResponse `json:"list"`
	Total int64           `json:"total"`
}

// ToResponse 转换为响应对象
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Nickname:  u.Nickname,
		Email:     u.Email,
		Phone:     u.Phone,
		Avatar:    u.Avatar,
		Status:    u.Status,
		CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}
```

## Java vs Go 对比

| 方面 | Java (JPA/Hibernate) | Go (GORM) |
|------|---------------------|-----------|
| 模型定义 | 类 + 注解 | 结构体 + 标签 |
| 表映射 | `@Entity`, `@Table` | `TableName()` 方法 |
| 主键 | `@Id`, `@GeneratedValue` | `primaryKey`, `autoIncrement` |
| 关联 | `@OneToMany`, `@ManyToMany` | `gorm:"many2many:..."` |
| 钩子 | `@PrePersist`, `@PostLoad` | `BeforeCreate`, `AfterFind` |
| 验证 | `@NotNull`, `@Size` | `binding:"required,min=6"` |

## 最佳实践

### ✅ 应该做的

1. **使用 BaseModel**：统一管理公共字段
2. **密码不序列化**：使用 `json:"-"` 标签
3. **合理的索引**：为常用查询字段添加索引
4. **数据验证**：在模型层和 API 层都进行验证
5. **使用事务**：复杂操作使用数据库事务

### ❌ 不应该做的

1. **硬编码业务逻辑**：业务逻辑放在 Service 层
2. **过度使用关联**：Preload 会产生 N+1 查询
3. **忘记软删除**：使用 GORM 的 DeletedAt
4. **明文存储密码**：必须加密

## 下一步

用户模型设计完成后，让我们学习「[认证接口实现](./auth-api)」


