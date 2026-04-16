---
title: "用户管理 API"
description: "Iwan Station Gin 文档：用户管理 API。"
---

# 用户管理 API

## API 列表

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/user/list | 用户列表 | user:list |
| GET | /api/v1/user/:id | 用户详情 | user:detail |
| POST | /api/v1/user/create | 创建用户 | user:create |
| PUT | /api/v1/user/:id | 更新用户 | user:update |
| DELETE | /api/v1/user/:id | 删除用户 | user:delete |
| PUT | /api/v1/user/:id/password | 修改密码 | user:password |
| PUT | /api/v1/user/:id/status | 修改状态 | user:status |

## 数据模型

```go
type User struct {
    ID        uint64 `json:"id"`
    Username  string `json:"username"`
    Email     string `json:"email"`
    Phone     string `json:"phone"`
    Status    int    `json:"status"` // 1=启用, 0=禁用
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=50"`
    Password string `json:"password" binding:"required,min=6"`
    Email    string `json:"email" binding:"required,email"`
    Phone    string `json:"phone" binding:"omitempty,len=11"`
}

type UpdateUserRequest struct {
    Email string `json:"email" binding:"omitempty,email"`
    Phone string `json:"phone" binding:"omitempty,len=11"`
    Status *int  `json:"status" binding:"omitempty,min=0,max=1"`
}
```

## 示例请求

### 创建用户

```bash
curl -X POST http://localhost:8080/api/v1/user/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "123456",
    "email": "newuser@example.com",
    "phone": "13800138000"
  }'
```

### 用户列表

```bash
curl -X GET "http://localhost:8080/api/v1/user/list?page=1&page_size=20&status=1" \
  -H "Authorization: Bearer <token>"
```

## 密码加密

```go
import "golang.org/x/crypto/bcrypt"

// 加密密码
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}

// 验证密码
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```


