# 文章管理模块

## 数据模型

### 文章表结构

```sql
CREATE TABLE articles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '文章标题',
    subtitle VARCHAR(200) COMMENT '副标题',
    summary VARCHAR(500) COMMENT '文章摘要',
    content TEXT NOT NULL COMMENT '文章内容',
    cover_image VARCHAR(255) COMMENT '封面图片',
    author_id BIGINT NOT NULL COMMENT '作者ID',
    category_id BIGINT COMMENT '分类ID',
    status TINYINT DEFAULT 1 COMMENT '状态: 0=草稿, 1=已发布, 2=已删除',
    is_top TINYINT DEFAULT 0 COMMENT '是否置顶',
    is_original TINYINT DEFAULT 1 COMMENT '是否原创',
    source_url VARCHAR(255) COMMENT '来源链接',
    view_count BIGINT DEFAULT 0 COMMENT '浏览量',
    like_count INT DEFAULT 0 COMMENT '点赞数',
    comment_count INT DEFAULT 0 COMMENT '评论数',
    published_at DATETIME COMMENT '发布时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_author_id (author_id),
    INDEX idx_status (status),
    INDEX idx_is_top (is_top),
    INDEX idx_published_at (published_at)
) COMMENT='文章表';
```

### Go 模型

```go
// Article 文章模型
type Article struct {
    BaseModel
    Title       string    `gorm:"type:varchar(200);not null" json:"title"`
    Subtitle    string    `gorm:"type:varchar(200)" json:"subtitle"`
    Summary     string    `gorm:"type:varchar(500)" json:"summary"`
    Content     string    `gorm:"type:text;not null" json:"content"`
    CoverImage  string    `gorm:"type:varchar(255)" json:"cover_image"`
    AuthorID    uint64    `gorm:"not null;index" json:"author_id"`
    CategoryID  uint64    `gorm:"index" json:"category_id"`
    Status      int       `gorm:"type:tinyint;default:1" json:"status"`
    IsTop       bool      `gorm:"type:tinyint;default:0" json:"is_top"`
    IsOriginal  bool      `gorm:"type:tinyint;default:1" json:"is_original"`
    SourceURL   string    `gorm:"type:varchar(255)" json:"source_url"`
    ViewCount   int64     `gorm:"type:bigint;default:0" json:"view_count"`
    LikeCount   int       `gorm:"type:int;default:0" json:"like_count"`
    CommentCount int      `gorm:"type:int;default:0" json:"comment_count"`
    PublishedAt *time.Time `json:"published_at"`

    // 关联
    Category  *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
    Tags      []Tag     `gorm:"many2many:article_tags" json:"tags,omitempty"`
}
```

## 业务逻辑

### 文章仓储

```go
// ArticleRepository 文章仓储
type ArticleRepository struct {
    *BaseRepository
}

// List 获取文章列表（带分页和筛选）
func (r *ArticleRepository) List(
    ctx context.Context,
    page, pageSize int,
    categoryID uint64,
    status int,
) ([]*Article, int64, error) {
    var articles []*Article
    var total int64

    query := r.DB.WithContext(ctx).Model(&Article{})

    // 分类筛选
    if categoryID > 0 {
        query = query.Where("category_id = ?", categoryID)
    }

    // 状态筛选
    if status >= 0 {
        query = query.Where("status = ?", status)
    }

    // 计数
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 分页查询，预加载关联
    offset := (page - 1) * pageSize
    err := query.
        Preload("Category").
        Preload("Tags").
        Order("is_top DESC, created_at DESC").
        Offset(offset).
        Limit(pageSize).
        Find(&articles).Error

    return articles, total, err
}

// IncrementViewCount 增加浏览量
func (r *ArticleRepository) IncrementViewCount(
    ctx context.Context,
    id uint64,
) error {
    return r.DB.WithContext(ctx).
        Model(&Article{}).
        Where("id = ?", id).
        UpdateColumn("view_count", gorm.Expr("view_count + 1")).
        Error
}

// Search 搜索文章
func (r *ArticleRepository) Search(
    ctx context.Context,
    keyword string,
    page, pageSize int,
) ([]*Article, int64, error) {
    var articles []*Article
    var total int64

    query := r.DB.WithContext(ctx).
        Model(&Article{}).
        Where("status = 1 AND (title LIKE ? OR content LIKE ?)",
            "%"+keyword+"%", "%"+keyword+"%")

    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    offset := (page - 1) * pageSize
    err := query.
        Preload("Category").
        Preload("Tags").
        Order("created_at DESC").
        Offset(offset).
        Limit(pageSize).
        Find(&articles).Error

    return articles, total, err
}
```

### 文章服务

