---
title: "Vue 3 项目初始化"
description: "Iwan Station Gin 文档：Vue 3 项目初始化。"
---

# Vue 3 项目初始化

::: tip 为什么这里选择 Naive UI？
Naive UI 的默认观感、暗色支持、主题定制和 TypeScript 体验都很适合后台管理系统教程。它既能保证审美上线，也适合展示更现代的 Vue 3 工程写法。
:::

## 📚 官方文档

- **Vue 3 官方文档**: https://cn.vuejs.org/
- **Vite 官方文档**: https://cn.vitejs.dev/
- **Naive UI 官方文档**: https://www.naiveui.com/zh-CN/os-theme
- **Vue Router 官方文档**: https://router.vuejs.org/zh/
- **Pinia 官方文档**: https://pinia.vuejs.org/zh/

---

## 页面导航

[[toc]]

---

## 一、技术栈选择

### 1.1 前端框架对比

| 特性 | Vue 3 | React | Angular |
|------|-------|-------|---------|
| 学习曲线 | 平缓 | 中等 | 陡峭 |
| 性能 | 极快 | 快 | 较快 |
| 体积 | 小 | 小 | 大 |
| 生态 | 完善 | 最完善 | 完善 |
| 类型支持 | 好 | 需配置 | 内置 |

### 1.2 项目技术栈

```yaml
核心框架:
  - Vue 3.5+        # 渐进式框架
  - Vite 6.0+       # 构建工具
  - TypeScript 5.7+ # 类型系统

UI 组件:
  - Naive UI        # Vue 3 组件库
  - UnoCSS          # 原子化 CSS

状态管理:
  - Pinia 2.2+      # 状态管理

路由:
  - Vue Router 4.5+ # 路由管理

HTTP:
  - Axios           # HTTP 客户端

工具库:
  - Day.js          # 日期处理
  - Lodash-es       # 工具函数
```

---

## 二、项目初始化

### 2.1 创建项目

::: code-group
```bash [npm]
# 使用 Vite 创建 Vue 3 项目
npm create vite@latest admin -- --template vue-ts

# 进入项目目录
cd admin

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

```bash [pnpm]
pnpm create vite admin --template vue-ts
cd admin
pnpm install
pnpm dev
```

```bash [yarn]
yarn create vite admin --template vue-ts
cd admin
yarn
yarn dev
```
:::

### 2.2 安装核心依赖

::: code-group
```bash [npm]
npm install naive-ui @vicons/ionicons5 vue-router@4 pinia axios dayjs lodash-es
npm install -D unocss
```

```bash [pnpm]
pnpm add naive-ui @vicons/ionicons5 vue-router@4 pinia axios dayjs lodash-es
pnpm add -D unocss
```

```bash [yarn]
yarn add naive-ui @vicons/ionicons5 vue-router@4 pinia axios dayjs lodash-es
yarn add -D unocss
```
:::

### 2.3 配置 Vite

```typescript{2-3,8-15}
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

**tsconfig.json 别名配置**：
```json{4-6}
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## 三、目录结构

```
admin/
├── public/              # 静态资源
├── src/
│   ├── api/            # API 接口
│   │   ├── index.ts    # Axios 实例
│   │   ├── auth.ts     # 认证相关
│   │   ├── user.ts     # 用户相关
│   │   └── ...
│   ├── assets/         # 资源文件
│   │   ├── styles/     # 全局样式
│   │   └── images/     # 图片
│   ├── components/     # 公共组件
│   │   └── ...
│   ├── composables/    # 组合式函数
│   │   └── ...
│   ├── layouts/        # 布局组件
│   │   ├── BasicLayout.vue
│   │   └── BlankLayout.vue
│   ├── router/         # 路由配置
│   │   └── index.ts
│   ├── stores/         # Pinia 状态
│   │   ├── user.ts
│   │   ├── app.ts
│   │   └── ...
│   ├── types/          # TypeScript 类型
│   │   ├── api.d.ts
│   │   └── ...
│   ├── utils/          # 工具函数
│   │   └── ...
│   ├── views/          # 页面组件
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── ...
│   ├── App.vue         # 根组件
│   └── main.ts         # 入口文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── uno.config.ts
```

---

## 四、Naive UI 配置

### 4.1 全局引入

```typescript{2,5-7,11}
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

// Naive UI
import NaiveUI from 'naive-ui'

const app = createApp(App)

app.use(NaiveUI)
app.mount('#app')
```

### 4.2 按需引入（推荐）

::: details 为什么更推荐按需引入？
全局引入更适合快速起步；按需引入更适合真实项目，可以更明确控制入口文件职责，也方便后续抽离 UI 初始化逻辑。
:::

```typescript{2-9,24-26}
// src/composables/useNaiveUI.ts
import {
  NButton,
  NInput,
  NForm,
  NFormItem,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  // ... 根据需要引入
} from 'naive-ui'

export function setupNaiveUI(app: App) {
  const components = [
    NButton,
    NInput,
    NForm,
    NFormItem,
    NMessageProvider,
    NDialogProvider,
    NNotificationProvider,
  ]

  components.forEach(component => {
    app.component(component.name || component.displayName, component)
  })
}

// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { setupNaiveUI } from './composables/useNaiveUI'

const app = createApp(App)
setupNaiveUI(app)
app.mount('#app')
```

### 4.3 主题配置

```typescript{2,6-13}
// src/composables/useTheme.ts
import { darkTheme } from 'naive-ui'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

