---
title: "分类管理模块"
description: "Iwan Station Gin 文档：分类管理模块。"
---

# 分类管理模块

## 数据模型

### 分类表结构

```sql
CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_id BIGINT DEFAULT 0 COMMENT '父级ID',
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    icon VARCHAR(50) COMMENT '图标',
    path VARCHAR(255) COMMENT '路径',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_status (status)
) COMMENT='分类表';
```

### Go 模型定义

```go
// Category 分类模型
type Category struct {
    BaseModel
    ParentID uint64 `gorm:"default:0" json:"parent_id"`
    Name     string `gorm:"type:varchar(50);not null" json:"name"`
    Icon     string `gorm:"type:varchar(50)" json:"icon"`
    Path     string `gorm:"type:varchar(255)" json:"path"`
    Sort     int    `gorm:"type:int;default:0" json:"sort"`
    Status   int    `gorm:"type:tinyint;default:1" json:"status"`
}
```

## 业务逻辑

### 分类仓储

```go
// CategoryRepository 分类仓储
type CategoryRepository struct {
    *BaseRepository
}

// GetTree 获取分类树
func (r *CategoryRepository) GetTree(ctx context.Context) ([]*Category, error) {
    categories, err := r.ListAll(ctx)
    if err != nil {
        return nil, err
    }
    return r.buildTree(categories, 0), nil
}

// buildTree 构建树形结构
func (r *CategoryRepository) buildTree(
    categories []*Category,
    parentID uint64,
) []*Category {
    var tree []*Category
    for _, category := range categories {
        if category.ParentID == parentID {
            children := r.buildTree(categories, category.ID)
            // 可以添加 Children 字段
            tree = append(tree, category)
        }
    }
    return tree
}
```

### 分类服务

```go
// CategoryService 分类服务
type CategoryService struct {
    categoryRepo *CategoryRepository
    logger       *zap.Logger
}

// Create 创建分类
func (s *CategoryService) Create(
    ctx context.Context,
    req *CreateCategoryRequest,
) error {
    category := &model.Category{
        ParentID: req.ParentID,
        Name:     req.Name,
        Icon:     req.Icon,
        Path:     req.Path,
        Sort:     req.Sort,
        Status:   req.Status,
    }

    return s.categoryRepo.Create(ctx, category)
}

// Delete 删除分类
func (s *CategoryService) Delete(ctx context.Context, id uint64) error {
    // 检查是否有子分类
    children, _ := s.categoryRepo.GetByParentID(ctx, id)
    if len(children) > 0 {
        return errors.New("存在子分类，无法删除")
    }

    return s.categoryRepo.Delete(ctx, id)
}
```

## API 接口

### 获取分类树

```http
GET /api/v1/category/tree
Authorization: Bearer {token}

响应:
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "技术",
      "children": [
        { "id": 2, "name": "Go" },
        { "id": 3, "name": "Vue" }
      ]
    }
  ]
}
```

### 创建分类

```http
POST /api/v1/category/create
Authorization: Bearer {token}
Content-Type: application/json

请求体:
{
  "parent_id": 0,
  "name": "Go",
  "icon": "logo-go",
  "path": "/go",
  "sort": 1,
  "status": 1
}
```

## 前端实现

### 分类树组件

```vue
<template>
  <n-tree
    :data="treeData"
    :show-line="true"
    key-field="id"
    label-field="name"
    children-field="children"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCategoryTree } from '@/api/category'

const treeData = ref([])

onMounted(async () => {
  treeData.value = await getCategoryTree()
})
</script>
```

### 树形选择器

```vue
<n-tree-select
  v-model:value="formData.parent_id"
  :options="parentOptions"
  key-field="id"
  label-field="name"
  children-field="children"
/>
```

## 设计要点

### 1. 树形结构处理

分类的难点在于树形结构的处理：

```go
// 扁平数据转树形
func buildTree(items []*Category, parentID uint64) []*Category {
    var tree []*Category
    for _, item := range items {
        if item.ParentID == parentID {
            item.Children = buildTree(items, item.ID)
            tree = append(tree, item)
        }
    }
    return tree
}

// 树形转扁平（用于更新排序）
func flattenTree(items []*Category) []*Category {
    var result []*Category
    for _, item := range items {
        result = append(result, item)
        if len(item.Children) > 0 {
            result = append(result, flattenTree(item.Children)...)
        }
    }
    return result
}
```

### 2. 级联删除

删除分类时需要处理：

```go
func (s *CategoryService) Delete(ctx context.Context, id uint64) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 检查子分类
        var count int64
        tx.Model(&Category{}).Where("parent_id = ?", id).Count(&count)
        if count > 0 {
            return errors.New("存在子分类")
        }

        // 2. 更新关联的文章
        tx.Model(&Article{}).
            Where("category_id = ?", id).
            Update("category_id", 0)

        // 3. 删除分类
        return tx.Delete(&Category{}, id).Error
    })
}
```

### 3. 路径处理

分类路径用于构建 URL：

```go
// 生成完整路径
func (c *Category) GetFullPath() string {
    if c.ParentID == 0 {
        return "/" + c.Path
    }
    // 需要递归查询父级路径
    return ""
}
```

## 与 Java 对比

### MyBatis vs GORM

**Java (MyBatis):**
```java
@Select("SELECT * FROM categories WHERE parent_id = #{parentId}")
List<Category> findByParentId(Long parentId);
```

**Go (GORM):**
```go
func (r *CategoryRepository) GetByParentID(
    ctx context.Context,
    parentID uint64,
) ([]*Category, error) {
    var categories []*Category
    err := r.DB.WithContext(ctx).
        Where("parent_id = ?", parentID).
        Find(&categories).Error
    return categories, err
}
```

### 递归查询

**Java:**
```java
// 通常使用 MyBatis 递归查询或 Java 递归
```

**Go:**
```go
// 先查询所有，再在代码中构建树
func (r *CategoryRepository) GetTree(ctx context.Context) ([]*Category, error) {
    var all []*Category
    r.FindAll(ctx, &all)
    return r.buildTree(all, 0), nil
}
```

## 性能优化

### 缓存分类树

分类树变化不频繁，适合缓存：

```go
func (s *CategoryService) GetTree(ctx context.Context) ([]*Category, error) {
    // 尝试从 Redis 获取
    cacheKey := "category:tree"
    cached, _ := s.redis.Get(ctx, cacheKey).Result()
    if cached != "" {
        var result []*Category
        json.Unmarshal([]byte(cached), &result)
        return result, nil
    }

    // 查询数据库
    tree, err := s.categoryRepo.GetTree(ctx)
    if err != nil {
        return nil, err
    }

    // 缓存 1 小时
    data, _ := json.Marshal(tree)
    s.redis.Set(ctx, cacheKey, data, time.Hour)

    return tree, nil
}
```

## 测试要点

### 测试用例

1. **创建顶级分类**
2. **创建子级分类**
3. **创建多级嵌套**
4. **更新分类信息**
5. **移动分类（改变父级）**
6. **删除无子分类的分类**
7. **拒绝删除有子分类的分类**

## 下一步

分类和标签是内容管理的基础，接下来学习「[标签管理模块](/guide/tag-module)」


