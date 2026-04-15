# 登录与路由守卫

## 📚 相关文档

- [Vue Router 官方文档 - 导航守卫](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)
- [Pinia 官方文档 - Store](https://pinia.vuejs.org/zh/core-concepts/)
- [Naive UI 官方文档 - Form](https://www.naiveui.com/zh-CN/os-theme/components/form)

---

## 一、登录页面实现

### 1.1 登录表单

```vue
<!-- src/views/login/index.vue -->
<template>
  <div class="login-container">
    <n-card class="login-card" title="Iwan Station" :bordered="false">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="auto"
        size="large"
      >
        <n-form-item label="用户名" path="username">
          <n-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="formData.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            :input-props="{ autocomplete: 'current-password' }"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item>
          <n-checkbox v-model:checked="formData.rememberMe">
            记住我
          </n-checkbox>
        </n-form-item>

        <n-form-item>
          <n-button
            type="primary"
            block
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import type { FormInst, FormRules } from 'naive-ui'
import type { LoginForm } from '@/types/api'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive<LoginForm & { rememberMe: boolean }>({
  username: '',
  password: '',
  rememberMe: false
})

const rules: FormRules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: ['blur', 'input']
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input']
  }
}

const handleLogin = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    await userStore.login({
      username: formData.username,
      password: formData.password
    })

    // 获取用户信息
    await userStore.getUserInfo()

    message.success('登录成功')

    // 跳转到原来的页面或首页
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error: any) {
    if (error.errors) {
      // 表单验证失败
      return
    }
    message.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

:deep(.n-card__header) {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
}
</style>
```

### 1.2 User Store

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'
import { login as loginApi, getUserInfo as getUserInfoApi } from '@/api/auth'
import type { LoginForm, UserInfo } from '@/types/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: null as UserInfo | null,
    permissions: [] as string[]
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo?.username || '',
    avatar: (state) => state.userInfo?.avatar || '',
    hasPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission) || state.userInfo?.isAdmin
    }
  },

  actions: {
    async login(form: LoginForm) {
      try {
        const data = await loginApi(form)
        this.token = data.token
        localStorage.setItem('token', data.token)
      } catch (error) {
        throw error
      }
    },

    async getUserInfo() {
      try {
        const data = await getUserInfoApi()
        this.userInfo = data.user
        this.permissions = data.permissions
      } catch (error) {
        throw error
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.permissions = []
      localStorage.removeItem('token')
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'user',
        storage: localStorage
      }
    ]
  }
})
```

---

## 二、路由守卫

### 2.1 路由配置

```typescript
// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      hideInMenu: true
    }
  },
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页',
          icon: 'DashboardOutline',
          requiresAuth: true
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: {
          title: '用户管理',
          icon: 'PeopleOutline',
          requiresAuth: true,
          permission: '/user/list'
        }
      },
      {
        path: 'articles',
        name: 'Articles',
        component: () => import('@/views/articles/index.vue'),
        meta: {
          title: '文章管理',
          icon: 'DocumentTextOutline',
          requiresAuth: true,
          permission: '/article/list'
        }
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限', requiresAuth: false, hideInMenu: true }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', requiresAuth: false, hideInMenu: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### 2.2 路由守卫实现

```typescript
// src/router/guard.ts
import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { isString } from '@/utils/is'

// 白名单
const whiteList = ['/login', '/register']

export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()
    const appStore = useAppStore()

    // 开始加载
    appStore.setLoading(true)

    // 检查是否需要登录
    if (to.meta.requiresAuth !== false) {
      if (userStore.token) {
        // 已登录
        if (!userStore.userInfo) {
          // 没有用户信息，尝试获取
          try {
            await userStore.getUserInfo()
          } catch (error) {
            // 获取失败，可能 token 过期
            userStore.logout()
            next({
              path: '/login',
              query: { redirect: to.fullPath }
            })
            return
          }
        }

        // 检查权限
        if (to.meta.permission) {
          if (!userStore.hasPermission(to.meta.permission as string)) {
            next({ name: 'Forbidden' })
            return
          }
        }

        next()
      } else {
        // 未登录，跳转登录页
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
      }
    } else {
      // 白名单
      if (userStore.token && to.path === '/login') {
        next({ path: '/' })
      } else {
        next()
      }
    }
  })

  router.afterEach((to) => {
    // 设置页面标题
    setTitle(to.meta.title as string)

    // 结束加载
    const appStore = useAppStore()
    appStore.setLoading(false)
  })
}

function setTitle(title: string) {
  if (title) {
    document.title = `${title} - Iwan Station`
  } else {
    document.title = 'Iwan Station'
  }
}
```

### 2.3 进度条

```typescript
// src/router/progress.ts
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置
NProgress.configure({
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3
})

export function setupProgressGuard(router: Router) {
  router.beforeEach(() => {
    NProgress.start()
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
```

```bash
# 安装
npm install nprogress @types/nprogress -D
```

---

## 三、Token 管理

### 3.1 Token 存储

```typescript
// src/utils/auth.ts
const TOKEN_KEY = 'token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
```

### 3.2 Token 刷新

```typescript
// src/utils/refresh-token.ts
import { refreshToken as refreshTokenApi } from '@/api/auth'
import { setToken } from './auth'
import { useUserStore } from '@/stores/user'

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

export async function refreshToken(): Promise<string> {
  try {
    const data = await refreshTokenApi()
    const newToken = data.token
    setToken(newToken)
    onRefreshed(newToken)
    return newToken
  } catch (error) {
    refreshSubscribers = []
    throw error
  }
}

export function setupTokenRefresh() {
  // 请求拦截器中处理 401
  request.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // 正在刷新，将请求加入队列
          return new Promise((resolve) => {
            subscribeTokenRefresh((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(request(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const newToken = await refreshToken()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return request(originalRequest)
        } catch (refreshError) {
          // 刷新失败，退出登录
          const userStore = useUserStore()
          userStore.logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    }
  )
}
```

---

## 四、权限指令

### 4.1 指令实现

```typescript
// src/directives/permission.ts
import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const userStore = useUserStore()

    if (value && !userStore.hasPermission(value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

export default permission
```

### 4.2 注册指令

```typescript
// src/main.ts
import permission from '@/directives/permission'

app.directive('permission', permission)
```

### 4.3 使用指令

```vue
<template>
  <!-- 有权限才显示 -->
  <n-button v-permission="'/user/create'">创建用户</n-button>

  <!-- 多个权限满足其一 -->
  <n-button v-permission="['/user/create', '/user/update']">
    操作
  </n-button>
</template>
```

---

## 五、登出功能

### 5.1 登出实现

```vue
<!-- 在布局组件中 -->
<template>
  <n-dropdown :options="userOptions" @select="handleUserAction">
    <n-space align="center" :size="8" class="user-info">
      <n-avatar round :src="userStore.avatar" />
      <span class="username">{{ userStore.username }}</span>
    </n-space>
  </n-dropdown>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessage, NIcon } from 'naive-ui'
import { LogOutOutline, PersonOutline } from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const userOptions = [
  {
    label: '个人中心',
    key: 'profile',
    icon: () => h(NIcon, null, { default: () => h(PersonOutline) })
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(NIcon, null, { default: () => h(LogOutOutline) })
  }
]

const handleUserAction = (key: string) => {
  switch (key) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = () => {
  userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}
</script>
```

### 5.2 自动登出

```typescript
// src/composables/useAutoLogout.ts
import { onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30分钟

export function useAutoLogout() {
  const userStore = useUserStore()
  const router = useRouter()

  let timeoutId: number | null = null

  const resetTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      userStore.logout()
      router.push('/login')
    }, IDLE_TIMEOUT)
  }

  onMounted(() => {
    // 监听用户活动
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })
    resetTimer()
  })

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.removeEventListener(event, resetTimer)
    })
  })
}

// 在布局组件中使用
const { setupAutoLogout } = useAutoLogout()
setupAutoLogout()
```

---

## 六、最佳实践

### 6.1 安全建议

| 措施 | 说明 |
|------|------|
| HTTPS | 生产环境必须使用 HTTPS |
| HttpOnly Cookie | Token 可存储在 HttpOnly Cookie 中 |
| 短期 Token | Token 有效期不宜过长 |
| 刷新 Token | 使用 refresh token 机制 |
| 单点登录 | 同一账号只能在一处登录 |

### 6.2 用户体验

```typescript
// 记住上次登录的用户名
const rememberedUsername = localStorage.getItem('rememberedUsername')
if (rememberedUsername) {
  formData.username = rememberedUsername
  formData.rememberMe = true
}

// 登录成功后处理
if (formData.rememberMe) {
  localStorage.setItem('rememberedUsername', formData.username)
} else {
  localStorage.removeItem('rememberedUsername')
}
```

---

## 七、练习任务

1. **基础任务**：实现登录页面和表单验证
2. **进阶任务**：实现路由守卫和权限控制
3. **高级任务**：实现 Token 自动刷新和自动登出

---

## 课后阅读

- [Vue Router 官方文档 - 导航守卫](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)
- [Pinia 官方文档 - Actions](https://pinia.vuejs.org/zh/core-concepts/#actions)
- [Naive UI 官方文档 - Form](https://www.naiveui.com/zh-CN/os-theme/components/form)