```go
// ArticleService 文章服务
type ArticleService struct {
    articleRepo  *ArticleRepository
    categoryRepo *CategoryRepository
    tagRepo      *TagRepository
    logger       *zap.Logger
}

// Create 创建文章
func (s *ArticleService) Create(
    ctx context.Context,
    req *CreateArticleRequest,
) error {
    // 1. 参数验证
    if req.Title == "" {
        return errors.New("标题不能为空")
    }
    if req.Content == "" {
        return errors.New("内容不能为空")
    }

    // 2. 构建文章对象
    article := &Article{
        Title:       req.Title,
        Subtitle:    req.Subtitle,
        Summary:     req.Summary,
        Content:     req.Content,
        CoverImage:  req.CoverImage,
        AuthorID:    req.AuthorID,
        CategoryID:  req.CategoryID,
        IsTop:       req.IsTop,
        IsOriginal:  req.IsOriginal,
        SourceURL:   req.SourceURL,
        Status:      req.Status,
    }

    // 3. 保存文章
    if err := s.articleRepo.Create(ctx, article); err != nil {
        s.logger.Error("创建文章失败", zap.Error(err))
        return err
    }

    // 4. 关联标签
    if len(req.TagIDs) > 0 {
        if err := s.articleRepo.AssignTags(
            ctx, article.ID, req.TagIDs,
        ); err != nil {
            s.logger.Error("关联标签失败", zap.Error(err))
        }
    }

    return nil
}

// Publish 发布文章
func (s *ArticleService) Publish(
    ctx context.Context,
    id uint64,
) error {
    article, err := s.articleRepo.FindByID(ctx, id)
    if err != nil {
        return err
    }

    article.Status = 1
    now := time.Now()
    article.PublishedAt = &now

    return s.articleRepo.Update(ctx, article)
}
```

## API 接口

### 文章列表

```http
GET /api/v1/article/list?page=1&page_size=10&category_id=1&status=1
Authorization: Bearer {token}

响应:
{
  "code": 0,
  "message": "success",
  "data": [...],
  "total": 100,
  "page": 1,
  "page_size": 10
}
```

### 创建文章

```http
POST /api/v1/article/create
Authorization: Bearer {token}
Content-Type: application/json

请求体:
{
  "title": "Go 入门教程",
  "subtitle": "从零开始学 Go",
  "summary": "本文介绍 Go 语言的基础知识",
  "content": "详细的文章内容...",
  "cover_image": "https://example.com/cover.jpg",
  "category_id": 1,
  "is_top": false,
  "is_original": true,
  "status": 1,
  "tag_ids": [1, 2, 3]
}
```

### 搜索文章

```http
GET /api/v1/article/search?keyword=Go&page=1&page_size=10
Authorization: Bearer {token}

响应:
{
  "code": 0,
  "message": "success",
  "data": [...],
  "total": 50,
  "page": 1,
  "page_size": 10
}
```

## 前端实现

### 文章编辑器

```vue
<template>
  <n-card title="文章编辑">
    <n-form ref="formRef" :model="formData" :rules="rules">
      <!-- 标题和副标题 -->
      <n-grid :cols="2" :x-gap="24">
        <n-gi>
          <n-form-item label="文章标题" path="title">
            <n-input v-model:value="formData.title" placeholder="请输入文章标题" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="副标题" path="subtitle">
            <n-input v-model:value="formData.subtitle" placeholder="请输入副标题" />
          </n-form-item>
        </n-gi>
      </n-grid>

      <!-- 摘要 -->
      <n-form-item label="文章摘要">
        <n-input
          v-model:value="formData.summary"
          type="textarea"
          placeholder="请输入文章摘要"
          :rows="3"
        />
      </n-form-item>

      <!-- 正文内容 -->
      <n-form-item label="文章内容" path="content">
        <n-input
          v-model:value="formData.content"
          type="textarea"
          placeholder="请输入文章内容"
          :rows="15"
        />
      </n-form-item>

      <!-- 分类和标签 -->
      <n-grid :cols="2" :x-gap="24">
        <n-gi>
          <n-form-item label="分类" path="category_id">
            <n-tree-select
              v-model:value="formData.category_id"
              :options="categoryTree"
              key-field="id"
              label-field="name"
              children-field="children"
            />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="标签" path="tag_ids">
            <n-select
              v-model:value="formData.tag_ids"
              :options="tagOptions"
              multiple
              filterable
            />
          </n-form-item>
        </n-gi>
      </n-grid>

      <!-- 其他选项 -->
      <n-grid :cols="4" :x-gap="12">
        <n-gi>
          <n-form-item label="置顶">
            <n-switch v-model:value="formData.is_top" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="原创">
            <n-switch v-model:value="formData.is_original" />
          </n-form-item>
        </n-gi>
        <n-gi span="2">
          <n-form-item label="状态" path="status">
            <n-radio-group v-model:value="formData.status">
              <n-radio :value="0">草稿</n-radio>
              <n-radio :value="1">发布</n-radio>
            </n-radio-group>
          </n-form-item>
        </n-gi>
      </n-grid>
    </n-form>

    <!-- 操作按钮 -->
    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSubmit">保存</n-button>
        <n-button type="success" @click="handlePublish">发布</n-button>
      </n-space>
    </template>
  </n-card>
</template>
```

## 高级功能

### 1. 文章草稿自动保存

