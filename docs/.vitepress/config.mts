import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Iwan Station Gin',
  description: '生产级 Gin 后台管理系统教程，覆盖架构设计、认证授权、业务模块、前端对接与生产部署。',
  base: '/',
  lang: 'zh-CN',
  head: [
    ['link', { rel: 'icon', href: '/images/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }]
  ],

  themeConfig: {
    logo: '/images/logo.svg',

    nav: [
      { text: '教程总览', link: '/tutorial/curriculum', activeMatch: '^/tutorial/' },
      { text: '快速开始', link: '/tutorial/quick-start' },
      { text: '常见问题', link: '/tutorial/faq' },
      {
        text: '章节导航',
        items: [
          { text: '第一章：课程介绍与准备', link: '/tutorial/chapter-1/' },
          { text: '第二章：项目架构设计', link: '/tutorial/chapter-2/' },
          { text: '第三章：基础框架搭建', link: '/tutorial/chapter-3/' },
          { text: '第四章：用户认证系统', link: '/tutorial/chapter-4/' },
          { text: '第五章：权限管理系统', link: '/tutorial/chapter-5/' },
          { text: '第六章：业务功能模块', link: '/tutorial/chapter-6/' },
          { text: '第七章：统计接口与缓存优化', link: '/tutorial/chapter-7/' },
          { text: '第八章：系统管理与监控', link: '/tutorial/chapter-8/' },
          { text: '第九章：管理后台前端', link: '/tutorial/chapter-9/' },
          { text: '第十章：生产部署与交付', link: '/tutorial/chapter-10/' }
        ]
      },
      { text: '参考手册', link: '/guide/quick-reference', activeMatch: '^/guide/' }
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: '教程总览',
          collapsible: false,
          items: [
            { text: '课程大纲', link: '/tutorial/curriculum' },
            { text: '快速开始', link: '/tutorial/quick-start' },
            { text: '常见问题', link: '/tutorial/faq' }
          ]
        },
        {
          text: '第一阶段：启动与建模',
          collapsible: true,
          items: [
            {
              text: '第一章：课程介绍与准备',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-1/' },
                { text: '课程概述', link: '/tutorial/chapter-1/course-intro' },
                { text: '环境搭建', link: '/tutorial/chapter-1/environment-setup' },
                { text: '项目初始化', link: '/tutorial/chapter-1/project-init' },
                { text: 'Go vs Java', link: '/tutorial/chapter-1/go-for-java-devs' }
              ]
            },
            {
              text: '第二章：项目架构设计',
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
              text: '第三章：基础框架搭建',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-3/' },
                { text: '配置管理', link: '/tutorial/chapter-3/configuration' },
                { text: 'Gin 框架', link: '/tutorial/chapter-3/gin-framework' },
                { text: '数据库连接', link: '/tutorial/chapter-3/database-connection' },
                { text: '日志系统', link: '/tutorial/chapter-3/logging-system' },
                { text: 'Redis 集成', link: '/tutorial/chapter-3/redis-integration' }
              ]
            }
          ]
        },
        {
          text: '第二阶段：安全主线',
          collapsible: true,
          items: [
            {
              text: '第四章：用户认证系统',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-4/' },
                { text: '用户模型设计', link: '/tutorial/chapter-4/user-model' },
                { text: 'JWT 实现', link: '/tutorial/chapter-4/jwt-implementation' },
                { text: '认证 API 实现', link: '/tutorial/chapter-4/auth-api' },
                { text: '认证中间件', link: '/tutorial/chapter-4/auth-middleware' }
              ]
            },
            {
              text: '第五章：权限管理系统',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-5/' },
                { text: 'RBAC 设计', link: '/tutorial/chapter-5/rbac-design' },
                { text: 'Casbin 集成', link: '/tutorial/chapter-5/casbin-integration' },
                { text: '权限模型设计', link: '/tutorial/chapter-5/permission-model' },
                { text: '权限中间件', link: '/tutorial/chapter-5/permission-middleware' }
              ]
            }
          ]
        },
        {
          text: '第三阶段：业务与性能',
          collapsible: true,
          items: [
            {
              text: '第六章：业务功能模块',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-6/' },
                { text: '分类管理', link: '/tutorial/chapter-6/category-module' },
                { text: '标签管理', link: '/tutorial/chapter-6/tag-module' },
                { text: '文章管理', link: '/tutorial/chapter-6/article-module' },
                { text: '文件上传功能', link: '/tutorial/chapter-6/file-upload' }
              ]
            },
            {
              text: '第七章：统计接口与缓存优化',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-7/' },
                { text: '统计 API', link: '/tutorial/chapter-7/statistics-api' },
                { text: '缓存优化策略', link: '/tutorial/chapter-7/cache-optimization' }
              ]
            },
            {
              text: '第八章：系统管理与监控',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-8/' },
                { text: '动态配置管理', link: '/tutorial/chapter-8/dynamic-config' },
                { text: '操作日志记录', link: '/tutorial/chapter-8/operation-logs' },
                { text: '系统监控', link: '/tutorial/chapter-8/system-monitor' }
              ]
            }
          ]
        },
        {
          text: '第四阶段：前端与交付',
          collapsible: true,
          items: [
            {
              text: '第九章：管理后台前端',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-9/' },
                { text: 'Vue 3 项目初始化', link: '/tutorial/chapter-9/vue3-project-init' },
                { text: 'API 请求封装', link: '/tutorial/chapter-9/api-request' },
                { text: '登录与路由', link: '/tutorial/chapter-9/login-auth' },
                { text: '布局与菜单', link: '/tutorial/chapter-9/layout-menu' }
              ]
            },
            {
              text: '第十章：生产部署与交付',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-10/' },
                { text: 'Docker 部署', link: '/tutorial/chapter-10/docker-deployment' },
                { text: 'Nginx 配置', link: '/tutorial/chapter-10/nginx-config' },
                { text: '性能优化', link: '/tutorial/chapter-10/performance-tuning' },
                { text: '故障排查', link: '/tutorial/chapter-10/troubleshooting' },
                { text: '项目总结', link: '/tutorial/chapter-10/project-summary' }
              ]
            }
          ]
        },
        {
          text: '第五阶段：进阶扩展',
          collapsible: true,
          items: [
            {
              text: '第十一章：测试与质量保证',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-11/' }
              ]
            },
            {
              text: '第十二章：安全加固',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-12/' }
              ]
            },
            {
              text: '第十三章：CI/CD 自动化',
              collapsible: true,
              items: [
                { text: '章节导读', link: '/tutorial/chapter-13/' }
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
