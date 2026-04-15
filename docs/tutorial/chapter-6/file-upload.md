# 文件上传功能

## 学习目标

完成本章后，你将：
- ✅ 实现多文件上传接口
- ✅ 掌握文件类型和大小验证
- ✅ 使用 MinIO 对象存储
- ✅ 了解图片处理和缩略图生成

---

## 📦 前置准备

> 💡 **本教程使用 MinIO 作为对象存储**，无需本地安装文件服务器。
>
> MinIO 是一个高性能的对象存储，兼容 Amazon S3 API。

**MinIO 连接信息：**

| 服务 | 地址 | 用途 |
|------|------|------|
| MinIO API | http://localhost:9000 | 文件上传下载 |
| MinIO 控制台 | http://localhost:9001 | 管理界面 |
| 默认用户名 | minioadmin | 登录控制台 |
| 默认密码 | minioadmin123 | 登录控制台 |

### 初始化 MinIO 存储桶

**方式一：运行脚本**
```bash
./scripts/init-minio.sh    # macOS/Linux
```

**方式二：手动创建**
1. 访问 http://localhost:9001
2. 登录控制台
3. 创建存储桶：`iwan-uploads`、`iwan-avatars`、`iwan-files`

---

## 存储方案对比

### 本地存储 vs 对象存储

| 特性 | 本地存储 | MinIO |
|------|----------|-------|
| 部署难度 | 简单 | 中等 |
| 扩展性 | 差 | 优秀 |
| 高可用 | 难实现 | 支持 |
| S3 兼容 | 不支持 | 支持 |
| 推荐场景 | 小项目 | 生产环境 |

> 💡 **推荐**：开发环境可使用本地存储，生产环境使用 MinIO。

---

## 一、MinIO 对象存储

### 1.1 安装 MinIO SDK

```bash
go get -u github.com/minio/minio-go/v7
```

### 1.2 MinIO 配置

```yaml
# config/config.yaml
minio:
  endpoint: localhost:9000
  access_key: minioadmin
  secret_key: minioadmin123
  bucket: iwan-uploads
  use_ssl: false
```

### 1.3 MinIO 初始化

```go
// internal/pkg/minio/client.go
package minio

import (
	"context"
	"fmt"
	"iwan-station-gin/internal/config"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOClient MinIO 客户端
type MinIOClient struct {
	client *minio.Client
	cfg    config.MinIOConfig
}

// NewMinIOClient 创建 MinIO 客户端
func NewMinIOClient(cfg config.MinIOConfig) (*MinIOClient, error) {
	// 初始化 MinIO 客户端
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("MinIO 连接失败: %w", err)
	}

	// 检查存储桶是否存在
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.Bucket)
	if err != nil {
		return nil, fmt.Errorf("检查存储桶失败: %w", err)
	}

	// 如果存储桶不存在则创建
	if !exists {
		err = client.MakeBucket(ctx, cfg.Bucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("创建存储桶失败: %w", err)
		}
		log.Printf("✅ 存储桶 '%s' 创建成功", cfg.Bucket)
	}

	return &MinIOClient{
		client: client,
		cfg:    cfg,
	}, nil
}

// UploadFile 上传文件
func (m *MinIOClient) UploadFile(ctx context.Context, objectName string, file *multipart.File, fileSize int64, contentType string) (string, error) {
	// 上传文件
	_, err := m.client.PutObject(ctx, m.cfg.Bucket, objectName, *file, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("上传失败: %w", err)
	}

	// 返回访问 URL
	url := fmt.Sprintf("http://%s/%s/%s", m.cfg.Endpoint, m.cfg.Bucket, objectName)
	return url, nil
}

// DeleteFile 删除文件
func (m *MinIOClient) DeleteFile(ctx context.Context, objectName string) error {
	return m.client.RemoveObject(ctx, m.cfg.Bucket, objectName, minio.RemoveObjectOptions{})
}

// GetFileURL 获取文件访问 URL
func (m *MinIOClient) GetFileURL(objectName string, expires time.Duration) (string, error) {
	ctx := context.Background()
	url, err := m.client.PresignedGetObject(ctx, m.cfg.Bucket, objectName, expires, nil)
	if err != nil {
		return "", fmt.Errorf("生成 URL 失败: %w", err)
	}
	return url, nil
}
```

---

## 二、文件上传服务

### 2.1 上传服务接口

