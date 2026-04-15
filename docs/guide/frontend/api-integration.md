# API 集成

## Axios 封装

```ts
// utils/request.ts
import axios from 'axios'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = useAuthStore().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      useAuthStore().logout()
    }
    return Promise.reject(error)
  }
)

export default request
```

## API 定义

```ts
// api/user.ts
import request from '@/utils/request'

export const userApi = {
  // 用户列表
  list: (params: ListParams) =>
    request.get('/user/list', { params }),

  // 用户详情
  detail: (id: number) =>
    request.get(`/user/${id}`),

  // 创建用户
  create: (data: CreateUserReq) =>
    request.post('/user/create', data),

  // 更新用户
  update: (id: number, data: UpdateUserReq) =>
    request.put(`/user/${id}`, data),

  // 删除用户
  delete: (id: number) =>
    request.delete(`/user/${id}`)
}
```

## 类型定义

```ts
// types/user.ts
export interface User {
  id: number
  username: string
  email: string
  status: number
  created_at: string
}

export interface ListParams {
  page: number
  page_size: number
  keyword?: string
  status?: number
}

export interface CreateUserReq {
  username: string
  password: string
  email: string
}
```

## 在组件中使用

```vue
<script setup lang="ts">
import { userApi } from '@/api/user'
import type { User } from '@/types/user'

const users = ref<User[]>([])
const loading = ref(false)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await userApi.list({ page: 1, page_size: 20 })
    users.value = res.data
  } finally {
    loading.value = false
  }
}
</script>
```