export function useTheme() {
  const appStore = useAppStore()

  const theme = computed(() => {
    return appStore.isDark ? darkTheme : null
  })

  const themeOverrides = computed(() => ({
    common: {
      primaryColor: '#2080f0',
      primaryColorHover: '#4098fc',
      primaryColorPressed: '#1060c9',
    }
  }))

  return {
    theme,
    themeOverrides
  }
}

// 在 App.vue 中使用
<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <router-view />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
```

---

## 五、路由配置

### 5.1 创建路由实例

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
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
        meta: { title: '首页', icon: 'dashboard-outline', requiresAuth: true }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', icon: 'people-outline', requiresAuth: true, permission: '/user/list' }
      },
      {
        path: 'articles',
        name: 'Articles',
        component: () => import('@/views/articles/index.vue'),
        meta: { title: '文章管理', icon: 'document-text-outline', requiresAuth: true, permission: '/article/list' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### 5.2 路由守卫

```typescript
// src/router/guard.ts
import router from './index'
import { useUserStore } from '@/stores/user'
import type { Router } from 'vue-router'

// 白名单
const whiteList = ['/login', '/register']

export function setupRouterGuard(router: Router) {
  router.beforeEach((to, from, next) => {
    const userStore = useUserStore()

    // 检查是否需要登录
    if (to.meta.requiresAuth !== false) {
      if (userStore.token) {
        // 已登录，检查权限
        if (to.meta.permission && !userStore.hasPermission(to.meta.permission as string)) {
          next({ name: 'Forbidden' })
          return
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
      // 白名单，直接放行
      if (userStore.token && to.path === '/login') {
        next({ path: '/' })
      } else {
        next()
      }
    }
  })

  router.afterEach((to) => {
    // 设置页面标题
    document.title = `${to.meta.title || ''} - Iwan Station`
  })
}

// src/main.ts
import router from './router'
import { setupRouterGuard } from './router/guard'

const app = createApp(App)
app.use(router)

setupRouterGuard(router)
```

---

## 六、Pinia 状态管理

### 6.1 创建 Store

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'
import { login, getUserInfo } from '@/api/auth'
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
    hasPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission) || state.userInfo?.isAdmin
    }
  },

  actions: {
    async login(form: LoginForm) {
      const { data } = await login(form)
      this.token = data.token
      localStorage.setItem('token', data.token)
    },

    async getUserInfo() {
      const { data } = await getUserInfo()
      this.userInfo = data.user
      this.permissions = data.permissions
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.permissions = []
      localStorage.removeItem('token')
    }
  }
})
```

### 6.2 App Store

```typescript
// src/stores/app.ts
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    isDark: false,
    loading: false
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    toggleTheme() {
      this.isDark = !this.isDark
    },
    setLoading(loading: boolean) {
      this.loading = loading
    }
  }
})
```

---

## 七、UnoCSS 配置

### 7.1 安装配置

```bash
npm install -D unocss
```

```typescript
// uno.config.ts
import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/'
    })
  ],
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'flex-col-center': 'flex flex-col items-center justify-center'
  }
})
```

```typescript
// vite.config.ts
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ]
})
```

```typescript
// src/main.ts
import 'uno.css'
```

---

## 八、TypeScript 类型定义

### 8.1 API 类型

```typescript
// src/types/api.d.ts
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface LoginForm {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  email: string
  avatar: string
  status: number
}

export interface Menu {
  id: number
  parent_id: number
  name: string
  path: string
  component: string
  icon: string
  type: number
  sort: number
  children?: Menu[]
}
```

### 8.2 组件类型

```typescript
// src/types/components.d.ts
export interface TableColumn {
  key: string
  title: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (row: any) => any
}

export interface FormItem {
  field: string
  label: string
  type: 'input' | 'select' | 'date' | 'number'
  required?: boolean
  options?: Array<{ label: string; value: any }>
}
```

---

## 九、环境变量配置

### 9.1 环境文件

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api/v1

# .env.production
VITE_API_BASE_URL=https://api.example.com/api/v1
```

### 9.2 使用环境变量

```typescript
// src/utils/config.ts
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1'
}

export default config

// src/api/index.ts
import config from '@/utils/config'

export const request = axios.create({
  baseURL: config.apiBaseUrl
})
```

---

## 十、项目入口

### 10.1 main.ts

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

// 样式
import 'uno.css'
import '@/assets/styles/main.css'

// 路由
import router from './router'
import { setupRouterGuard } from './router/guard'

// 状态管理
import { createPinia } from 'pinia'

// UI 配置
import { setupNaiveUI } from './composables/useNaiveUI'

const app = createApp(App)

app.use(createPinia())
app.use(router)

setupNaiveUI(app)
setupRouterGuard(router)

app.mount('#app')
```

### 10.2 App.vue

```vue
<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-spin :show="loading" class="global-spin">
            <router-view />
          </n-spin>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const { theme, themeOverrides } = useTheme()
const loading = computed(() => appStore.loading)
</script>

<style>
.global-spin {
  width: 100vw;
  height: 100vh;
}
</style>
```

---

## 十一、练习任务

1. **基础任务**：创建 Vue 3 + TypeScript 项目，配置 Naive UI
2. **进阶任务**：配置路由和状态管理，实现简单的页面切换
3. **高级任务**：配置 UnoCSS，实现暗黑模式切换

---

## 课后阅读

- [Vue 3 官方文档 - 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [Vite 官方文档 - 配置](https://cn.vitejs.dev/config/)
- [Naive UI 官方文档 - 主题](https://www.naiveui.com/zh-CN/os-theme/docs/theme)


