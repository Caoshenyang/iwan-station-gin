---
title: "内容管理 API"
description: "Iwan Station Gin 文档：内容管理 API。"
---

# 内容管理 API

::: tip 💡 快速查阅
按模块查找对应 API 的路径、方法和权限要求。
:::

## 页面导航

[[toc]]

## 分类 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/category/list | 分类列表 | category:list |
| GET | /api/v1/category/tree | 分类树 | category:tree |
| POST | /api/v1/category/create | 创建分类 | category:create |
| PUT | /api/v1/category/:id | 更新分类 | category:update |
| DELETE | /api/v1/category/:id | 删除分类 | category:delete |

## 标签 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/tag/list | 标签列表 | tag:list |
| POST | /api/v1/tag/create | 创建标签 | tag:create |
| PUT | /api/v1/tag/:id | 更新标签 | tag:update |
| DELETE | /api/v1/tag/:id | 删除标签 | tag:delete |

## 文章 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/article/list | 文章列表 | article:list |
| GET | /api/v1/article/:id | 文章详情 | article:detail |
| POST | /api/v1/article/create | 创建文章 | article:create |
| PUT | /api/v1/article/:id | 更新文章 | article:update |
| DELETE | /api/v1/article/:id | 删除文章 | article:delete |

## 数据模型

```go
// 分类
type Category struct {
    ID       uint64 `json:"id"`
    ParentID uint64 `json:"parent_id"`
    Name     string `json:"name"`
    Sort     int    `json:"sort"`
}

// 标签
type Tag struct {
    ID        uint64 `json:"id"`
    Name      string `json:"name"`
    Slug      string `json:"slug"`
}

// 文章
type Article struct {
    ID         uint64   `json:"id"`
    Title      string   `json:"title"`
    Content    string   `json:"content"`
    CategoryID uint64   `json:"category_id"`
    Tags       []Tag    `json:"tags"`
    Status     int      `json:"status"` // 1=发布, 0=草稿
}
```

## 树形结构处理

```go
// 构建分类树
func BuildCategoryTree(categories []Category) []CategoryNode {
    nodeMap := make(map[uint64]*CategoryNode)
    for _, cat := range categories {
        nodeMap[cat.ID] = &CategoryNode{Category: cat}
    }

    var roots []CategoryNode
    for _, cat := range categories {
        node := nodeMap[cat.ID]
        if cat.ParentID == 0 {
            roots = append(roots, *node)
        } else {
            if parent, ok := nodeMap[cat.ParentID]; ok {
                parent.Children = append(parent.Children, node)
            }
        }
    }
    return roots
}
```


