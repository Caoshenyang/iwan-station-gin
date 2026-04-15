# Vue 3 最佳实践

## Composition API

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const count = ref(0)
const doubled = computed(() => count.value * 2)

// 生命周期
onMounted(() => {
  console.log('mounted')
})

// 方法
function increment() {
  count.value++
}
</script>
```

## 组件设计

### Props 定义

```ts
interface Props {
  title: string
  count?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  disabled: false
})
```

### Emits 定义

```ts
interface Emits {
  (e: 'update', value: number): void
  (e: 'delete', id: number): void
}

const emit = defineEmits<Emits>()
```

## 响应式最佳实践

```ts
// ✅ 使用 ref 存储基本类型
const count = ref(0)
const message = ref('')

// ✅ 使用 reactive 存储对象
const user = reactive({
  name: 'John',
  age: 30
})

// ❌ 避免 reactive 再解构
const { name } = user  // 失去响应性

// ✅ 使用 toRefs
const { name, age } = toRefs(user)
```

## Composables

```ts
// composables/useCounter.ts
export function useCounter(initial = 0) {
  const count = ref(initial)

  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial

  return {
    count: readonly(count),
    increment,
    decrement,
    reset
  }
}

// 使用
const { count, increment } = useCounter(10)
```

## 依赖注入

```ts
// 父组件提供
provide('theme', 'dark')

// 子组件注入
const theme = inject('theme', 'light')
```
