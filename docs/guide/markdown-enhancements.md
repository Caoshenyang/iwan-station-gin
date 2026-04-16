---
title: Markdown 扩展示例
description: "集中演示 VitePress 在本项目中已经启用的 Markdown 扩展能力，包括 GitHub Alerts、代码聚焦、代码导入、数学公式和图片懒加载。"
---

# Markdown 扩展示例

::: tip 使用建议
这一页是整个文档站的 Markdown 写作样板。以后新增教程页时，优先从这里复制语法，而不是到处重复试错。
:::

## 页面导航

[[toc]]

## 全局能力

以下能力已经在站点配置里全局开启：

- 代码块行号
- 数学公式渲染
- Markdown 图片懒加载
- `[[toc]]` 目录级别统一为二级到三级标题

## GitHub 风格的警报

下面直接使用 GitHub Alerts 语法，不需要额外插件：

> [!TIP]
> 适合放“推荐做法”或“第一次阅读时先抓住什么”的提醒。

> [!NOTE]
> 适合放补充说明、实现背景或与其他章节之间的跳转关系。

> [!WARNING]
> 适合放容易踩坑的地方，例如路径、环境变量、大小写、生产配置差异。

## 代码块增强

### 行高亮

```ts{2,4-6}
export function createAuthHeader(token: string) {
  const normalized = token.trim()
  return {
    Authorization: `Bearer ${normalized}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}
```

### 聚焦、颜色差异、错误与警告

```ts
const columns = [
  { title: '用户名', key: 'username' }, // [!code ++]
  { title: '邮箱', key: 'email' }, // [!code focus]
  { title: '手机号', key: 'phone' } // [!code --]
]

submitForm(payload) // [!code warning]
unsafeEval(payload) // [!code error]
```

上面的单个代码块里同时演示了：

- `focus`：突出当前最重要的代码
- `++ / --`：表示新增或移除的逻辑
- `warning / error`：强调潜在风险和错误位置

## 导入代码片段

### 导入完整文件

下面的请求示例直接从外部 `.http` 文件导入，适合接口文档、SQL 示例、Docker 配置等可复用片段：

<<< @/snippets/markdown-demo/login-request.http

### 导入指定区域

下面只导入路由文件里 `auth-routes` 这一个区域，适合大型代码文件按块引用：

<<< @/snippets/markdown-demo/router.ts#auth-routes

## 包含 Markdown 文件

如果一段说明需要在多个页面重复出现，可以把它抽成独立 Markdown 片段，再通过 `include` 复用：

<!--@include: ./_includes/markdown-alerts.md-->

## 数学方程

在讲权限模型、缓存命中率或性能公式时，可以直接写数学表达式。

行内公式示例：缓存命中率可以写成 $hit\ rate = \frac{hit}{hit + miss}$。

块级公式示例：

$$
T_{response} = T_{network} + T_{service} + T_{database}
$$

再比如分页总页数可以表示为：

$$
pages = \left\lceil \frac{total}{pageSize} \right\rceil
$$

## 图片懒加载

Markdown 图片现在已经按站点配置启用懒加载，适合后续章节插入架构图、流程图和截图。

![Iwan Station Logo](/images/logo.svg)

## 高级配置

下面这段配置直接来自当前站点的实际 `VitePress` 配置文件：

<<< @/.vitepress/config.mts#markdown-config

::: info 推荐约定
教程型文档优先使用 `tip / warning / details / code-group / [[toc]]` 这些高频、稳定、低学习成本的语法；只有在确实能提升理解效率时，再引入更进阶的写法。
:::
