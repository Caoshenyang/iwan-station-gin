# 课程大纲

<style>
.toc { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; }
.toc-part-title { font-size: 12px; color: #888; margin: 24px 0 12px; font-weight: 600; text-transform: uppercase; }
.toc-chapter { margin: 8px 0; }
.toc-chapter a { display: flex; color: #333; text-decoration: none; padding: 4px 0; }
.toc-chapter a:hover { color: #42b983; }
.toc-num { font-weight: 600; color: #42b983; margin-right: 10px; min-width: 65px; font-size: 14px; }
.toc-title { font-size: 14px; font-weight: 500; }
.toc-item { padding-left: 75px; margin: 4px 0; }
.toc-item a { display: flex; color: #666; text-decoration: none; font-size: 13px; padding: 2px 0; }
.toc-item a:hover { color: #42b983; }
.toc-dot { flex: 1; border-bottom: 1px dotted #ddd; margin: 0 8px; }
.new { color: #10b981; font-size: 11px; margin-left: 4px; }
.star { color: #f59e0b; font-size: 11px; }
</style>

<div class="toc">

<div class="toc-part-title">第一部分：基础准备</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-1/">
    <span class="toc-num">第一章</span>
    <span class="toc-title">课程介绍与准备</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-1/course-intro"><span>课程概述</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-1/environment-setup"><span>环境搭建</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-1/project-init"><span>项目初始化</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-1/go-for-java-devs"><span>Go vs Java</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第二部分：架构设计</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-2/">
    <span class="toc-num">第二章</span>
    <span class="toc-title">项目架构设计</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-2/architecture-overview"><span>架构概览</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-2/directory-structure"><span>目录结构</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-2/layered-design"><span>分层架构设计</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-2/dependency-injection"><span>依赖注入</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第三部分：基础设施</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-3/">
    <span class="toc-num">第三章</span>
    <span class="toc-title">基础框架搭建</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-3/configuration"><span>配置管理</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-3/gin-framework"><span>Gin 框架</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-3/database-connection"><span>数据库连接</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-3/logging-system"><span>日志系统</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-3/redis-integration"><span>Redis 集成</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第四部分：认证与授权</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-4/">
    <span class="toc-num">第四章</span>
    <span class="toc-title">用户认证系统</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-4/user-model"><span>用户模型设计</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-4/jwt-implementation"><span>JWT 实现</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-4/auth-api"><span>认证 API</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-4/auth-middleware"><span>认证中间件</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-5/">
    <span class="toc-num">第五章</span>
    <span class="toc-title">权限管理系统 <span class="star">⭐</span></span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-5/rbac-design"><span>RBAC 设计</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-5/casbin-integration"><span>Casbin 集成</span><span class="new">✨✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-5/permission-model"><span>权限模型设计</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-5/permission-middleware"><span>权限中间件</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第五部分：业务功能</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-6/">
    <span class="toc-num">第六章</span>
    <span class="toc-title">业务功能模块</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-6/category-module"><span>分类管理</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-6/tag-module"><span>标签管理</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-6/article-module"><span>文章管理</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-6/file-upload"><span>文件上传</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-7/">
    <span class="toc-num">第七章</span>
    <span class="toc-title">高级功能</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-7/statistics-api"><span>统计 API</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-7/cache-optimization"><span>缓存优化</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第六部分：系统管理</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-8/">
    <span class="toc-num">第八章</span>
    <span class="toc-title">系统管理功能</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-8/dynamic-config"><span>动态配置</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-8/operation-logs"><span>操作日志</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-8/system-monitor"><span>系统监控</span><span class="new">✨</span><span class="toc-dot"></span></a></div>

<div class="toc-part-title">第七部分：前端与部署</div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-9/">
    <span class="toc-num">第九章</span>
    <span class="toc-title">Vue 3 前端开发</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-9/vue3-project-init"><span>项目初始化</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-9/api-request"><span>API 请求封装</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-9/login-auth"><span>登录与路由</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-9/layout-menu"><span>布局与菜单</span><span class="toc-dot"></span></a></div>

<div class="toc-chapter">
  <a href="/tutorial/chapter-10/">
    <span class="toc-num">第十章</span>
    <span class="toc-title">生产部署</span>
  </a>
</div>
<div class="toc-item"><a href="/tutorial/chapter-10/docker-deployment"><span>Docker 部署</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-10/nginx-config"><span>Nginx 配置</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-10/performance-tuning"><span>性能优化</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-10/troubleshooting"><span>故障排查</span><span class="new">✨</span><span class="toc-dot"></span></a></div>
<div class="toc-item"><a href="/tutorial/chapter-10/project-summary"><span>项目总结</span><span class="toc-dot"></span></a></div>

</div>
