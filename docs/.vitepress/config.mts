import {defineConfig} from 'vitepress'

export default defineConfig({
    title: 'Iwan Station Gin',
    description: '生产级 Gin 后台管理系统教程',
    base: '/',
    lang: 'zh-CN',
    head: [
        ['link', {rel: 'icon', href: '/favicon.ico'}]
    ],

    themeConfig: {
        // 顶部导航
        nav: [
            {text: '课程大纲', link: '/tutorial/curriculum'},
            {text: '快速开始', link: '/tutorial/quick-start'},
            {text: '常见问题', link: '/tutorial/faq'},
            {
                text: '快速导航',
                items: [
                    {text: '第一章：环境准备', link: '/tutorial/chapter-1/'},
                    {text: '第二章：架构设计', link: '/tutorial/chapter-2/layered-design'},
                    {text: '第四章：认证系统', link: '/tutorial/chapter-4/auth-api'},
                    {text: '第五章：Casbin权限', link: '/tutorial/chapter-5/casbin-integration'},
                    {text: '第十章：生产部署', link: '/tutorial/chapter-10/nginx-config'},
                ]
            },
            {text: '参考手册', link: '/guide/quick-reference'}
        ],

        // 侧边栏
        sidebar: {
            // 教程侧边栏 - 按章节组织
            '/tutorial/': [
                {
                    text: '📘 教程总览',
                    collapsible: false,
                    items: [
                        {text: '课程大纲', link: '/tutorial/curriculum'},
                        {text: '快速开始', link: '/tutorial/quick-start'},
                        {text: '常见问题', link: '/tutorial/faq'},
                    ]
                },
                {
                    text: '第一阶段：基础准备',
                    collapsible: true,
                    items: [
                        {
                            text: '第一章：课程介绍与准备',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-1/'},
                                {text: '课程概述', link: '/tutorial/chapter-1/course-intro'},
                                {text: '环境搭建', link: '/tutorial/chapter-1/environment-setup'},
                                {text: '项目初始化 ✨', link: '/tutorial/chapter-1/project-init'},
                                {text: 'Go vs Java', link: '/tutorial/chapter-1/go-for-java-devs'},
                            ]
                        },
                    ]
                },
                {
                    text: '第二阶段：架构设计',
                    collapsible: true,
                    items: [
                        {
                            text: '第二章：项目架构设计',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-2/'},
                                {text: '架构概览', link: '/tutorial/chapter-2/architecture-overview'},
                                {text: '目录结构', link: '/tutorial/chapter-2/directory-structure'},
                                {text: '分层架构设计 ✨', link: '/tutorial/chapter-2/layered-design'},
                                {text: '依赖注入（Wire）✨', link: '/tutorial/chapter-2/dependency-injection'},
                            ]
                        },
                    ]
                },
                {
                    text: '第三阶段：基础设施',
                    collapsible: true,
                    items: [
                        {
                            text: '第三章：基础框架搭建',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-3/'},
                                {text: '配置管理', link: '/tutorial/chapter-3/configuration'},
                                {text: 'Gin 框架', link: '/tutorial/chapter-3/gin-framework'},
                                {text: '数据库连接', link: '/tutorial/chapter-3/database-connection'},
                                {text: '日志系统', link: '/tutorial/chapter-3/logging-system'},
                                {text: 'Redis 集成', link: '/tutorial/chapter-3/redis-integration'},
                            ]
                        },
                    ]
                },
                {
                    text: '第四阶段：认证系统',
                    collapsible: true,
                    items: [
                        {
                            text: '第四章：用户认证系统',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-4/'},
                                {text: '用户模型设计 ✨', link: '/tutorial/chapter-4/user-model'},
                                {text: 'JWT 实现', link: '/tutorial/chapter-4/jwt-implementation'},
                                {text: '认证 API 实现 ✨', link: '/tutorial/chapter-4/auth-api'},
                                {text: '认证中间件 ✨', link: '/tutorial/chapter-4/auth-middleware'},
                            ]
                        },
                    ]
                },
                {
                    text: '第五阶段：权限系统 ⭐',
                    collapsible: true,
                    items: [
                        {
                            text: '第五章：权限管理系统（RBAC）',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-5/'},
                                {text: 'RBAC 设计', link: '/tutorial/chapter-5/rbac-design'},
                                {text: 'Casbin 集成 ✨✨✨', link: '/tutorial/chapter-5/casbin-integration'},
                                {text: '权限模型设计 ✨', link: '/tutorial/chapter-5/permission-model'},
                                {text: '权限中间件 ✨', link: '/tutorial/chapter-5/permission-middleware'},
                            ]
                        },
                    ]
                },
                {
                    text: '第六阶段：业务模块',
                    collapsible: true,
                    items: [
                        {
                            text: '第六章：业务功能模块',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-6/'},
                                {text: '分类管理', link: '/tutorial/chapter-6/category-module'},
                                {text: '标签管理', link: '/tutorial/chapter-6/tag-module'},
                                {text: '文章管理', link: '/tutorial/chapter-6/article-module'},
                                {text: '文件上传功能 ✨', link: '/tutorial/chapter-6/file-upload'},
                            ]
                        },
                    ]
                },
                {
                    text: '第七阶段：高级功能',
                    collapsible: true,
                    items: [
                        {
                            text: '第七章：高级功能',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-7/'},
                                {text: '统计 API', link: '/tutorial/chapter-7/statistics-api'},
                                {text: '缓存优化策略 ✨', link: '/tutorial/chapter-7/cache-optimization'},
                            ]
                        },
                    ]
                },
                {
                    text: '第八阶段：系统功能',
                    collapsible: true,
                    items: [
                        {
                            text: '第八章：系统管理功能',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-8/'},
                                {text: '动态配置管理 ✨', link: '/tutorial/chapter-8/dynamic-config'},
                                {text: '操作日志记录 ✨', link: '/tutorial/chapter-8/operation-logs'},
                                {text: '系统监控 ✨', link: '/tutorial/chapter-8/system-monitor'},
                            ]
                        },
                    ]
                },
                {
                    text: '第九阶段：前端开发',
                    collapsible: true,
                    items: [
                        {
                            text: '第九章：Vue 3 前端开发',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-9/'},
                                {text: 'Vue 3 项目初始化', link: '/tutorial/chapter-9/vue3-project-init'},
                                {text: 'API 请求封装', link: '/tutorial/chapter-9/api-request'},
                                {text: '登录与路由', link: '/tutorial/chapter-9/login-auth'},
                                {text: '布局与菜单', link: '/tutorial/chapter-9/layout-menu'},
                            ]
                        },
                    ]
                },
                {
                    text: '第十阶段：部署运维',
                    collapsible: true,
                    items: [
                        {
                            text: '第十章：生产部署',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-10/'},
                                {text: 'Docker 部署', link: '/tutorial/chapter-10/docker-deployment'},
                                {text: 'Nginx 配置 ✨', link: '/tutorial/chapter-10/nginx-config'},
                                {text: '性能优化 ✨', link: '/tutorial/chapter-10/performance-tuning'},
                                {text: '故障排查 ✨', link: '/tutorial/chapter-10/troubleshooting'},
                                {text: '项目总结', link: '/tutorial/chapter-10/project-summary'},
                            ]
                        },
                    ]
                },
                {
                    text: '附录：补充内容',
                    collapsible: true,
                    items: [
                        {
                            text: '第十一章：测试与质量保证',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-11/'},
                            ]
                        },
                        {
                            text: '第十二章：安全加固',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-12/'},
                            ]
                        },
                        {
                            text: '第十三章：CI/CD 自动化',
                            collapsible: true,
                            items: [
                                {text: '章节导读', link: '/tutorial/chapter-13/'},
                            ]
                        },
                    ]
                },
            ],

            // 手册侧边栏 - 按技术主题组织
            '/guide/': [
                {
                    text: '快速参考',
                    collapsible: false,
                    items: [
                        {text: '快速参考', link: '/guide/quick-reference'},
                    ]
                },
                {
                    text: '框架指南',
                    collapsible: true,
                    items: [
                        {text: 'Gin 框架', link: '/guide/framework/gin-guide'},
                        {text: 'GORM 指南', link: '/guide/framework/gorm-guide'},
                        {text: 'Zap 日志', link: '/guide/framework/zap-guide'},
                    ]
                },
                {
                    text: '认证授权',
                    collapsible: true,
                    items: [
                        {text: 'JWT 指南', link: '/guide/auth/jwt-guide'},
                        {text: 'RBAC 指南', link: '/guide/auth/rbac-guide'},
                    ]
                },
                {
                    text: '业务模块',
                    collapsible: true,
                    items: [
                        {text: '用户管理 API', link: '/guide/modules/user-management'},
                        {text: '内容管理 API', link: '/guide/modules/content-management'},
                        {text: '统计 API', link: '/guide/modules/statistics'},
                    ]
                },
                {
                    text: '前端开发',
                    collapsible: true,
                    items: [
                        {text: 'Vue 3 最佳实践', link: '/guide/frontend/vue3-best-practices'},
                        {text: 'API 集成', link: '/guide/frontend/api-integration'},
                        {text: '组件开发', link: '/guide/frontend/component-guide'},
                    ]
                },
                {
                    text: '部署运维',
                    collapsible: true,
                    items: [
                        {text: 'Docker 参考', link: '/guide/deployment/docker-reference'},
                        {text: '故障排查', link: '/guide/deployment/troubleshooting'},
                    ]
                },
            ]
        },

        // 社交链接
        socialLinks: [
            {icon: 'github', link: 'https://github.com/yourusername/iwan-station-gin'}
        ],

        // 页脚
        footer: {
            message: '基于 MIT 许可发布',
            copyright: '2026 Iwan Station'
        },

        // 搜索
        search: {
            provider: 'local'
        },

        // 最后更新
        lastUpdated: {
            text: '最后更新',
            formatOptions: {
                dateStyle: 'short',
                timeStyle: 'short'
            }
        },

        // 编辑链接
        editLink: {
            pattern: 'https://github.com/yourusername/iwan-station-gin/edit/main/docs/:path'
        },

        // 大纲
        outline: {
            label: '页面导航',
            level: [2, 3]
        },

        // 返回顶部
        docFooter: true
    },

    // Markdown 配置
    markdown: {
        lineNumbers: true,
        languages: [
            'go',
            'yaml',
            'bash',
            'sh',
            'javascript',
            'typescript',
            'vue',
            'java',
            'sql'
        ]
    },

    // Vite 配置
    vite: {
        // 服务器端口
        server: {
            port: 15174,
            host: true
        }
    },

    // 忽略死链检查（用于未完成的章节和外部链接）
    ignoreDeadLinks: true
})
