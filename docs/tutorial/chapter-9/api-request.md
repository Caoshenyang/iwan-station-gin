---
title: "API 请求封装"
description: "Iwan Station Gin 文档：API 请求封装。"
---

# API 请求封装

::: tip 💡 怎么读这页
这页封装 Axios 请求层，包括拦截器、Token 注入和错误处理。这是前端与后端对接的基础，建议仔细理解每个拦截器的作用。
:::

## 页面导航

[[toc]]

## 📚 官方文档

- **Axios 官方文档**: https://axios-http.com/
- **TypeScript 官方文档**: https://www.typescriptlang.org/

---

## 一、Axios 基础配置

### 1.1 创建实例

```typescript
// src/api/index.ts
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'

// 创建 Axios 实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default request
```

### 1.2 请求拦截器

```typescript
// src/api/index.ts
import { useUserStore } from '@/stores/user'

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()

    // 添加 Token
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 添加请求 ID
    config.headers['X-Request-ID'] = generateRequestId()

    // 添加时间戳（防止缓存）
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 生成请求 ID
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

### 1.3 响应拦截器

```typescript
// src/api/index.ts
import { useMessage } from 'naive-ui'
import router from '@/router'

const message = useMessage()

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, data, message: msg } = response.data

    // 成功响应
    if (code === 200 || code === 0) {
      return data
    }

    // 业务错误
    message.error(msg || '请求失败')
    return Promise.reject(new Error(msg || '请求失败'))
  },
  (error) => {
    const { response } = error

    if (response) {
      // HTTP 错误状态码处理
      switch (response.status) {
        case 401:
          message.error('未授权，请重新登录')
          const userStore = useUserStore()
          userStore.logout()
          router.push('/login')
          break
        case 403:
          message.error('没有权限访问')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器错误')
          break
        default:
          message.error(response.data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时')
    } else {
      message.error('网络错误')
    }

    return Promise.reject(error)
  }
)
```

---

## 二、类型定义

### 2.1 响应类型

```typescript
// src/types/api.d.ts
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PageResult<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface RequestParams {
  [key: string]: any
}
```

### 2.2 分页请求

```typescript
// src/types/api.d.ts
export interface PageRequest {
  page: number
  pageSize: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PageResponse<T = any> {
  list: T[]
  total: number
}
```

---

## 三、API 模块封装

### 3.1 认证相关

```typescript
// src/api/auth.ts
import request from './index'
import type { ApiResponse, LoginForm, LoginResponse, UserInfo } from '@/types/api'

/**
 * 用户登录
 */
export function login(data: LoginForm): Promise<ApiResponse<LoginResponse>> {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

/**
 * 获取用户信息
 */
export function getUserInfo(): Promise<ApiResponse<UserInfo>> {
  return request({
    url: '/auth/user',
    method: 'get'
  })
}

/**
 * 退出登录
 */
export function logout(): Promise<ApiResponse<void>> {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

/**
 * 刷新 Token
 */
export function refreshToken(): Promise<ApiResponse<LoginResponse>> {
  return request({
    url: '/auth/refresh',
    method: 'post'
  })
}

/**
 * 修改密码
 */
export function changePassword(data: {
  oldPassword: string
  newPassword: string
}): Promise<ApiResponse<void>> {
  return request({
    url: '/auth/change-password',
    method: 'post',
    data
  })
}
```

### 3.2 用户管理

```typescript
// src/api/user.ts
import request from './index'
import type { ApiResponse, PageResponse, UserInfo, UserForm } from '@/types/api'

/**
 * 获取用户列表
 */
export function getUserList(params: {
  page: number
  pageSize: number
  keyword?: string
  status?: number
}): Promise<ApiResponse<PageResponse<UserInfo>>> {
  return request({
    url: '/user/list',
    method: 'get',
    params
  })
}

/**
 * 获取用户详情
 */
export function getUserById(id: number): Promise<ApiResponse<UserInfo>> {
  return request({
    url: `/user/${id}`,
    method: 'get'
  })
}

/**
 * 创建用户
 */
export function createUser(data: UserForm): Promise<ApiResponse<void>> {
  return request({
    url: '/user/create',
    method: 'post',
    data
  })
}

/**
 * 更新用户
 */
export function updateUser(data: UserForm): Promise<ApiResponse<void>> {
  return request({
    url: '/user/update',
    method: 'put',
    data
  })
}

/**
 * 删除用户
 */
export function deleteUser(id: number): Promise<ApiResponse<void>> {
  return request({
    url: `/user/${id}`,
    method: 'delete'
  })
}

/**
 * 分配角色
 */
export function assignUserRoles(data: {
  userId: number
  roleIds: number[]
}): Promise<ApiResponse<void>> {
  return request({
    url: `/user/${data.userId}/roles`,
    method: 'put',
    data: { role_ids: data.roleIds }
  })
}
```

### 3.3 文章管理

```typescript
// src/api/article.ts
import request from './index'
import type { ApiResponse, PageResponse, Article, ArticleForm } from '@/types/api'

/**
 * 获取文章列表
 */
export function getArticleList(params: {
  page: number
  pageSize: number
  categoryId?: number
  status?: number
  keyword?: string
}): Promise<ApiResponse<PageResponse<Article>>> {
  return request({
    url: '/article/list',
    method: 'get',
    params
  })
}

/**
 * 获取文章详情
 */
export function getArticleById(id: number): Promise<ApiResponse<Article>> {
  return request({
    url: `/article/${id}`,
    method: 'get'
  })
}

/**
 * 创建文章
 */
export function createArticle(data: ArticleForm): Promise<ApiResponse<void>> {
  return request({
    url: '/article/create',
    method: 'post',
    data
  })
}

/**
 * 更新文章
 */
export function updateArticle(data: ArticleForm): Promise<ApiResponse<void>> {
  return request({
    url: '/article/update',
    method: 'put',
    data
  })
}

/**
 * 删除文章
 */
export function deleteArticle(id: number): Promise<ApiResponse<void>> {
  return request({
    url: `/article/${id}`,
    method: 'delete'
  })
}

/**
 * 获取热门文章
 */
export function getHotArticles(limit = 10): Promise<ApiResponse<Article[]>> {
  return request({
    url: '/article/hot',
    method: 'get',
    params: { limit }
  })
}

/**
 * 搜索文章
 */
export function searchArticles(params: {
  keyword: string
  page: number
  pageSize: number
}): Promise<ApiResponse<PageResponse<Article>>> {
  return request({
    url: '/article/search',
    method: 'get',
    params
  })
}
```

### 3.4 数据统计

```typescript
// src/api/dashboard.ts
import request from './index'
import type { ApiResponse, DashboardStats } from '@/types/api'

/**
 * 获取仪表盘统计数据
 */
export function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return request({
    url: '/dashboard/stats',
    method: 'get'
  })
}

/**
 * 获取用户趋势
 */
export function getUserTrend(days = 7): Promise<ApiResponse<any[]>> {
  return request({
    url: '/dashboard/trend/users',
    method: 'get',
    params: { days }
  })
}

/**
 * 获取分类统计
 */
export function getCategoryStats(): Promise<ApiResponse<any[]>> {
  return request({
    url: '/dashboard/stats/categories',
    method: 'get'
  })
}
```

---

## 四、请求方法封装

### 4.1 通用请求方法

```typescript
// src/api/request.ts
import request from './index'
import type { ApiResponse } from '@/types/api'

export default {
  get<T = any>(url: string, params?: any): Promise<T> {
    return request.get(url, { params })
  },

  post<T = any>(url: string, data?: any): Promise<T> {
    return request.post(url, data)
  },

  put<T = any>(url: string, data?: any): Promise<T> {
    return request.put(url, data)
  },

  delete<T = any>(url: string, params?: any): Promise<T> {
    return request.delete(url, { params })
  },

  upload<T = any>(url: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
```

### 4.2 使用示例

```typescript
// 在组件中使用
import api from '@/api/request'
import { getUserList } from '@/api/user'

// 方式1：使用封装的方法
const loadUsers = async () => {
  const data = await getUserList({
    page: 1,
    pageSize: 10
  })
  console.log(data.list, data.total)
}

// 方式2：使用通用方法
const loadArticle = async (id: number) => {
  const article = await api.get(`/article/${id}`)
  console.log(article)
}
```

---

## 五、错误处理

### 5.1 错误处理封装

```typescript
// src/api/error-handler.ts
import { useMessage } from 'naive-ui'

const message = useMessage()

export class ApiError extends Error {
  code: number
  response?: any

  constructor(code: number, msg: string, response?: any) {
    super(msg)
    this.code = code
    this.response = response
    this.name = 'ApiError'
  }
}

export function handleApiError(error: any): void {
  if (error instanceof ApiError) {
    message.error(error.message)
  } else if (error.response) {
    switch (error.response.status) {
      case 401:
        message.error('登录已过期，请重新登录')
        break
      case 403:
        message.error('没有权限执行此操作')
        break
      case 404:
        message.error('请求的资源不存在')
        break
      case 500:
        message.error('服务器错误，请稍后重试')
        break
      default:
        message.error(error.response.data?.message || '请求失败')
    }
  } else {
    message.error('网络连接失败')
  }
}

// 在组件中使用
import { handleApiError } from '@/api/error-handler'

const handleSubmit = async () => {
  try {
    await createArticle(form)
    message.success('创建成功')
  } catch (error) {
    handleApiError(error)
  }
}
```

### 5.2 全局错误处理

```typescript
// src/main.ts
import { handleApiError } from '@/api/error-handler'

app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err, info)
  handleApiError(err)
}
```

---

## 六、请求取消

### 6.1 AbortController

```typescript
// src/composables/useRequest.ts
import { ref, onUnmounted } from 'vue'
import type { AxiosRequestConfig } from 'axios'
import request from '@/api/index'

export function useRequest<T = any>() {
  const loading = ref(false)
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  let controller: AbortController | null = null

  const execute = async (config: AxiosRequestConfig) => {
    // 取消之前的请求
    if (controller) {
      controller.abort()
    }

    controller = new AbortController()
    loading.value = true
    error.value = null

    try {
      const response = await request({
        ...config,
        signal: controller.signal
      })
      data.value = response
      return response
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancel = () => {
    if (controller) {
      controller.abort()
    }
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    loading,
    data,
    error,
    execute,
    cancel
  }
}

// 使用示例
const { loading, data, execute } = useRequest<Article>()

const loadArticle = (id: number) => {
  execute({
    url: `/article/${id}`,
    method: 'get'
  })
}
```

---

## 七、请求重试

### 7.1 重试配置

```typescript
// src/api/retry.ts
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

interface RetryConfig {
  retries: number
  retryDelay: number
  retryCondition?: (error: any) => boolean
}

export function setupRetry(
  instance: AxiosInstance,
  config: RetryConfig
): void {
  const { retries, retryDelay, retryCondition } = config

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as InternalAxiosRequestConfig & { __retryCount?: number }

      // 判断是否需要重试
      if (!config || !retries || (retryCondition && !retryCondition(error))) {
        return Promise.reject(error)
      }

      // 初始化重试计数
      config.__retryCount = config.__retryCount || 0

      // 判断是否超过最大重试次数
      if (config.__retryCount >= retries) {
        return Promise.reject(error)
      }

      // 增加重试计数
      config.__retryCount++

      // 延迟重试
      await new Promise((resolve) => setTimeout(resolve, retryDelay))

      // 重新发送请求
      return instance(config)
    }
  )
}

// 使用
import request from './index'
import { setupRetry } from './retry'

setupRetry(request, {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // 只对网络错误和 5xx 错误重试
    return !error.response || error.response.status >= 500
  }
})
```

---

## 八、请求缓存

### 8.1 简单缓存实现

```typescript
// src/api/cache.ts
interface CacheItem {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheItem>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

export function getCachedData(key: string): any | null {
  const item = cache.get(key)
  if (!item) return null

  const now = Date.now()
  if (now - item.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }

  return item.data
}

export function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}
```

### 8.2 缓存装饰器

```typescript
// src/api/cache-decorator.ts
import { getCachedData, setCachedData } from './cache'

export function withCache<T = any>(
  fn: () => Promise<T>,
  key: string,
  duration?: number
): Promise<T> {
  // 尝试从缓存获取
  const cached = getCachedData(key)
  if (cached) {
    return Promise.resolve(cached)
  }

  // 执行请求
  return fn().then((data) => {
    setCachedData(key, data)
    return data
  })
}

// 使用示例
export function getUserInfo(): Promise<UserInfo> {
  return withCache(
    () => request.get('/auth/user'),
    'user:info'
  )
}
```

---

## 九、最佳实践

### 9.1 请求规范

```typescript
// ✅ 好的实践
export const articleApi = {
  list: (params: PageParams) => request.get('/article/list', { params }),
  detail: (id: number) => request.get(`/article/${id}`),
  create: (data: ArticleForm) => request.post('/article/create', data),
  update: (data: ArticleForm) => request.put('/article/update', data),
  delete: (id: number) => request.delete(`/article/${id}`)
}

// ❌ 不好的实践
export function getArticleList(page: number, pageSize: number, keyword?: string) {
  return request.get(`/article/list?page=${page}&pageSize=${pageSize}&keyword=${keyword}`)
}
```

### 9.2 类型安全

```typescript
// 使用泛型确保类型安全
export function getArticleById(id: number): Promise<Article> {
  return request.get<ApiResponse<Article>>(`/article/${id}`)
    .then(res => res.data)
}
```

---

## 十、练习任务

1. **基础任务**：封装 Axios，实现请求/响应拦截器
2. **进阶任务**：实现用户、文章相关 API 封装
3. **高级任务**：实现请求缓存和重试机制

---

## 课后阅读

- [Axios 官方文档 - 拦截器](https://axios-http.com/docs/interceptors)
- [Axios 官方文档 - 请求配置](https://axios-http.com/docs/req_config)
- [TypeScript 官方文档 - 泛型](https://www.typescriptlang.org/docs/handbook/2/generics.html)