```go
// internal/service/upload.go
package service

import (
	"context"
	"errors"
	"fmt"
	"iwan-station-gin/internal/pkg/minio"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

var (
	ErrInvalidFileType = errors.New("invalid file type")
	ErrFileTooLarge    = errors.New("file too large")
)

// UploadService 上传服务
type UploadService struct {
	minio  *minio.MinIOClient
	logger *zap.Logger
}

// NewUploadService 创建上传服务
func NewUploadService(minio *minio.MinIOClient, logger *zap.Logger) *UploadService {
	return &UploadService{
		minio:  minio,
		logger: logger,
	}
}

// ImageConfig 图片配置
type ImageConfig struct {
	MaxSize      int64    // 最大大小
	AllowedTypes []string // 允许的类型
}

// UploadImage 上传图片
func (s *UploadService) UploadImage(ctx context.Context, file *multipart.FileHeader) (*UploadResult, error) {
	// 1. 验证文件
	if err := s.validateImage(file); err != nil {
		return nil, err
	}

	// 2. 打开文件
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("打开文件失败: %w", err)
	}
	defer src.Close()

	// 3. 生成对象名称
	ext := filepath.Ext(file.Filename)
	objectName := s.generateObjectName("images", ext)

	// 4. 上传到 MinIO
	contentType := file.Header.Get("Content-Type")
	url, err := s.minio.UploadFile(ctx, objectName, src, file.Size, contentType)
	if err != nil {
		return nil, fmt.Errorf("上传失败: %w", err)
	}

	s.logger.Info("图片上传成功",
		zap.String("filename", file.Filename),
		zap.String("object_name", objectName),
		zap.Int64("size", file.Size),
	)

	return &UploadResult{
		URL:      url,
		Filename: file.Filename,
		Size:     file.Size,
		Path:     objectName,
	}, nil
}

// validateImage 验证图片
func (s *UploadService) validateImage(file *multipart.FileHeader) error {
	// 检查文件大小
	if file.Size > 10*1024*1024 { // 10MB
		return ErrFileTooLarge
	}

	// 检查文件类型
	contentType := file.Header.Get("Content-Type")
	allowedTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
	}

	for _, t := range allowedTypes {
		if contentType == t {
			return nil
		}
	}

	return ErrInvalidFileType
}

// generateObjectName 生成对象名称
func (s *UploadService) generateObjectName(prefix, ext string) string {
	// 按日期分目录：images/2024/01/15/uuid.jpg
	date := time.Now().Format("2006/01/02")
	filename := uuid.New().String()
	return fmt.Sprintf("%s/%s/%s%s", prefix, date, filename, ext)
}
```

### 2.2 上传结果

```go
// UploadResult 上传结果
type UploadResult struct {
	URL      string `json:"url"`       // 访问 URL
	Filename string `json:"filename"`  // 原始文件名
	Size     int64  `json:"size"`      // 文件大小
	Path     string `json:"path"`      // 存储路径
	Width    int    `json:"width"`     // 图片宽度（可选）
	Height   int    `json:"height"`    // 图片高度（可选）
}
```

---

## 三、上传 API

### 3.1 单文件上传

```go
// internal/api/v1/upload.go
package v1

import (
	"iwan-station-gin/internal/pkg/response"
	"iwan-station-gin/internal/service"

	"github.com/gin-gonic/gin"
)

// UploadHandler 上传处理器
type UploadHandler struct {
	uploadService *service.UploadService
}

// NewUploadHandler 创建上传处理器
func NewUploadHandler(uploadService *service.UploadService) *UploadHandler {
	return &UploadHandler{
		uploadService: uploadService,
	}
}

// UploadImage 上传图片
// @Summary 上传图片
// @Tags 文件上传
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "图片文件"
// @Success 200 {object} response.Response
// @Router /api/v1/upload/image [post]
func (h *UploadHandler) UploadImage(c *gin.Context) {
	// 获取文件
	file, err := c.FormFile("file")
	if err != nil {
		response.ErrorWithMessage(c, "请选择文件", 400)
		return
	}

	// 调用 Service
	result, err := h.uploadService.UploadImage(c.Request.Context(), file)
	if err != nil {
		response.ErrorWithMessage(c, err.Error(), 400)
		return
	}

	response.Success(c, result)
}
```

### 3.2 多文件上传

```go
// UploadImages 批量上传图片
func (h *UploadHandler) UploadImages(c *gin.Context) {
	// 获取多个文件
	form, err := c.MultipartForm()
	if err != nil {
		response.ErrorWithMessage(c, "获取文件失败", 400)
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		response.ErrorWithMessage(c, "请选择文件", 400)
		return
	}

	// 限制文件数量
	if len(files) > 10 {
		response.ErrorWithMessage(c, "最多上传10个文件", 400)
		return
	}

	// 上传所有文件
	var results []*service.UploadResult
	var errs []string

	for _, file := range files {
		result, err := h.uploadService.UploadImage(c.Request.Context(), file)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %s", file.Filename, err.Error()))
			continue
		}
		results = append(results, result)
	}

	// 返回结果
	response.Success(c, gin.H{
		"success": len(results),
		"failed":  len(errs),
		"results": results,
		"errors":  errs,
	})
}
```

---

## 四、路由配置

### 4.1 注册上传路由

```go
// internal/router/upload.go
package router

import (
	"iwan-station-gin/internal/api/v1"
	"iwan-station-gin/internal/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterUploadRoutes 注册上传路由
func RegisterUploadRoutes(
	r *gin.Engine,
	uploadHandler *v1.UploadHandler,
	authMiddleware *middleware.AuthMiddleware,
) {
	upload := r.Group("/api/v1/upload")
	upload.Use(authMiddleware.Authenticate())
	{
		upload.POST("/image", uploadHandler.UploadImage)
		upload.POST("/images", uploadHandler.UploadImages)
		// upload.POST("/file", uploadHandler.UploadFile)
		// upload.POST("/avatar", uploadHandler.UploadAvatar)
	}
}
```

