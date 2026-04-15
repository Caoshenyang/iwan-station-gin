# GORM 快速参考

GORM 是 Go 语言流行的 ORM 库。

## 模型定义

```go
type BaseModel struct {
    ID        uint64         `gorm:"primary_key;auto_increment"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

type User struct {
    BaseModel
    Username string `gorm:"type:varchar(50);uniqueIndex;not null"`
    Email    string `gorm:"type:varchar(100);uniqueIndex"`
    Status   int    `gorm:"type:tinyint;default:1"`
}
```

## 常用标签

| Tag | 说明 |
|-----|------|
| `primary_key` | 主键 |
| `auto_increment` | 自增 |
| `type:varchar(50)` | 字段类型 |
| `uniqueIndex` | 唯一索引 |
| `not null` | 非空 |
| `default:1` | 默认值 |
| `index` | 普通索引 |
| `-` | 忽略字段 |

## CRUD 操作

```go
// 创建
db.Create(&user)

// 查询
db.First(&user, 1)
db.Where("username = ?", "iwan").First(&user)
db.Find(&users) // 查询多条

// 更新
db.Model(&user).Update("email", "new@example.com")
db.Model(&user).Updates(User{Email: "new@example.com"})

// 删除
db.Delete(&user) // 软删除
db.Unscoped().Delete(&user) // 永久删除
```

## 关联查询

```go
// 一对多
db.Preload("Articles").Find(&user)

// 多对多
db.Preload("Tags").Find(&article)

// Joins
db.Joins("JOIN users ON users.id = articles.author_id").Find(&articles)
```

## 分页查询

```go
offset := (page - 1) * pageSize
db.Offset(offset).Limit(pageSize).Find(&users)
```

## 事务

```go
db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&article).Error; err != nil {
        return err // 自动回滚
    }
    return nil // 自动提交
})
```

## 链式查询

```go
query := db.Model(&Article{})
if status > 0 {
    query = query.Where("status = ?", status)
}
if keyword != "" {
    query = query.Where("title LIKE ?", "%"+keyword+"%")
}
query.Find(&articles)
```
