package main

import (
	"fmt"
	"net/http"

	"iwan-station-gin/internal/config"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		fmt.Printf("❌ 配置加载失败: %v\n", err)
		return
	}

	// 设置运行模式
	gin.SetMode(cfg.Server.Mode)

	// 创建 Gin 引擎
	r := gin.Default()

	// 健康检查接口
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Iwan Station API is running",
		})
	})

	// API v1 路由组
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})
	}

	// 启动服务器
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	fmt.Printf("🚀 Server starting on %s\n", addr)
	fmt.Printf("📖 Health check: http://localhost%s/health\n", addr)
	fmt.Printf("📡 API v1: http://localhost%s/api/v1/ping\n", addr)

	if err := r.Run(addr); err != nil {
		fmt.Printf("❌ Failed to start server: %v\n", err)
	}
}
