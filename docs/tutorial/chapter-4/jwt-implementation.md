# 4.1 JWT 认证

## 什么是 JWT？

JWT (JSON Web Token) 是一种紧凑、URL 安全的方式，用于在双方之间传输声明信息。

### JWT 结构

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIn0.signature
└─────────────┬─────────────┘ └────────────────────┬───────────────────┘ └───┬────┘
              头部                           载荷                    签名
```

### Header（头部）

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload（载荷）

```json
{
  "user_id": 1,
  "username": "admin",
  "exp": 1234567890,
  "iat": 1234560000
}
```

### Signature（签名）

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

## 实现方式

### JWT 管理器

```go
package jwt

import (
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID   uint64 `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

type Manager struct {
    secret     []byte
    expireTime time.Duration
    issuer     string
}

func NewManager(cfg config.JWTConfig) *Manager {
    return &Manager{
        secret:     []byte(cfg.Secret),
        expireTime: time.Duration(cfg.ExpireTime) * time.Hour,
        issuer:     cfg.Issuer,
    }
}
```

### 生成 Token

```go
func (m *Manager) GenerateToken(userID uint64, username string) (string, error) {
    now := time.Now()
    claims := Claims{
        UserID:   userID,
        Username: username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(now.Add(m.expireTime)),
            IssuedAt:  jwt.NewNumericDate(now),
            NotBefore: jwt.NewNumericDate(now),
            Issuer:    m.issuer,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(m.secret)
}
```

### 解析 Token

```go
func (m *Manager) ParseToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return m.secret, nil
    })

    if err != nil {
        if errors.Is(err, jwt.ErrTokenExpired) {
            return nil, ErrTokenExpired
        }
        return nil, ErrTokenInvalid
    }

    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }

    return nil, ErrTokenInvalid
}
```

## 认证流程

```
┌─────────┐                 ┌─────────┐                ┌─────────┐
│  客户端   │                 │  服务器   │                │  数据库   │
└────┬────┘                 └────┬────┘                └────┬────┘
     │                           │                          │
     │ POST /login               │                          │
     │ {username, password}      │                          │
     ├─────────────────────────▶ │                          │
     │                           │                          │
     │                           │ 验证密码                  │
     │                           ├─────────────────────────▶ │
     │                           │                          │
     │                           │ 用户信息                  │
     │                           │◀─────────────────────────┤
     │                           │                          │
     │                           │ 生成 JWT                  │
     │                           │                          │
     │ {token, user, roles}      │                          │
     │◀─────────────────────────┤                          │
     │                           │                          │
     │ 存储 token                │                          │
     │                           │                          │
     │ GET /api/users            │                          │
     │ Authorization: Bearer...  │                          │
     ├─────────────────────────▶ │                          │
     │                           │                          │
     │                           │ 验证 JWT                  │
     │                           │                          │
     │ {users[]}                 │                          │
     │◀─────────────────────────┤                          │
```

## 中间件集成

```go
type AuthMiddleware struct {
    jwtMgr *jwt.Manager
}

func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            response.Error(c, response.Unauthorized)
            c.Abort()
            return
        }

        const prefix = "Bearer "
        if len(authHeader) < len(prefix) || authHeader[:len(prefix)] != prefix {
            response.Error(c, response.Unauthorized)
            c.Abort()
            return
        }

        token := authHeader[len(prefix):]
        claims, err := m.jwtMgr.ParseToken(token)
        if err != nil {
            response.Error(c, response.TokenExpired)
            c.Abort()
            return
        }

        // 设置用户上下文
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)

        c.Next()
    }
}
```

## 安全最佳实践

### 1. 密钥管理

```go
// 不好 - 硬编码密钥
secret := "my-secret-key"

// 好 - 从环境变量/配置读取
secret := os.Getenv("JWT_SECRET")

// 最佳 - 使用强随机密钥
secret := generateRandomKey(32)
```

### 2. Token 过期时间

```go
// 设置合适的过期时间
expireTime: 24 * time.Hour  // Web 应用
expireTime: 7 * 24 * time.Hour  // 移动应用

// 敏感操作使用短期 token
expireTime: 15 * time.Minute  // 密码重置
```

### 3. Token 存储

```javascript
// 不好 - localStorage（易受 XSS 攻击）
localStorage.setItem('token', token);

// 好 - httpOnly cookie
res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
});

// 备选 - 内存（适用于 SPA）
let token = null;
```

### 4. 刷新令牌

```go
type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
}

func (m *Manager) GenerateTokenPair(userID uint64, username string) (*TokenPair, error) {
    accessToken, _ := m.GenerateToken(userID, username)

    // 刷新令牌使用更长的过期时间
    refreshToken, _ := m.GenerateRefreshToken(userID, username)

    return &TokenPair{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
    }, nil
}
```

## 常见问题

### 1. Token 过期处理

```go
// 使用前检查过期时间
if claims.ExpiresAt.Time.Before(time.Now()) {
    return ErrTokenExpired
}

// 或让 ParseToken 处理
claims, err := jwtMgr.ParseToken(token)
if errors.Is(err, jwt.ErrTokenExpired) {
    // 处理过期 token
    return refreshToken(oldToken)
}
```

### 2. 时钟偏差

```go
// 添加容差来处理时钟差异
parser := jwt.NewParser(jwt.WithLeeway(time.Minute))
```

## 与 Java Spring Security 对比

### Spring Security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
}

// 生成 token
String token = Jwts.builder()
    .setSubject(user.getUsername())
    .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
    .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
    .compact();
```

### Go + Gin

```go
// 更简洁、更明确
func GenerateToken(userID uint64, username string) string {
    claims := Claims{
        UserID:   userID,
        Username: username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}
```

## 测试

```go
func TestJWTManager(t *testing.T) {
    mgr := NewManager(config.JWTConfig{
        Secret:     "test-secret",
        ExpireTime: 24,
        Issuer:     "test",
    })

    // 测试生成
    token, err := mgr.GenerateToken(1, "admin")
    assert.NoError(t, err)
    assert.NotEmpty(t, token)

    // 测试解析
    claims, err := mgr.ParseToken(token)
    assert.NoError(t, err)
    assert.Equal(t, uint64(1), claims.UserID)
    assert.Equal(t, "admin", claims.Username)
}
```

## 下一步

现在让我们学习「[RBAC 权限系统](/guide/rbac)」实现
