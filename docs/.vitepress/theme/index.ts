import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import HomeTechStack from './components/HomeTechStack.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeTechStack', HomeTechStack)
  },
} satisfies Theme
