---
title: "组件开发指南"
description: "Iwan Station Gin 文档：组件开发指南。"
---

# 组件开发指南

## 组件结构

```
src/components/
├── UserCard/
│   ├── index.vue        # 组件入口
│   ├── types.ts         # 类型定义
│   └── useUserCard.ts   # 逻辑复用
```

## 组件模板

```vue
<!-- UserCard/index.vue -->
<script setup lang="ts">
import type { UserCardProps } from './types'

const props = withDefaults(defineProps<UserCardProps>(), {
  showAvatar: true,
  showEmail: true
})

const emit = defineEmits<{
  click: [user: User]
  delete: [id: number]
}>()

function handleClick() {
  emit('click', props.user)
}
</script>

<template>
  <div class="user-card" @click="handleClick">
    <img v-if="showAvatar" :src="user.avatar" />
    <h3>{{ user.name }}</h3>
    <p v-if="showEmail">{{ user.email }}</p>
  </div>
</template>

<style scoped>
.user-card {
  /* 样式 */
}
</style>
```

## 状态管理

```ts
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const current = ref<User | null>(null)

  async function fetchUsers() {
    const res = await userApi.list()
    users.value = res.data
  }

  function setCurrent(user: User) {
    current.value = user
  }

  return {
    users,
    current,
    fetchUsers,
    setCurrent
  }
})
```

## 指令封装

```ts
// directives/permission.ts
export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const permissions = useAuthStore().permissions

    if (value && !permissions.includes(value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

// main.ts
app.directive('permission', permissionDirective)
```


