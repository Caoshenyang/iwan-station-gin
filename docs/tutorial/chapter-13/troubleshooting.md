---
title: "故障排查"
description: "Iwan Station Gin 文档：故障排查。"
---

# 故障排查

::: tip 阅读建议
这页适合当成“值班手册”来用。先看页内目录定位问题类型，再展开对应故障卡片；不是所有内容都需要一次性通读。
:::

## 页面导航

[[toc]]

## 学习目标

完成本章后，你将：
- ✅ 掌握常见问题排查方法
- ✅ 学会使用调试工具
- ✅ 了解日志分析技巧
- ✅ 掌握性能问题诊断

## 故障排查流程

```
发现问题 → 收集信息 → 定位问题 → 解决问题 → 验证结果 → 总结经验
    ↑                                                     ↓
    └──────────────────── 持续监控 ←────────────────────┘
```

## 常见问题

::: details 1. 服务无法启动

### 1. 服务无法启动

#### 症状
- 执行 `go run` 后服务立即退出
- 端口被占用
- 配置文件错误

#### 排查步骤

```bash
# 1. 检查错误日志
go run cmd/server/main.go
# 查看输出信息

# 2. 检查端口占用
# Linux/macOS
lsof -i :8080

# Windows (PowerShell)
netstat -ano | findstr :8080

# 3. 检查配置文件
cat config/config.yaml
# 验证 YAML 格式是否正确

# 4. 检查依赖
go mod tidy
```

#### 常见原因

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 端口被占用 | 其他进程使用端口 | 杀死进程或更换端口 |
| 数据库连接失败 | 配置错误或数据库未启动 | 检查配置和数据库状态 |
| 配置文件错误 | YAML 格式错误 | 验证 YAML 语法 |
| 依赖缺失 | go.mod 未更新 | 运行 go mod tidy |

:::

::: details 2. 数据库连接问题

### 2. 数据库连接问题

#### 症状
- `dial tcp: lookup database: no such host`
- `connection refused`
- `too many connections`
- `password authentication failed`

#### 排查步骤

**MySQL：**

```bash
# 1. 测试数据库连接
mysql -h localhost -P 3306 -u iwan -p

# 2. 检查数据库是否运行
# Linux
sudo systemctl status mysql

# macOS
brew services list

# 3. 检查连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# 4. 检查最大连接数
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
```

**PostgreSQL：**

```bash
# 1. 测试数据库连接
psql -h localhost -p 5432 -U iwan -d iwan_station

# 2. 检查数据库是否运行
# Linux
sudo systemctl status postgresql

# macOS
brew services list

# 3. 检查连接数
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 4. 检查最大连接数
psql -U postgres -c "SHOW max_connections;"
```

#### 解决方案

```go
// 增加连接超时时间
cfg.ReadTimeout = 30 * time.Second
cfg.WriteTimeout = 30 * time.Second

// 增加连接池大小
cfg.MaxOpenConns = 200
cfg.MaxIdleConns = 100

// 启用调试日志
db, err := gorm.Open(dialector, &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info),
})
```

**PostgreSQL 特有问题：**

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `connection refused` | PostgreSQL 未启动 | `sudo systemctl start postgresql` |
| `password authentication failed` | pg_hba.conf 配置 | 修改认证方法为 md5 或 scram-sha-256 |
| `too many connections` | 超过 max_connections | 修改 postgresql.conf 中的 max_connections |
| `database does not exist` | 数据库未创建 | `CREATE DATABASE iwan_station;` |

:::

::: details 3. 内存泄漏

### 3. 内存泄漏

#### 症状
- 内存使用持续增长
- OOM (Out of Memory)
- 性能下降

#### 排查步骤

```bash
# 1. 监控内存使用
ps aux | grep server

# 2. 使用 pprof 分析
curl http://localhost:6060/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# 3. 查看内存分配
go tool pprof -http=:8080 heap.prof

# 4. 检查 Goroutine 数量
curl http://localhost:6060/debug/pprof/goroutine?debug=1
```

#### 常见原因

```go
// ❌ 1. Goroutine 泄漏
go func() {
    for {
        time.Sleep(time.Second)
    }
}()

// ✅ 使用 context 控制
go func() {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            // 处理逻辑
        }
    }
}()

// ❌ 2. 闭包引用
for _, item := range items {
    go func() {
        fmt.Println(item) // 可能导致内存泄漏
    }()
}

// ✅ 传递参数
for _, item := range items {
    go func(i Item) {
        fmt.Println(i)
    }(item)
}

// ❌ 3. 未释放的连接
resp, _ := http.Get(url)
// 忘记关闭 resp.Body

// ✅ 确保关闭
resp, _ := http.Get(url)
defer resp.Body.Close()
```

