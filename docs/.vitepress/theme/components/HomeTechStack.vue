<script setup lang="ts">
type StackItem = {
  label: string
  icon: string
}

type StackGroup = {
  title: string
  items: StackItem[]
}

const groups: StackGroup[] = [
  {
    title: '后端',
    items: [
      { label: 'Go', icon: '/images/tech/go.svg' },
      { label: 'Gin', icon: '/images/tech/gin.svg' },
      { label: 'GORM', icon: '/images/tech/gorm.svg' },
      { label: 'PostgreSQL', icon: '/images/tech/postgresql.svg' },
      { label: 'Redis', icon: '/images/tech/redis.svg' },
      { label: 'MinIO', icon: '/images/tech/minio.svg' },
      { label: 'Docker', icon: '/images/tech/docker.svg' },
      { label: 'Nginx', icon: '/images/tech/nginx.svg' },
    ],
  },
  {
    title: '前端',
    items: [
      { label: 'Vue 3', icon: '/images/tech/vue.svg' },
      { label: 'TypeScript', icon: '/images/tech/typescript.svg' },
      { label: 'Naive UI', icon: '/images/tech/naiveui.svg' },
      { label: 'Vite', icon: '/images/tech/vite.svg' },
      { label: 'Axios', icon: '/images/tech/axios.svg' },
      { label: 'pnpm', icon: '/images/tech/pnpm.svg' },
    ],
  },
]
</script>

<template>
  <section class="home-tech-strip">
    <div
      v-for="group in groups"
      :key="group.title"
      class="home-tech-group"
    >
      <div class="home-tech-chip-list">
        <div
          v-for="item in group.items"
          :key="`${group.title}-${item.label}`"
          class="home-tech-chip"
        >
          <span class="home-tech-chip-icon">
            <img
              :src="item.icon"
              :alt="item.label"
              loading="lazy"
            />
          </span>
          <span class="home-tech-chip-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