```go
// AutoSaveService 自动保存服务
type AutoSaveService struct {
    redis *redis.Client
}

// SaveDraft 保存草稿
func (s *AutoSaveService) SaveDraft(
    ctx context.Context,
    userID uint64,
    articleID uint64,
    content map[string]interface{},
) error {
    key := fmt.Sprintf("draft:%d:%d", userID, articleID)
    data, _ := json.Marshal(content)
    return s.redis.Set(ctx, key, data, 7*24*time.Hour).Err()
}

// GetDraft 获取草稿
func (s *AutoSaveService) GetDraft(
    ctx context.Context,
    userID uint64,
    articleID uint64,
) (map[string]interface{}, error) {
    key := fmt.Sprintf("draft:%d:%d", userID, articleID)
    data, err := s.redis.Get(ctx, key).Result()
    if err != nil {
        return nil, err
    }

    var result map[string]interface{}
    err = json.Unmarshal([]byte(data), &result)
    return result, err
}
```

### 2. 文章版本控制

```go
// ArticleVersion 文章版本
type ArticleVersion struct {
    BaseModel
    ArticleID   uint64 `gorm:"index"`
    Version     int    `gorm:"not null"`
    Title       string `gorm:"not null"`
    Content     string `gorm:"type:text"`
    AuthorID    uint64 `gorm:"not null"`
    ChangeLog   string `gorm:"type:text"`
}

// SaveVersion 保存版本
func (s *ArticleService) SaveVersion(
    ctx context.Context,
    article *Article,
    changeLog string,
) error {
    // 获取当前版本号
    var count int64
    s.db.Model(&ArticleVersion{}).
        Where("article_id = ?", article.ID).
        Count(&count)

    version := &ArticleVersion{
        ArticleID: article.ID,
        Version:   int(count) + 1,
        Title:     article.Title,
        Content:   article.Content,
        AuthorID:  article.AuthorID,
        ChangeLog: changeLog,
    }

    return s.db.Create(version).Error
}
```

### 3. 全文搜索

```go
// SearchArticle 全文搜索
func (s *ArticleService) Search(
    ctx context.Context,
    keyword string,
    page, pageSize int,
) ([]*Article, int64, error) {
    // 1. 尝试从搜索索引获取
    // 2. 回退到数据库 LIKE 查询
    return s.articleRepo.Search(ctx, keyword, page, pageSize)
}
```

## 性能优化

### 1. 文章列表缓存

```go
func (s *ArticleService) List(
    ctx context.Context,
    req *ListRequest,
) ([]*Article, int64, error) {
    // 生成缓存键
    cacheKey := fmt.Sprintf("article:list:%d:%d:%d:%d",
        req.Page, req.PageSize, req.CategoryID, req.Status)

    // 尝试从缓存获取
    cached, _ := s.redis.Get(ctx, cacheKey).Result()
    if cached != "" {
        var result struct {
            Data  []*Article `json:"data"`
            Total int64       `json:"total"`
        }
        json.Unmarshal([]byte(cached), &result)
        return result.Data, result.Total, nil
    }

    // 查询数据库
    articles, total, err := s.articleRepo.List(ctx, req)
    if err != nil {
        return nil, 0, err
    }

    // 缓存 5 分钟
    data, _ := json.Marshal(map[string]interface{}{
        "data":  articles,
        "total": total,
    })
    s.redis.Set(ctx, cacheKey, data, 5*time.Minute)

    return articles, total, nil
}
```

### 2. 热门文章缓存

```go
func (s *ArticleService) GetHotArticles(
    ctx context.Context,
    limit int,
) ([]*Article, error) {
    cacheKey := "article:hot:" + strconv.Itoa(limit)

    // 检查缓存
    cached, _ := s.redis.Get(ctx, cacheKey).Result()
    if cached != "" {
        var articles []*Article
        json.Unmarshal([]byte(cached), &articles)
        return articles, nil
    }

    // 查询数据库
    articles, err := s.articleRepo.GetHotArticles(ctx, limit)
    if err != nil {
        return nil, err
    }

    // 缓存 1 小时
    data, _ := json.Marshal(articles)
    s.redis.Set(ctx, cacheKey, data, time.Hour)

    return articles, nil
}
```

## 与 Java 对比

### JPA vs GORM 关联查询

**Java:**
```java
@Entity
class Article {
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToMany
    @JoinTable(name = "article_tags")
    private Set<Tag> tags;
}

// 查询时
repository.findAllWithCategoryAndTags();
```

**Go:**
```go
// 预加载关联
db.Preload("Category").Preload("Tags").Find(&articles)

// 手动 Joins
db.Joins("JOIN categories ON categories.id = articles.category_id").
    Find(&articles)
```

### 分页查询

**Java (Spring Data):**
```java
Pageable pageable = PageRequest.of(page, pageSize, sort);
Page<Article> page = repository.findAll(pageable);
```

**Go:**
```go
offset := (page - 1) * pageSize
query.Offset(offset).Limit(pageSize).Find(&articles)
```

## 测试要点

1. 创建文章时标签关联正确
2. 删除文章时清理关联关系
3. 浏览量正确增加
4. 搜索功能正常工作
5. 分页数据准确

## 下一步

文章管理完成后，查看「[Docker 部署](/guide/docker)」
