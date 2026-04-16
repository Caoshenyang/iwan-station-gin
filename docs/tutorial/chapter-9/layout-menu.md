---
title: "后台布局与菜单"
description: "后台管理系统通常采用经典的 三栏布局："
---

# 后台布局与菜单

## 📚 相关文档

- [Naive UI 官方文档 - Layout](https://www.naiveui.com/zh-CN/os-theme/components/layout)
- [Naive UI 官方文档 - Menu](https://www.naiveui.com/zh-CN/os-theme/components/menu)
- [Vue Router 官方文档 - 动态路由](https://router.vuejs.org/zh/guide/advanced/dynamic-routing.html)

---

## 一、布局组件结构

### 1.1 布局设计

后台管理系统通常采用经典的 **三栏布局**：

```
┌─────────────────────────────────────────────────┐
│ Header (顶部栏)                                  │
├─────────┬───────────────────────────────────────┤
│         │                                       │
│  Menu   │          Main Content                 │
│  (菜单) │          (主内容区)                    │
│         │                                       │
│         │                                       │
└─────────┴───────────────────────────────────────┘
```

### 1.2 布局组件

```vue
<!-- src/layouts/BasicLayout.vue -->
<template>
  <n-layout has-sider position="absolute">
    <!-- 侧边菜单 -->
    <n-layout-sider
      bordered
      show-trigger
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo">
        <h2 v-if="!collapsed">Iwan Station</h2>
        <h2 v-else>IS</h2>
      </div>

      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <!-- 顶部栏 -->
      <n-layout-header bordered class="header">
        <div class="header-left">
          <n-button
            quaternary
            circle
            @click="collapsed = !collapsed"
          >
            <template #icon>
              <n-icon>
                <MenuOutline />
              </n-icon>
            </template>
          </n-button>

          <n-breadcrumb class="breadcrumb">
            <n-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.name"
            >
              {{ item.meta?.title }}
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 全屏 -->
          <n-button quaternary circle @click="toggleFullscreen">
            <template #icon>
              <n-icon>
                <ExpandOutline />
              </n-icon>
            </template>
          </n-button>

          <!-- 主题切换 -->
          <n-button quaternary circle @click="toggleTheme">
            <template #icon>
              <n-icon>
                <MoonOutline v-if="!isDark" />
                <SunnyOutline v-else />
              </n-icon>
            </template>
          </n-button>

          <!-- 用户信息 -->
          <n-dropdown :options="userOptions" @select="handleUserAction">
            <n-space align="center" :size="8" class="user-info">
              <n-avatar round :src="userStore.avatar" />
              <span class="username">{{ userStore.username }}</span>
            </n-space>
          </n-dropdown>
        </div>
      </n-layout-header>

      <!-- 内容区 -->
      <n-layout-content content-style="padding: 24px;">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  MenuOutline,
  ExpandOutline,
  MoonOutline,
  SunnyOutline,
  LogOutOutline,
  PersonOutline,
  SettingsOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

const collapsed = computed({
  get: () => appStore.sidebarCollapsed,
  set: (val) => appStore.toggleSidebar()
})

const isDark = computed(() => appStore.isDark)

// 面包屑
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched
})

// 当前激活的菜单
const activeKey = computed(() => {
  return route.name as string
})

// 菜单选项
const menuOptions = computed<MenuOption[]>(() => {
  return generateMenuOptions(router.getRoutes())
})

// 生成菜单选项
function generateMenuOptions(routes: any[]): MenuOption[] {
  const options: MenuOption[] = []

  routes.forEach(route => {
    // 跳过隐藏的菜单
    if (route.meta?.hideInMenu) return

    // 检查权限
    if (route.meta?.permission && !userStore.hasPermission(route.meta.permission)) {
      return
    }

    const option: MenuOption = {
      label: route.meta?.title as string,
      key: route.name as string,
      icon: renderIcon(route.meta?.icon)
    }

    // 处理子路由
    if (route.children && route.children.length > 0) {
      option.children = generateMenuOptions(route.children)
    }

    options.push(option)
  })

  return options
}

// 渲染图标
function renderIcon(iconName?: string) {
  if (!iconName) return undefined

  return () => h(NIcon, null, { default: () => h(iconName) })
}

// 菜单选择
function handleMenuSelect(key: string) {
  router.push({ name: key })
}

// 用户操作
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

function handleUserAction(key: string) {
  switch (key) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      break
  }
}

// 全屏切换
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// 主题切换
function toggleTheme() {
  appStore.toggleTheme()
}
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #2080f0;
  border-bottom: 1px solid var(--n-border-color);
}

.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  margin-left: 16px;
}

.user-info {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: var(--n-color);
}

/* 页面切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
```

---

## 二、动态菜单

### 2.1 从后端获取菜单

```typescript
// src/api/menu.ts
import request from './index'
import type { ApiResponse, Menu } from '@/types/api'

/**
 * 获取用户菜单
 */
export function getUserMenus(): Promise<ApiResponse<Menu[]>> {
  return request({
    url: '/menu/user',
    method: 'get'
  })
}

/**
 * 获取所有菜单
 */
export function getAllMenus(): Promise<ApiResponse<Menu[]>> {
  return request({
    url: '/menu/all',
    method: 'get'
  })
}
```

### 2.2 菜单 Store

```typescript
// src/stores/menu.ts
import { defineStore } from 'pinia'
import { getUserMenus } from '@/api/menu'
import type { Menu } from '@/types/api'
import { generateRoutes } from '@/utils/route'

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menus: [] as Menu[],
    isMenuLoaded: false
  }),

  actions: {
    async fetchMenus() {
      if (this.isMenuLoaded) return

      try {
        const data = await getUserMenus()
        this.menus = buildMenuTree(data)
        this.isMenuLoaded = true
      } catch (error) {
        throw error
      }
    }
  }
})

// 构建菜单树
function buildMenuTree(menus: Menu[], parentId = 0): Menu[] {
  const tree: Menu[] = []

  menus
    .filter(menu => menu.parent_id === parentId)
    .forEach(menu => {
      const children = buildMenuTree(menus, menu.id)
      if (children.length > 0) {
        menu.children = children
      }
      tree.push(menu)
    })

  return tree
}
```

### 2.3 动态路由生成

```typescript
// src/utils/route.ts
import type { RouteRecordRaw } from 'vue-router'
import type { Menu } from '@/types/api'

/**
 * 根据菜单生成路由
 */
export function generateRoutes(menus: Menu[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = []

  menus.forEach(menu => {
    const route: RouteRecordRaw = {
      path: menu.path,
      name: menu.name,
      component: loadComponent(menu.component),
      meta: {
        title: menu.name,
        icon: menu.icon,
        hidden: !menu.visible,
        permission: menu.permission
      }
    }

    // 处理子路由
    if (menu.children && menu.children.length > 0) {
      route.children = generateRoutes(menu.children)
    }

    routes.push(route)
  })

  return routes
}

/**
 * 动态加载组件
 */
function loadComponent(component: string) {
  if (!component) return undefined

  // 假设组件路径为 views/xxx/index.vue
  return () => import(`@/views/${component}/index.vue`)
}
```

---

## 三、标签页

### 3.1 标签页 Store

```typescript
// src/stores/tags.ts
import { defineStore } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'

export interface Tag {
  name: string
  title: string
  path: string
  closable: boolean
}

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [] as Tag[],
    activeTag: '' as string
  }),

  actions: {
    addTag(route: RouteLocationNormalized) {
      const tag: Tag = {
        name: route.name as string,
        title: route.meta?.title as string,
        path: route.fullPath,
        closable: route.name !== 'Dashboard'
      }

      // 检查是否已存在
      const index = this.tags.findIndex(t => t.name === tag.name)
      if (index === -1) {
        this.tags.push(tag)
      }

      this.activeTag = tag.name
    },

    removeTag(name: string) {
      const index = this.tags.findIndex(t => t.name === name)
      if (index !== -1) {
        this.tags.splice(index, 1)
      }
    },

    closeOtherTags() {
      this.tags = this.tags.filter(t => t.name === 'Dashboard' || t.name === this.activeTag)
    },

    closeAllTags() {
      this.tags = this.tags.filter(t => t.name === 'Dashboard')
      if (this.activeTag !== 'Dashboard') {
        this.activeTag = 'Dashboard'
      }
    }
  }
})
```

### 3.2 标签页组件

```vue
<!-- src/components/TagsView.vue -->
<template>
  <div class="tags-view">
    <n-scrollbar x-scrollable>
      <div class="tags-list">
        <n-tag
          v-for="tag in tags"
          :key="tag.name"
          :type="tag.name === activeTag ? 'primary' : 'default'"
          :closable="tag.closable"
          size="small"
          @close="handleClose(tag)"
          @click="handleClick(tag)"
        >
          {{ tag.title }}
        </n-tag>
      </div>
    </n-scrollbar>

    <n-dropdown :options="options" @select="handleSelect">
      <n-button size="small" quaternary>
        <template #icon>
          <n-icon><ChevronDownOutline /></n-icon>
        </template>
      </n-button>
    </n-dropdown>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useRouter } from 'vue-router'
import { useTagsStore } from '@/stores/tags'
import { NIcon } from 'naive-ui'
import { ChevronDownOutline, CloseOutline } from '@vicons/ionicons5'

const router = useRouter()
const tagsStore = useTagsStore()

const tags = computed(() => tagsStore.tags)
const activeTag = computed(() => tagsStore.activeTag)

const options = [
  {
    label: '关闭其他',
    key: 'closeOther',
    icon: () => h(NIcon, null, { default: () => h(CloseOutline) })
  },
  {
    label: '关闭所有',
    key: 'closeAll',
    icon: () => h(NIcon, null, { default: () => h(CloseOutline) })
  }
]

function handleClick(tag: Tag) {
  tagsStore.activeTag = tag.name
  router.push(tag.path)
}

function handleClose(tag: Tag) {
  tagsStore.removeTag(tag.name)

  // 如果关闭的是当前激活的标签，跳转到前一个标签
  if (tag.name === activeTag.value && tags.value.length > 0) {
    const lastTag = tags.value[tags.value.length - 1]
    router.push(lastTag.path)
  }
}

function handleSelect(key: string) {
  switch (key) {
    case 'closeOther':
      tagsStore.closeOtherTags()
      break
    case 'closeAll':
      tagsStore.closeAllTags()
      break
  }
}
</script>

<style scoped>
.tags-view {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--n-color);
  border-bottom: 1px solid var(--n-border-color);
}

.tags-list {
  display: flex;
  gap: 8px;
  flex: 1;
}

.tags-list :deep(.n-tag) {
  cursor: pointer;
}
</style>
```

---

## 四、面包屑导航

### 4.1 自动生成面包屑

```typescript
// src/composables/useBreadcrumb.ts
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useBreadcrumb() {
  const route = useRoute()
  const router = useRouter()

  const breadcrumbs = computed(() => {
    const matched = route.matched.filter(item => item.meta?.title)
    return matched.map(item => ({
      name: item.name as string,
      title: item.meta?.title as string,
      path: item.path,
      onClick: () => {
        if (item.name !== route.name) {
          router.push(item.path)
        }
      }
    }))
  })

  return { breadcrumbs }
}
```

### 4.2 面包屑组件

```vue
<!-- src/components/Breadcrumb.vue -->
<template>
  <n-breadcrumb>
    <n-breadcrumb-item
      v-for="(item, index) in breadcrumbs"
      :key="item.name"
      :clickable="index !== breadcrumbs.length - 1"
      @click="item.onClick"
    >
      {{ item.title }}
    </n-breadcrumb-item>
  </n-breadcrumb>
</template>

<script setup lang="ts">
import { useBreadcrumb } from '@/composables/useBreadcrumb'

const { breadcrumbs } = useBreadcrumb()
</script>
```

---

## 五、主题切换

### 5.1 主题 Store

```typescript
// src/stores/theme.ts
import { defineStore } from 'pinia'
import { darkTheme } from 'naive-ui'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: localStorage.getItem('theme') === 'dark'
  }),

  actions: {
    toggleTheme() {
      this.isDark = !this.isDark
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
    }
  }
})
```

### 5.2 主题配置

```vue
<!-- src/composables/useThemeConfig.ts -->
import { computed } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'
import { useThemeStore } from '@/stores/theme'

export function useThemeConfig() {
  const themeStore = useThemeStore()

  const theme = computed<GlobalTheme | null>(() => {
    return themeStore.isDark ? darkTheme : null
  })

  const themeOverrides = computed(() => ({
    common: {
      primaryColor: '#2080f0',
      primaryColorHover: '#4098fc',
      primaryColorPressed: '#1060c9',
      primaryColorSuppl: '#2080f0'
    }
  }))

  return { theme, themeOverrides }
}
```

---

## 六、响应式布局

### 6.1 移动端适配

```vue
<template>
  <n-layout has-sider>
    <n-layout-sider
      :collapsed="isMobile || collapsed"
      :collapsed-width="0"
      :width="240"
      collapse-mode="width"
      :native-scrollbar="false"
      bordered
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <!-- 侧边栏内容 -->
    </n-layout-sider>

    <n-layout>
      <!-- 移动端遮罩 -->
      <div
        v-if="isMobile && !collapsed"
        class="overlay"
        @click="collapsed = true"
      />
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)
const collapsed = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    collapsed.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
</style>
```

---

## 七、最佳实践

### 7.1 布局建议

| 设备 | 侧边栏宽度 | 折叠宽度 |
|------|-----------|----------|
| 桌面 | 240px | 64px |
| 平板 | 200px | 64px |
| 手机 | 100% | 0 (隐藏) |

### 7.2 性能优化

```typescript
// 菜单图标懒加载
const icons = {
  Dashboard: () => import('@vicons/ionicons5/DashboardOutline'),
  Users: () => import('@vicons/ionicons5/PeopleOutline'),
  Articles: () => import('@vicons/ionicons5/DocumentTextOutline')
}

async function getIcon(name: string) {
  const iconLoader = icons[name]
  return iconLoader ? (await iconLoader()).default : undefined
}
```

---

## 八、练习任务

1. **基础任务**：实现基础布局和菜单导航
2. **进阶任务**：实现标签页和面包屑导航
3. **高级任务**：实现响应式布局和主题切换

---

## 课后阅读

- [Naive UI 官方文档 - Layout](https://www.naiveui.com/zh-CN/os-theme/components/layout)
- [Naive UI 官方文档 - Menu](https://www.naiveui.com/zh-CN/os-theme/components/menu)
- [Vue Router 官方文档 - 动态路由](https://router.vuejs.org/zh/guide/advanced/dynamic-routing.html)