---

## 五、前端上传示例

### 5.1 单文件上传

```vue
<template>
  <el-upload
    :action="uploadUrl"
    :headers="uploadHeaders"
    :on-success="handleSuccess"
    :on-error="handleError"
    :before-upload="beforeUpload"
    :show-file-list="false"
  >
    <el-button type="primary">上传图片</el-button>
  </el-upload>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const uploadUrl = ref('/api/v1/upload/image')
const uploadHeaders = ref({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

const handleSuccess = (response) => {
  if (response.code === 200) {
    ElMessage.success('上传成功')
    // 处理返回的 URL
    console.log(response.data.url)
  }
}

const handleError = () => {
  ElMessage.error('上传失败')
}
</script>
```

### 5.2 多文件上传

```vue
<template>
  <el-upload
    :action="uploadUrl"
    :headers="uploadHeaders"
    :on-success="handleSuccess"
    :on-error="handleError"
    :before-upload="beforeUpload"
    multiple
    :limit="10"
    :on-exceed="handleExceed"
    list-type="picture-card"
  >
    <el-icon><Plus /></el-icon>
  </el-upload>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const handleExceed = () => {
  ElMessage.warning('最多上传10个文件')
}
</script>
```

---

## 六、文件处理

### 6.1 生成缩略图

```go
// internal/service/image.go
package service

import (
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"

	"github.com/nfnt/resize"
)

// ImageProcessor 图片处理器
type ImageProcessor struct{}

// GenerateThumbnail 生成缩略图
func (p *ImageProcessor) GenerateThumbnail(src io.Reader, width, height uint) (image.Image, error) {
	// 解码图片
	img, _, err := image.Decode(src)
	if err != nil {
		return nil, err
	}

	// 生成缩略图
	thumbnail := resize.Thumbnail(width, height, img, resize.Lanczos3)
	return thumbnail, nil
}

// Resize 调整图片大小
func (p *ImageProcessor) Resize(srcPath, dstPath string, width, height uint) error {
	file, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer file.Close()

	img, format, err := image.Decode(file)
	if err != nil {
		return err
	}

	// 调整大小
	resized := resize.Resize(width, height, img, resize.Lanczos3)

	out, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer out.Close()

	switch format {
	case "jpeg":
		return jpeg.Encode(out, resized, &jpeg.Options{Quality: 80})
	case "png":
		return png.Encode(out, resized)
	default:
		return jpeg.Encode(out, resized, &jpeg.Options{Quality: 80})
	}
}
```

---

## 七、配置文件

### 7.1 完整配置

```yaml
# config/config.yaml
upload:
  max_size: 10485760        # 10MB
  max_image_size: 5242880   # 5MB
  allowed_exts:
    - .jpg
    - .jpeg
    - .png
    - .gif
    - .webp
    - .pdf

minio:
  endpoint: localhost:9000
  access_key: minioadmin
  secret_key: minioadmin123
  bucket: iwan-uploads
  use_ssl: false
```

---

## 八、安全考虑

### 8.1 文件验证

```go
// 验证文件内容而非仅扩展名
func validateFileContent(file *multipart.FileHeader) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// 读取前512字节检测实际类型
	buffer := make([]byte, 512)
	_, err = src.Read(buffer)
	if err != nil && err != io.EOF {
		return err
	}

	// 检测实际类型
	contentType := http.DetectContentType(buffer)

	// 验证是否是声明的类型
	declaredType := file.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, strings.Split(declaredType, ";")[0]) {
		return errors.New("文件内容与声明类型不匹配")
	}

	return nil
}
```

### 8.2 文件名处理

```go
// 生成安全的文件名
func generateSafeFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	// 使用 UUID 作为文件名
	return uuid.New().String() + ext
}
```

---

## 九、最佳实践

### ✅ 应该做的

1. **使用对象存储**：生产环境推荐使用 MinIO 或 OSS
2. **验证文件内容**：不只检查扩展名
3. **限制文件大小**：防止大文件攻击
4. **分目录存储**：按日期或类型分目录
5. **生成唯一文件名**：避免文件名冲突

### ❌ 不应该做的

1. **信任文件扩展名**：必须验证实际内容
2. **使用原始文件名**：可能导致冲突或安全问题
3. **存储在 Web 根目录**：应该放在单独的目录或对象存储
4. **忽略错误处理**：每个步骤都要检查错误

---

## 十、测试

### 10.1 使用 curl 测试

```bash
# 上传图片
curl -X POST http://localhost:8080/api/v1/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

### 10.2 使用 Postman 测试

1. 创建 POST 请求
2. URL: `http://localhost:8080/api/v1/upload/image`
3. Headers:
   - `Authorization`: `Bearer YOUR_TOKEN`
4. Body:
   - 类型: `form-data`
   - Key: `file` (File)
   - Value: 选择图片文件

---

## 下一步

文件上传功能完成后，让我们学习「[缓存优化策略](../chapter-7/cache-optimization)」
