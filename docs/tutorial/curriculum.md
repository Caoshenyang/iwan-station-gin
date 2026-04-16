---
title: 课程大纲
description: "按学习阶段浏览 Iwan Station Gin 的完整课程结构，从环境搭建到生产部署逐步推进。"
outline: false
aside: false
---

# 🧭 课程大纲

::: tip 💡 学习建议
第一次阅读建议按章节顺序推进；已经有经验的同学可以配合「[快速参考](/guide/quick-reference)」跳转查阅。
:::

<div class="curriculum-toc">

<div class="curriculum-part-title">第一阶段：启动与建模</div>
<div class="curriculum-part-desc">搭起开发环境、确认项目边界、理解目录与分层，让后面的代码不再像“凭感觉堆出来”。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-1/">
    <span class="curriculum-num">第一章</span>
    <span class="curriculum-title">课程介绍与准备</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/course-intro"><span>课程概述</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/environment-setup"><span>环境搭建</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/project-init"><span>项目初始化</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/go-for-java-devs"><span>Go vs Java</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-2/">
    <span class="curriculum-num">第二章</span>
    <span class="curriculum-title">项目架构设计</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/architecture-overview"><span>架构概览</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/directory-structure"><span>目录结构</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/layered-design"><span>分层架构设计</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/dependency-injection"><span>依赖注入</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-3/">
    <span class="curriculum-num">第三章</span>
    <span class="curriculum-title">基础框架搭建</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/configuration"><span>配置管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/gin-framework"><span>Gin 框架</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/database-connection"><span>数据库连接</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/logging-system"><span>日志系统</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/redis-integration"><span>Redis 集成</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第二阶段：安全主线</div>
<div class="curriculum-part-desc">先把登录认证和权限控制这条高风险主线打牢，再继续往业务层扩展，后面的后台能力才站得住。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-4/">
    <span class="curriculum-num">第四章</span>
    <span class="curriculum-title">用户认证系统</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/user-model"><span>用户模型设计</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/jwt-implementation"><span>JWT 实现</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/auth-api"><span>认证 API</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/auth-middleware"><span>认证中间件</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-5/">
    <span class="curriculum-num">第五章</span>
    <span class="curriculum-title">权限管理系统 <span class="curriculum-badge star">重点</span></span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/rbac-design"><span>RBAC 设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/casbin-integration"><span>Casbin 集成</span><span class="curriculum-badge">重点</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/permission-model"><span>权限模型设计</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/permission-middleware"><span>权限中间件</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第三阶段：业务与性能</div>
<div class="curriculum-part-desc">把系统真正做成“可用的后台”：先补核心业务模块，再把缓存、统计与运维能力一点点接上来。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-6/">
    <span class="curriculum-num">第六章</span>
    <span class="curriculum-title">业务功能模块</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/category-module"><span>分类管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/tag-module"><span>标签管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/article-module"><span>文章管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/file-upload"><span>文件上传</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-7/">
    <span class="curriculum-num">第七章</span>
    <span class="curriculum-title">统计接口与缓存优化</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/statistics-api"><span>统计 API</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/cache-optimization"><span>缓存优化</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-8/">
    <span class="curriculum-num">第八章</span>
    <span class="curriculum-title">系统管理与监控</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/dynamic-config"><span>动态配置</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/operation-logs"><span>操作日志</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/system-monitor"><span>系统监控</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第四阶段：前端与交付</div>
<div class="curriculum-part-desc">把前面做好的后端能力接成真正可操作的管理后台，并完成从本地开发走向线上交付的最后一公里。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-9/">
    <span class="curriculum-num">第九章</span>
    <span class="curriculum-title">管理后台前端</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/vue3-project-init"><span>项目初始化</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/api-request"><span>API 请求封装</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/login-auth"><span>登录与路由</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/layout-menu"><span>布局与菜单</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-10/">
    <span class="curriculum-num">第十章</span>
    <span class="curriculum-title">生产部署与交付</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/docker-deployment"><span>Docker 部署</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/nginx-config"><span>Nginx 配置</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/performance-tuning"><span>性能优化</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/troubleshooting"><span>故障排查</span><span class="curriculum-badge">新增</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/project-summary"><span>项目总结</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第五阶段：进阶扩展</div>
<div class="curriculum-part-desc">这一段面向想继续把项目做深做稳的读者，补上测试、安全与自动化，让教程走向工程化闭环。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-11/">
    <span class="curriculum-num">第十一章</span>
    <span class="curriculum-title">测试与质量保证</span>
  </a>
</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-12/">
    <span class="curriculum-num">第十二章</span>
    <span class="curriculum-title">安全加固</span>
  </a>
</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-13/">
    <span class="curriculum-num">第十三章</span>
    <span class="curriculum-title">CI/CD 自动化</span>
  </a>
</div>

</div>

