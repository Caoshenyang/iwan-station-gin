import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Iwan Station Gin',
  description: '生产级 Gin 后台管理系统教程，覆盖架构设计、认证授权、业务模块、前端对接与生产部署。',
  base: '/',
  lang: 'zh-CN',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }]
  ],

  themeConfig: {
    logo: '/images/logo.svg',

    nav: [
      { text: '开始这里', link: '/tutorial/', activeMatch: '^/tutorial/$|^/tutorial/(how-to-use|go-for-java-devs)$' },
      { text: '正式主线', link: '/tutorial/curriculum', activeMatch: '^/tutorial/curriculum$|^/tutorial/chapter-' },
      { text: '快速开始', link: '/tutorial/quick-start' },
      { text: '常见问题', link: '/tutorial/faq' },
      { text: '参考手册', link: '/guide/quick-reference', activeMatch: '^/guide/' }
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: '教程入口',
          collapsible: false,
          items: [
            { text: '开始这里', link: '/tutorial/' },
            { text: '如何使用这套教程', link: '/tutorial/how-to-use' },
            { text: '课程大纲', link: '/tutorial/curriculum' },
            { text: '快速开始', link: '/tutorial/quick-start' },
            { text: 'Java 转 Go 导读', link: '/tutorial/go-for-java-devs' },
            { text: '常见问题', link: '/tutorial/faq' }
          ]
        },
        {
          text: '第一阶段：环境与架构准备',
          collapsible: true,
          items: [
            {
              text: '第一章：环境准备与项目初始化',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-1/' },
                { text: '环境搭建', link: '/tutorial/chapter-1/environment-setup' },
                { text: '项目初始化', link: '/tutorial/chapter-1/project-init' },
                { text: '第一次跑通项目', link: '/tutorial/chapter-1/first-run' }
              ]
            },
            {
              text: '第二章：项目蓝图与分层架构',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-2/' },
                { text: '架构概览', link: '/tutorial/chapter-2/architecture-overview' },
                { text: '目录结构', link: '/tutorial/chapter-2/directory-structure' },
                { text: '分层架构设计', link: '/tutorial/chapter-2/layered-design' },
                { text: '依赖注入（Wire）', link: '/tutorial/chapter-2/dependency-injection' }
              ]
            },
            {
              text: '第三章：配置、日志、数据库与缓存',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-3/' },
                { text: '配置管理', link: '/tutorial/chapter-3/configuration' },
                { text: '日志系统', link: '/tutorial/chapter-3/logging-system' },
                { text: '数据库连接', link: '/tutorial/chapter-3/database-connection' },
                { text: 'Redis 集成', link: '/tutorial/chapter-3/redis-integration' }
              ]
            },
            {
              text: '第四章：通用 Web 基础设施',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-4/' },
                { text: '应用启动与路由组织', link: '/tutorial/chapter-4/app-bootstrap-and-routing' },
                { text: '请求绑定与参数校验', link: '/tutorial/chapter-4/request-binding-and-validation' },
                { text: '统一响应与错误处理', link: '/tutorial/chapter-4/unified-response-and-errors' },
                { text: '中间件链路设计', link: '/tutorial/chapter-4/middleware-pipeline' }
              ]
            }
          ]
        },
        {
          text: '第二阶段：认证、授权与业务主线',
          collapsible: true,
          items: [
            {
              text: '第五章：用户体系与 JWT 认证',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-5/' },
                { text: '用户模型设计', link: '/tutorial/chapter-5/user-model' },
                { text: '密码安全与存储', link: '/tutorial/chapter-5/password-security' },
                { text: 'JWT 实现', link: '/tutorial/chapter-5/jwt-implementation' },
                { text: '认证 API 实现', link: '/tutorial/chapter-5/auth-api' },
                { text: '认证中间件', link: '/tutorial/chapter-5/auth-middleware' }
              ]
            },
            {
              text: '第六章：RBAC 权限与菜单模型',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-6/' },
                { text: 'RBAC 设计', link: '/tutorial/chapter-6/rbac-design' },
                { text: 'Casbin 集成', link: '/tutorial/chapter-6/casbin-integration' },
                { text: '权限模型设计', link: '/tutorial/chapter-6/permission-model' },
                { text: '菜单模型设计', link: '/tutorial/chapter-6/menu-model' },
                { text: '权限中间件', link: '/tutorial/chapter-6/permission-middleware' }
              ]
            },
            {
              text: '第七章：内容管理模块',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-7/' },
                { text: '分类管理', link: '/tutorial/chapter-7/category-module' },
                { text: '标签管理', link: '/tutorial/chapter-7/tag-module' },
                { text: '文章管理', link: '/tutorial/chapter-7/article-module' },
                { text: '查询、筛选与分页', link: '/tutorial/chapter-7/content-query-and-pagination' }
              ]
            },
            {
              text: '第八章：文件上传与对象存储',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-8/' },
                { text: '上传能力设计', link: '/tutorial/chapter-8/file-upload-design' },
                { text: 'MinIO 集成', link: '/tutorial/chapter-8/minio-integration' },
                { text: '上传 API 实现', link: '/tutorial/chapter-8/upload-api' },
                { text: '文件安全与访问控制', link: '/tutorial/chapter-8/file-security' }
              ]
            }
          ]
        },
        {
          text: '第三阶段：运行期能力与后台交付',
          collapsible: true,
          items: [
            {
              text: '第九章：统计接口与缓存优化',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-9/' },
                { text: '统计 API', link: '/tutorial/chapter-9/statistics-api' },
                { text: '后台首页数据建模', link: '/tutorial/chapter-9/dashboard-data' },
                { text: '缓存策略设计', link: '/tutorial/chapter-9/cache-strategy' },
                { text: '缓存失效与一致性', link: '/tutorial/chapter-9/cache-invalidation' }
              ]
            },
            {
              text: '第十章：系统配置、审计日志与监控',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-10/' },
                { text: '动态配置管理', link: '/tutorial/chapter-10/dynamic-config' },
                { text: '操作日志记录', link: '/tutorial/chapter-10/operation-logs' },
                { text: '系统监控', link: '/tutorial/chapter-10/system-monitor' },
                { text: '可观测性基础', link: '/tutorial/chapter-10/observability-basics' }
              ]
            },
            {
              text: '第十一章：Vue 3 管理后台',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-11/' },
                { text: 'Vue 3 项目初始化', link: '/tutorial/chapter-11/vue3-project-init' },
                { text: 'API 请求封装', link: '/tutorial/chapter-11/api-request' },
                { text: '登录与认证态', link: '/tutorial/chapter-11/login-auth' },
                { text: '布局与菜单', link: '/tutorial/chapter-11/layout-menu' },
                { text: '后台首页与基础页面', link: '/tutorial/chapter-11/dashboard-pages' }
              ]
            }
          ]
        },
        {
          text: '第四阶段：质量保障与生产交付',
          collapsible: true,
          items: [
            {
              text: '第十二章：测试、安全与发布前检查',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-12/' },
                { text: '测试策略', link: '/tutorial/chapter-12/testing-strategy' },
                { text: '接口测试', link: '/tutorial/chapter-12/api-testing' },
                { text: 'Web 安全加固', link: '/tutorial/chapter-12/web-security' },
                { text: '发布前检查清单', link: '/tutorial/chapter-12/release-checklist' }
              ]
            },
            {
              text: '第十三章：Docker、Nginx、CI/CD 与生产交付',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-13/' },
                { text: 'Docker 部署', link: '/tutorial/chapter-13/docker-deployment' },
                { text: 'Nginx 配置', link: '/tutorial/chapter-13/nginx-config' },
                { text: 'CI/CD 流水线', link: '/tutorial/chapter-13/cicd-pipeline' },
                { text: '线上排障', link: '/tutorial/chapter-13/troubleshooting' },
                { text: '项目总结', link: '/tutorial/chapter-13/project-summary' }
              ]
            }
          ]
        }
      ],
      '/guide/': [
        {
          text: '快速参考',
          collapsible: false,
          items: [
            { text: '快速参考', link: '/guide/quick-reference' },
            { text: '教程验证清单', link: '/guide/tutorial-validation-checklist' },
            { text: '文档编写规范', link: '/guide/documentation-writing-standard' },
            { text: 'Markdown 扩展示例', link: '/guide/markdown-enhancements' }
          ]
        },
        {
          text: '框架指南',
          collapsible: true,
          items: [
            { text: 'Gin 框架', link: '/guide/framework/gin-guide' },
            { text: 'GORM 指南', link: '/guide/framework/gorm-guide' },
            { text: 'Zap 日志', link: '/guide/framework/zap-guide' }
          ]
        },
        {
          text: '认证授权',
          collapsible: true,
          items: [
            { text: 'JWT 指南', link: '/guide/auth/jwt-guide' },
            { text: 'RBAC 指南', link: '/guide/auth/rbac-guide' }
          ]
        },
        {
          text: '业务模块',
          collapsible: true,
          items: [
            { text: '用户管理 API', link: '/guide/modules/user-management' },
            { text: '内容管理 API', link: '/guide/modules/content-management' },
            { text: '统计 API', link: '/guide/modules/statistics' }
          ]
        },
        {
          text: '前端开发',
          collapsible: true,
          items: [
            { text: 'Vue 3 最佳实践', link: '/guide/frontend/vue3-best-practices' },
            { text: 'API 集成', link: '/guide/frontend/api-integration' },
            { text: '组件开发', link: '/guide/frontend/component-guide' }
          ]
        },
        {
          text: '部署运维',
          collapsible: true,
          items: [
            { text: 'Docker 参考', link: '/guide/deployment/docker-reference' },
            { text: '故障排查', link: '/guide/deployment/troubleshooting' }
          ]
        }
      ]
    },

    footer: {
      message: '基于 MIT 许可发布',
      copyright: '2026 Iwan Station'
    },

    search: {
      provider: 'local'
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    }
  },

  // #region markdown-config
  markdown: {
    lineNumbers: true,
    math: true,
    toc: {
      level: [2, 3]
    },
    image: {
      lazyLoading: true
    },
    container: {
      tipLabel: '提示',
      warningLabel: '注意',
      dangerLabel: '警告',
      infoLabel: '说明',
      detailsLabel: '展开详情'
    },
    languages: [
      'go',
      'yaml',
      'bash',
      'sh',
      'javascript',
      'typescript',
      'vue',
      'java',
      'sql',
      'mermaid'
    ]
  },
  // #endregion markdown-config

  vite: {
    server: {
      port: 15174,
      host: true
    },
    build: {
      chunkSizeWarningLimit: 1200
    }
  },

  ignoreDeadLinks: true
})
