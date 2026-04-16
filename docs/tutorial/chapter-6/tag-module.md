---
title: "标签管理模块"
description: "标签用于给文章打标签，便于分类和检索。"
---

# 标签管理模块

## 数据模型

### 标签表设计

标签用于给文章打标签，便于分类和检索。

```sql
CREATE TABLE tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '标签名称',
    color VARCHAR(20) COMMENT '标签颜色',
    status TINYINT DEFAULT 1 COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) COMMENT='标签表';

-- 文章标签关联表
CREATE TABLE article_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    article_id BIGINT NOT NULL COMMENT '文章ID',
    tag_id BIGINT NOT NULL COMMENT '标签ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_article_tag (article_id, tag_id),
    INDEX idx_article_id (article_id),
    INDEX idx_tag_id (tag_id)
) COMMENT='文章标签关联表';
```

## 业务逻辑

### 标签仓储

```go
// TagRepository 标签仓储
type TagRepository struct {
    *BaseRepository
}

// GetOrCreate 获取或创建标签
func (r *TagRepository) GetOrCreate(
    ctx context.Context,
    name string,
) (*Tag, error) {
    // 先尝试查找
    tag, err := r.FindByName(ctx, name)
    if err == nil {
        return tag, nil
    }

    // 不存在则创建
    tag = &Tag{
        Name:   name,
        Status: 1,
    }

    if err := r.Create(ctx, tag); err != nil {
        return nil, err
    }

    return tag, nil
}

// GetHotTags 获取热门标签
func (r *TagRepository) GetHotTags(
    ctx context.Context,
    limit int,
) ([]*Tag, error) {
    // 按使用次数排序
    type TagCount struct {
        TagID uint64
        Count int
    }

    var tagCounts []TagCount
    err := r.DB.WithContext(ctx).
        Model(&ArticleTag{}).
        Select("tag_id as tag_id, COUNT(*) as count").
        Group("tag_id").
        Order("count DESC").
        Limit(limit).
        Scan(&tagCounts).Error

    if err != nil {
        return nil, err
    }

    // 获取标签详情
    var tags []*Tag
    for _, tc := range tagCounts {
        tag, _ := r.FindByID(ctx, tc.TagID)
        if tag != nil {
            tags = append(tags, tag)
        }
    }

    return tags, nil
}
```

### 标签服务

```go
// TagService 标签服务
type TagService struct {
    tagRepo *TagRepository
    logger  *zap.Logger
}

// GetOrCreate 获取或创建标签
func (s *TagService) GetOrCreate(
    ctx context.Context,
    name string,
) (*Tag, error) {
    return s.tagRepo.GetOrCreate(ctx, name)
}

// UpdateUsage 更新标签使用计数
func (s *TagService) UpdateUsage(
    ctx context.Context,
    tagID uint64,
) error {
    // 可以异步更新，或者使用计数器
    return nil
}
```

## API 接口

### 获取热门标签

```http
GET /api/v1/tag/hot?limit=20
Authorization: Bearer {token}

响应:
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "Go",
      "color": "#18a058",
      "count": 100
    }
  ]
}
```

### 创建标签

```http
POST /api/v1/tag/create
Authorization: Bearer {token}
Content-Type: application/json

请求体:
{
  "name": "Go",
  "color": "#18a058",
  "status": 1
}
```

## 前端实现

### 标签选择器

支持多选和搜索：

```vue
<template>
  <n-select
    v-model:value="selectedTags"
    :options="tagOptions"
    multiple
    filterable
    tag
    placeholder="选择标签"
    @update:value="handleChange"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAllTags } from '@/api/tags'

const selectedTags = ref([])
const tagOptions = ref([])

onMounted(async () => {
  const tags = await getAllTags()
  tagOptions.value = tags.map(tag => ({
    label: tag.name,
    value: tag.id
  }))
})

const handleChange = (value) => {
  console.log('选中的标签:', value)
}
</script>
```

### 标签云组件

