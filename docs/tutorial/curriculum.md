---
title: 课程大纲
description: "按唯一正式主线浏览 Iwan Station Gin 的完整课程结构，从环境准备一路推进到架构、业务、前端、质量与生产交付。"
outline: false
aside: false
---

# 🧭 课程大纲

::: tip 💡 学习建议
第一次阅读建议直接按下面的正式主线推进；如果你只是想先确认项目效果，再去走「[快速开始](/tutorial/quick-start)」这条体验路线。
:::

<div class="curriculum-toc">

<div class="curriculum-part-title">开始前先看</div>
<div class="curriculum-part-desc">这几页不属于正式主线本身，但它们能帮你快速建立全局认知，知道这套教程适合谁、该怎么读、最终会做到哪里。</div>

<div class="curriculum-item"><a href="/tutorial/"><span>开始这里</span><span class="curriculum-badge">入口</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/how-to-use"><span>如何使用这套教程</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/quick-start"><span>快速开始（体验路线）</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/go-for-java-devs"><span>Java 转 Go 导读</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第一阶段：环境与架构准备</div>
<div class="curriculum-part-desc">先把环境、项目初始化、架构边界和通用工程骨架理顺。越早把这些基础打稳，后面越不容易一边写一边返工。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-1/">
    <span class="curriculum-num">第一章</span>
    <span class="curriculum-title">环境准备与项目初始化</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/environment-setup"><span>环境搭建</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/project-init"><span>项目初始化</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-1/first-run"><span>第一次跑通项目</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-2/">
    <span class="curriculum-num">第二章</span>
    <span class="curriculum-title">项目蓝图与分层架构</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/architecture-overview"><span>架构概览</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/directory-structure"><span>目录结构</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/layered-design"><span>分层架构设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-2/dependency-injection"><span>依赖注入</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-3/">
    <span class="curriculum-num">第三章</span>
    <span class="curriculum-title">配置、日志、数据库与缓存</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/configuration"><span>配置管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/logging-system"><span>日志系统</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/database-connection"><span>数据库连接</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-3/redis-integration"><span>Redis 集成</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-4/">
    <span class="curriculum-num">第四章</span>
    <span class="curriculum-title">通用 Web 基础设施</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/app-bootstrap-and-routing"><span>应用启动与路由组织</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/request-binding-and-validation"><span>请求绑定与参数校验</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/unified-response-and-errors"><span>统一响应与错误处理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-4/middleware-pipeline"><span>中间件链路设计</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第二阶段：认证、授权与业务主线</div>
<div class="curriculum-part-desc">先把登录认证和权限控制这条高风险主线打牢，再继续往业务层扩展，后面的后台能力才站得住。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-5/">
    <span class="curriculum-num">第五章</span>
    <span class="curriculum-title">用户体系与 JWT 认证</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/user-model"><span>用户模型设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/password-security"><span>密码安全与存储</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/jwt-implementation"><span>JWT 实现</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/auth-api"><span>认证 API</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-5/auth-middleware"><span>认证中间件</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-6/">
    <span class="curriculum-num">第六章</span>
    <span class="curriculum-title">RBAC 权限与菜单模型 <span class="curriculum-badge star">重点</span></span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/rbac-design"><span>RBAC 设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/casbin-integration"><span>Casbin 集成</span><span class="curriculum-badge">重点</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/permission-model"><span>权限模型设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/menu-model"><span>菜单模型设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-6/permission-middleware"><span>权限中间件</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-7/">
    <span class="curriculum-num">第七章</span>
    <span class="curriculum-title">内容管理模块</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/category-module"><span>分类管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/tag-module"><span>标签管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/article-module"><span>文章管理</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-7/content-query-and-pagination"><span>查询、筛选与分页</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-8/">
    <span class="curriculum-num">第八章</span>
    <span class="curriculum-title">文件上传与对象存储</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/file-upload-design"><span>上传能力设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/minio-integration"><span>MinIO 集成</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/upload-api"><span>上传 API 实现</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-8/file-security"><span>文件安全与访问控制</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第三阶段：运行期能力与后台交付</div>
<div class="curriculum-part-desc">把系统真正做成“可用且可维护的后台”：先补统计和缓存，再把配置、日志、监控与前端管理界面一点点接上来。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-9/">
    <span class="curriculum-num">第九章</span>
    <span class="curriculum-title">统计接口与缓存优化</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/statistics-api"><span>统计 API</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/dashboard-data"><span>后台首页数据建模</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/cache-strategy"><span>缓存策略设计</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-9/cache-invalidation"><span>缓存失效与一致性</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-10/">
    <span class="curriculum-num">第十章</span>
    <span class="curriculum-title">系统配置、审计日志与监控</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/dynamic-config"><span>动态配置</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/operation-logs"><span>操作日志</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/system-monitor"><span>系统监控</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-10/observability-basics"><span>可观测性基础</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-11/">
    <span class="curriculum-num">第十一章</span>
    <span class="curriculum-title">Vue 3 管理后台</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-11/vue3-project-init"><span>项目初始化</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-11/api-request"><span>API 请求封装</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-11/login-auth"><span>登录与认证态</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-11/layout-menu"><span>布局与菜单</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-11/dashboard-pages"><span>后台首页与基础页面</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-part-title">第四阶段：质量保障与生产交付</div>
<div class="curriculum-part-desc">最后把教程收成真正的工程闭环：先补测试、安全和发布前检查，再完成容器化、反向代理、自动化交付与线上排障。</div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-12/">
    <span class="curriculum-num">第十二章</span>
    <span class="curriculum-title">测试、安全与发布前检查</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-12/testing-strategy"><span>测试策略</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-12/api-testing"><span>接口测试</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-12/web-security"><span>Web 安全加固</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-12/release-checklist"><span>发布前检查清单</span><span class="curriculum-dot"></span></a></div>

<div class="curriculum-chapter">
  <a href="/tutorial/chapter-13/">
    <span class="curriculum-num">第十三章</span>
    <span class="curriculum-title">Docker、Nginx、CI/CD 与生产交付</span>
  </a>
</div>
<div class="curriculum-item"><a href="/tutorial/chapter-13/docker-deployment"><span>Docker 部署</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-13/nginx-config"><span>Nginx 配置</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-13/cicd-pipeline"><span>CI/CD 流水线</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-13/troubleshooting"><span>线上排障</span><span class="curriculum-dot"></span></a></div>
<div class="curriculum-item"><a href="/tutorial/chapter-13/project-summary"><span>项目总结</span><span class="curriculum-dot"></span></a></div>

</div>
