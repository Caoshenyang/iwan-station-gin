---
title: "JWT 认证快速参考"
description: "JWT (JSON Web Token) 是无状态认证方案。"
---

# JWT 认证快速参考

JWT (JSON Web Token) 是无状态认证方案。

## JWT 结构

```
header.payload.signature
```

| 部分 | 说明 |
|------|------|
| Header | 算法和类型 |
| Payload | 用户数据（claims） |
| Signature | 签名验证 |

## 生成 Token

```go
type Claims struct {
    UserID   uint64 `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

func GenerateToken(userID uint64, username string) (string, error) {
    claims := Claims{
        UserID:   userID,
        Username: username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "iwan-station",
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}
```

## 解析 Token

```go
func ParseToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(secret), nil
    })

    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }

    return nil, ErrTokenInvalid
}
```

## 认证中间件

```go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(401, gin.H{"error": "未授权"})
            c.Abort()
            return
        }

        token := strings.TrimPrefix(authHeader, "Bearer ")
        claims, err := ParseToken(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "Token 无效"})
            c.Abort()
            return
        }

        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)
        c.Next()
    }
}
```

## 标准 Claims

| Claim | 说明 |
|-------|------|
| `iss` | 签发者 |
| `sub` | 主题 |
| `exp` | 过期时间 |
| `iat` | 签发时间 |
| `nbf` | 生效时间 |

## 安全建议

- 使用至少 32 字节的随机密钥
- Token 过期时间：Web 24h，移动 7 天
- 敏感操作使用短期 Token（15 分钟）
- 实现 Token 刷新机制