```vue
<template>
  <div class="tag-cloud">
    <n-tag
      v-for="tag in tags"
      :key="tag.id"
      :color="{ color: tag.color, textColor: '#fff' }"
      :size="getTagSize(tag.count)"
      round
      class="tag-item"
    >
      {{ tag.name }}
    </n-tag>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHotTags } from '@/api/tags'

const tags = ref([])

const getTagSize = (count) => {
  if (count > 100) return 'large'
  if (count > 50) return 'medium'
  return 'small'
}

onMounted(async () => {
  tags.value = await getHotTags(30)
})
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.1);
}
</style>
```

## 高级功能

### 1. 智能标签推荐

根据文章内容推荐标签：

```go
// RecommendTags 推荐标签
func (s *TagService) RecommendTags(
    ctx context.Context,
    content string,
) ([]*Tag, error) {
    // 1. 提取关键词
    keywords := extractKeywords(content)

    // 2. 查找相似标签
    var tags []*Tag
    for _, keyword := range keywords {
        tag, _ := s.tagRepo.FindByName(ctx, keyword)
        if tag != nil {
            tags = append(tags, tag)
        }
    }

    return tags, nil
}
```

### 2. 标签合并

合并相似或重复的标签：

```go
// MergeTags 合并标签
func (s *TagService) MergeTags(
    ctx context.Context,
    sourceID, targetID uint64,
) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 更新文章标签关联
        tx.Model(&ArticleTag{}).
            Where("tag_id = ?", sourceID).
            Update("tag_id", targetID)

        // 2. 删除源标签
        return tx.Delete(&Tag{}, sourceID).Error
    })
}
```

### 3. 标签颜色自动生成

根据标签名称生成颜色：

```go
// GenerateColor 生成标签颜色
func GenerateColor(name string) string {
    // 使用哈希值生成颜色
    hash := fnv.New32()
    hash.Write([]byte(name))
    hue := hash.Sum32() % 360

    return fmt.Sprintf("hsl(%d, 70%%, 50%%)", hue)
}
```

## 性能考虑

### 标签查询优化

```go
// 批量获取标签信息
func (r *TagRepository) GetByIDs(
    ctx context.Context,
    ids []uint64,
) ([]*Tag, error) {
    var tags []*Tag
    err := r.DB.WithContext(ctx).
        Where("id IN ?", ids).
        Find(&tags).Error
    return tags, err
}

// 预加载标签信息
func (r *ArticleRepository) FindByID(
    ctx context.Context,
    id uint64,
) (*Article, error) {
    var article Article
    err := r.DB.WithContext(ctx).
        Preload("Category").
        Preload("Tags"). // 预加载标签
        First(&article, id).Error
    return &article, err
}
```

## 设计要点

### 1. 标签命名规范

- 使用简短的中文名称
- 避免特殊字符
- 保持一致性

### 2. 标签数量控制

- 一篇文章建议 3-5 个标签
- 系统级标签和管理级标签分开

### 3. 标签颜色方案

建议使用统一的配色方案：

```go
var TagColors = []string{
    "#18a058", // 绿色
    "#2080f0", // 蓝色
    "#f0a020", // 橙色
    "#d03050", // 红色
    "#722ed1", // 紫色
}
```

## 与 Java 对比

### 标签关联处理

**Java:**
```java
@Entity
class Article {
    @ManyToMany
    @JoinTable(
        name = "article_tags",
        joinColumns = @JoinColumn(name = "article_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    List<Tag> tags;
}
```

**Go:**
```go
type Article struct {
    BaseModel
    Tags []Tag `gorm:"many2many:article_tags" json:"tags"`
}

// 预加载
db.Preload("Tags").Find(&articles)
```

### 批量操作

**Java:**
```java
// 通常使用 foreach 循环
for (Tag tag : tags) {
    repository.save(tag);
}
```

**Go:**
```go
// 批量插入
db.Create(&tags)

// 使用 CopyIn 批量
db.Clauses(clause.OnConflict{
    DoNothing: true,
}).Create(&tags)
```

## 测试要点

1. 创建重复名称标签应失败
2. 删除标签时清理关联关系
3. 热门标签按使用量排序
4. 标签颜色正确显示

## 下一步

标签和分类准备好后，我们开始「[文章管理模块](/guide/article-module)」