:::

::: details 4. CPU 高负载

### 4. CPU 高负载

#### 症状
- CPU 使用率高
- 响应慢
- 请求超时

#### 排查步骤

```bash
# 1. 查看进程 CPU 使用
top -p $(pgrep server)

# 2. 使用 pprof 分析 CPU
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof

# 3. 查看调用图
go tool pprof -http=:8080 cpu.prof
```

#### 常见原因

```go
// ❌ 1. 死循环
for {
    // 无 break 条件
}

// ❌ 2. 频繁的字符串拼接
var s string
for i := 0; i < 10000; i++ {
    s += "a" // 每次都创建新字符串
}

// ✅ 使用 strings.Builder
var b strings.Builder
for i := 0; i < 10000; i++ {
    b.WriteString("a")
}
s := b.String()

// ❌ 3. 不必要的反射
for i := 0; i < 10000; i++ {
    reflect.ValueOf(obj).MethodByName("Method").Call(nil)
}

// ✅ 避免反射
obj.Method()
```

:::

::: details 5. 响应慢

### 5. 响应慢

#### 症状
- 请求响应时间长
- 超时错误
- 用户体验差

#### 排查步骤

```bash
# 1. 测试响应时间
time curl http://localhost:8080/api/v1/article/list

# 2. 使用 trace
curl http://localhost:6060/debug/pprof/trace?seconds=5 > trace.out
go tool trace trace.out

# 3. 查看慢查询
# MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"

# 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

# 查看慢查询
tail -f /var/log/mysql/slow-query.log

# PostgreSQL
# 修改 postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
# 重启 PostgreSQL
sudo systemctl restart postgresql

# 查看慢查询
psql -U postgres -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

#### 优化建议

```go
// 1. 添加超时控制
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

result, err := db.WithContext(ctx).Exec("SELECT * FROM users")

// 2. 使用预编译语句
stmt, err := db.Prepare("SELECT * FROM users WHERE id = ?")
defer stmt.Close()

stmt.Query(id)

// 3. 限制返回数量
db.Limit(100).Find(&users)

// 4. 只查询需要的字段
db.Select("id, username").Find(&users)
```

:::

## 调试工具

::: details 调试工具速查

### Delve (Go 调试器)

```bash
# 安装
go install github.com/go-delve/delve/cmd/dlv@latest

# 调试
dlv debug cmd/server/main.go

# 常用命令
# break main.go:10     # 设置断点
# breakpoints          # 查看断点
# next                 # 下一步
# step                 # 进入函数
# print variable       # 打印变量
# continue             # 继续执行
```

### pprof

```go
// 在代码中启用 pprof
import (
    _ "net/http/pprof"
    "net/http"
)

func main() {
    // 启动 pprof 服务器
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()

    // 主程序
    // ...
}
```

### 常用 pprof 命令

```bash
# 查看 CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# 查看内存 profile
go tool pprof http://localhost:6060/debug/pprof/heap

# 查看 Goroutine
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Web 界面
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
```

:::

## 日志分析

::: details 日志排查与分析

### 结构化日志

```go
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()

// 结构化日志
logger.Info("User login",
    zap.String("username", "admin"),
    zap.String("ip", "192.168.1.1"),
    zap.Duration("latency", 100*time.Millisecond),
)

// 错误日志
logger.Error("Failed to connect database",
    zap.Error(err),
    zap.String("host", "localhost:3306"),
)
```

### 日志查询

```bash
# 查看错误日志
grep "error" /var/log/app/app.log

# 查看特定时间段的日志
sed -n '/2024-01-01 00:00:00/,/2024-01-01 23:59:59/p' app.log

# 统计错误数量
grep "error" app.log | wc -l

# 查看最近的错误
tail -100 app.log | grep "error"

# 实时查看日志
tail -f app.log | grep "error"
```

### 日志分析工具

```bash
# 使用 jq 分析 JSON 日志
tail -f app.log | jq '.level, .msg, .error'

# 统计各级别日志数量
cat app.log | jq -r '.level' | sort | uniq -c

# 查找慢请求
cat app.log | jq 'select(.latency > 1000)'
```

:::

## 性能问题诊断

::: details 性能诊断步骤

### 1. 使用 pprof 找出热点

```bash
# 采集 CPU 数据
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof

# 分析
go tool pprof cpu.prof

# 常用命令
# top          # 查看最耗 CPU 的函数
# list func    # 查看函数代码
# web          # 生成调用图
```

### 2. 分析慢查询

```go
// 启用 GORM 查询日志
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info),
})

