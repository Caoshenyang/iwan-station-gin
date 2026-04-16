import type { RouteRecordRaw } from 'vue-router'

// #region auth-routes
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { requiresAuth: true, title: '个人资料' }
  }
]
// #endregion auth-routes