// 查看执行时间
db.Find(&users)
// 会输出: [2024-01-01 00:00:00] [1.234ms] SELECT * FROM `users`
```

### 3. 使用 trace

```bash
# 采集 trace 数据
curl http://localhost:6060/debug/pprof/trace?seconds=5 > trace.out

# 分析
go tool trace trace.out

# 可以查看：
# - Goroutine 创建
# - Goroutine 调度
# - 系统调用
# - 垃圾回收
```

:::

## 常用调试技巧

::: details 开发期调试技巧

### 1. 打印调试

```go
// 使用 fmt 快速调试
fmt.Printf("user = %+v\n", user)

// 使用 debug 标签
//go:build debug

// +build debug

func debugLog(format string, args ...interface{}) {
    fmt.Printf("[DEBUG] "+format+"\n", args...)
}
```

### 2. 条件编译

```go
// 只在 debug 模式下编译
//go:build debug

package main

func init() {
    // 初始化调试工具
}
```

### 3. 环境变量控制

```go
// 根据环境变量决定日志级别
logLevel := os.Getenv("LOG_LEVEL")
if logLevel == "debug" {
    logger = zap.NewDevelopment()
} else {
    logger = zap.NewProduction()
}
```

:::

## 故障预防

### 1. 健康检查

```go
// 定期检查服务健康
func (s *Service) healthCheck() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        if err := s.checkDatabase(); err != nil {
            s.logger.Error("Database unhealthy", zap.Error(err))
            // 发送告警
        }
    }
}
```

### 2. 资源限制

```go
// 设置最大 Goroutine 数量
type GoroutinePool struct {
    semaphore chan struct{}
}

func NewGoroutinePool(max int) *GoroutinePool {
    return &GoroutinePool{
        semaphore: make(chan struct{}, max),
    }
}

func (p *GoroutinePool) Go(f func()) {
    p.semaphore <- struct{}{}
    go func() {
        defer func() { <-p.semaphore }()
        f()
    }()
}
```

### 3. 优雅关闭

```go
func (s *Server) Shutdown(ctx context.Context) error {
    s.logger.Info("Shutting down server...")

    // 停止接受新请求
    if err := s.httpServer.Shutdown(ctx); err != nil {
        return err
    }

    // 关闭数据库连接
    s.db.Close()

    // 关闭 Redis 连接
    s.redis.Close()

    s.logger.Info("Server stopped")
    return nil
}
```

## 紧急恢复

### 1. 服务重启

```bash
# 快速重启脚本
#!/bin/bash
# restart.sh

PID=$(pgrep -f "server")
if [ -n "$PID" ]; then
    echo "Killing process $PID"
    kill $PID
    sleep 2
fi

echo "Starting server..."
nohup ./server > server.log 2>&1 &

echo "Server started with PID: $(pgrep -f 'server')"
```

### 2. 数据回滚

```bash
# MySQL 备份恢复
mysqldump -u root -p database > backup.sql
mysql -u root -p database < backup.sql

# PostgreSQL 备份恢复
pg_dump -U postgres database > backup.sql
psql -U postgres database < backup.sql

# Redis 数据恢复
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backup/
redis-cli --rdb /backup/dump.rdb
```

### 3. 版本回退

```bash
# Git 回退
git log --oneline
git checkout <commit-hash>
go build -o server

# 或使用 Docker
docker rollback iwan-backend
```

## 最佳实践

### ✅ 应该做的

1. **记录详细日志**：便于问题定位
2. **使用结构化日志**：便于分析
3. **定期备份数据**：灾难恢复
4. **监控系统状态**：提前发现问题
5. **制定应急预案**：快速响应

### ❌ 不应该做的

1. **忽略错误**：小错误可能变成大问题
2. **盲目修改**：要找到根本原因
3. **重启了事**：问题还会出现
4. **忽略日志**：日志是排查的关键
5. **没有监控**：无法发现问题

## 常用命令速查

```bash
# 进程管理
ps aux | grep server
kill -9 <PID>
top -p <PID>

# 端口管理
lsof -i :8080
netstat -tulpn | grep 8080

# 资源监控
top
htop
vmstat
iostat

# 网络调试
curl -v http://localhost:8080
telnet localhost 8080
tcpdump -i any port 8080

# 日志查看
tail -f app.log
grep "error" app.log
less app.log
```

## 总结

故障排查的关键是：

1. **系统化方法**：遵循排查流程
2. **充分利用工具**：pprof、Delve、日志
3. **深入理解原理**：知道问题为什么发生
4. **记录和总结**：避免重复问题
5. **持续改进**：优化系统和流程

恭喜！你已完成全部教程内容！🎉


