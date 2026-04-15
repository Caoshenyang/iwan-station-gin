# 权限模型设计

## 学习目标

完成本章后，你将：
- ✅ 理解完整的 RBAC 数据模型
- ✅ 掌握角色、菜单、权限的关系
- ✅ 学会权限关联设计
- ✅ 实现动态菜单加载

## RBAC 数据模型

完整的 RBAC 系统需要以下核心表：

```
用户 (users) ──▶ 用户角色 (user_roles) ◀── 角色 (roles)
                                              │
                                              ▼
                                        角色菜单 (role_menus)
                                              │
                                              ▼
                                            菜单 (menus)
```

## 数据库表设计

### 角色表

**MySQL 版本：**

```sql
CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    name VARCHAR(50) UNIQUE NOT NULL COMMENT '角色名称',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '角色代码',
    description VARCHAR(255) COMMENT '角色描述',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',

    INDEX idx_status (status),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';
```

**PostgreSQL 版本：**

```sql
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    sort INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_roles_status ON roles(status);
CREATE INDEX idx_roles_code ON roles(code);

COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.name IS '角色名称';
COMMENT ON COLUMN roles.code IS '角色代码';
```

### 用户角色关联表

**MySQL 版本：**

```sql
CREATE TABLE user_roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';
```

**PostgreSQL 版本：**

```sql
CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_roles ADD CONSTRAINT uk_user_role UNIQUE (user_id, role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role_id
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

COMMENT ON TABLE user_roles IS '用户角色关联表';
```

### 菜单/权限表

**MySQL 版本：**

```sql
CREATE TABLE menus (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '菜单ID',
    parent_id BIGINT DEFAULT 0 COMMENT '父菜单ID',
    name VARCHAR(50) NOT NULL COMMENT '菜单名称',
    path VARCHAR(255) COMMENT '路由路径',
    component VARCHAR(255) COMMENT '组件路径',
    icon VARCHAR(50) COMMENT '图标',
    type TINYINT DEFAULT 1 COMMENT '类型：1=菜单，2=按钮',
    permission VARCHAR(100) COMMENT '权限标识',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    visible TINYINT DEFAULT 1 COMMENT '可见性：1=可见，0=隐藏',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',

    INDEX idx_parent_id (parent_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单权限表';
```

**PostgreSQL 版本：**

```sql
CREATE TABLE menus (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT DEFAULT 0,
    name VARCHAR(50) NOT NULL,
    path VARCHAR(255),
    component VARCHAR(255),
    icon VARCHAR(50),
    type INTEGER DEFAULT 1,
    permission VARCHAR(100),
    sort INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    visible INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_menus_parent_id ON menus(parent_id);
CREATE INDEX idx_menus_type ON menus(type);
CREATE INDEX idx_menus_status ON menus(status);

COMMENT ON TABLE menus IS '菜单权限表';
COMMENT ON COLUMN menus.type IS '类型：1=菜单，2=按钮';
COMMENT ON COLUMN menus.status IS '状态：1=启用，0=禁用';
```

### 角色菜单关联表

**MySQL 版本：**

```sql
CREATE TABLE role_menus (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    menu_id BIGINT NOT NULL COMMENT '菜单ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_role_menu (role_id, menu_id),
    INDEX idx_role_id (role_id),
    INDEX idx_menu_id (menu_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色菜单关联表';
```

**PostgreSQL 版本：**

```sql
CREATE TABLE role_menus (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE role_menus ADD CONSTRAINT uk_role_menu UNIQUE (role_id, menu_id);
CREATE INDEX idx_role_menus_role_id ON role_menus(role_id);
CREATE INDEX idx_role_menus_menu_id ON role_menus(menu_id);

ALTER TABLE role_menus ADD CONSTRAINT fk_role_menus_role_id
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE role_menus ADD CONSTRAINT fk_role_menus_menu_id
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE;

COMMENT ON TABLE role_menus IS '角色菜单关联表';
```

## GORM 模型定义

### 角色模型

```go
// internal/model/role.go
package model

// Role 角色模型
type Role struct {
	BaseModel
	Name        string `gorm:"size:50;uniqueIndex;not null" json:"name" binding:"required"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code" binding:"required"`
	Description string `gorm:"size:255" json:"description"`
	Sort        int    `gorm:"default:0" json:"sort"`
	Status      int    `gorm:"default:1" json:"status"`

	// 关联关系
	Users []User `gorm:"many2many:user_roles;joinForeignKey:RoleID;joinReferences:UserID" json:"users,omitempty"`
	Menus []Menu `gorm:"many2many:role_menus;joinForeignKey:RoleID;joinReferences:MenuID" json:"menus,omitempty"`
}

// TableName 指定表名
func (Role) TableName() string {
	return "roles"
}
```

### 菜单模型

```go
// internal/model/menu.go
package model

// Menu 菜单模型（同时表示菜单和按钮权限）
type Menu struct {
	BaseModel
	ParentID   uint64 `gorm:"default:0" json:"parent_id"`
	Name       string `gorm:"size:50;not null" json:"name" binding:"required"`
	Path       string `gorm:"size:255" json:"path"`
	Component  string `gorm:"size:255" json:"component"`
	Icon       string `gorm:"size:50" json:"icon"`
	Type       int    `gorm:"default:1" json:"type"`
	Permission string `gorm:"size:100" json:"permission"`
	Sort       int    `gorm:"default:0" json:"sort"`
	Status     int    `gorm:"default:1" json:"status"`
	Visible    int    `gorm:"default:1" json:"visible"`

	// 关联关系
	Children []Menu `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Roles    []Role `gorm:"many2many:role_menus;joinForeignKey:MenuID;joinReferences:RoleID" json:"roles,omitempty"`
}

// TableName 指定表名
func (Menu) TableName() string {
	return "menus"
}

// IsMenu 判断是否是菜单
func (m *Menu) IsMenu() bool {
	return m.Type == 1
}

// IsButton 判断是否是按钮
func (m *Menu) IsButton() bool {
	return m.Type == 2
}
```

### 关联模型

```go
// internal/model/relation.go
package model

import "time"

// UserRole 用户角色关联
type UserRole struct {
	ID        uint64    `gorm:"primarykey" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	RoleID    uint64    `gorm:"not null;index" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
}

// RoleMenu 角色菜单关联
type RoleMenu struct {
	ID        uint64    `gorm:"primarykey" json:"id"`
	RoleID    uint64    `gorm:"not null;index" json:"role_id"`
	MenuID    uint64    `gorm:"not null;index" json:"menu_id"`
	CreatedAt time.Time `json:"created_at"`
}
```

## Repository 层实现

### 角色仓库

```go
// internal/repository/role.go
package repository

import (
	"context"
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// RoleRepository 角色数据访问
type RoleRepository struct {
	db *gorm.DB
}

// NewRoleRepository 创建角色仓库
func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// Create 创建角色
func (r *RoleRepository) Create(ctx context.Context, role *model.Role) error {
	return r.db.WithContext(ctx).Create(role).Error
}

// FindByID 根据 ID 查找角色
func (r *RoleRepository) FindByID(ctx context.Context, id uint64) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).First(&role, id).Error
	return &role, err
}

// FindByCode 根据代码查找角色
func (r *RoleRepository) FindByCode(ctx context.Context, code string) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&role).Error
	return &role, err
}

// List 获取角色列表
func (r *RoleRepository) List(ctx context.Context, keyword string, status int) ([]*model.Role, error) {
	var roles []*model.Role
	query := r.db.WithContext(ctx).Model(&model.Role{})

	if keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status > 0 {
		query = query.Where("status = ?", status)
	}

	err := query.Order("sort ASC, id DESC").Find(&roles).Error
	return roles, err
}

// Update 更新角色
func (r *RoleRepository) Update(ctx context.Context, role *model.Role) error {
	return r.db.WithContext(ctx).Save(role).Error
}

// Delete 删除角色
func (r *RoleRepository) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Role{}, id).Error
}

// AssignMenus 为角色分配菜单
func (r *RoleRepository) AssignMenus(ctx context.Context, roleID uint64, menuIDs []uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除原有菜单
		if err := tx.Where("role_id = ?", roleID).Delete(&model.RoleMenu{}).Error; err != nil {
			return err
		}

		// 添加新菜单
		if len(menuIDs) > 0 {
			var roleMenus []model.RoleMenu
			for _, menuID := range menuIDs {
				roleMenus = append(roleMenus, model.RoleMenu{
					RoleID: roleID,
					MenuID: menuID,
				})
			}
			if err := tx.Create(&roleMenus).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetMenuIDs 获取角色的菜单ID列表
func (r *RoleRepository) GetMenuIDs(ctx context.Context, roleID uint64) ([]uint64, error) {
	var menuIDs []uint64
	err := r.db.WithContext(ctx).
		Model(&model.RoleMenu{}).
		Where("role_id = ?", roleID).
		Pluck("menu_id", &menuIDs).Error
	return menuIDs, err
}
```

### 菜单仓库

```go
// internal/repository/menu.go
package repository

import (
	"context"
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// MenuRepository 菜单数据访问
type MenuRepository struct {
	db *gorm.DB
}

// NewMenuRepository 创建菜单仓库
func NewMenuRepository(db *gorm.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

// Create 创建菜单
func (r *MenuRepository) Create(ctx context.Context, menu *model.Menu) error {
	return r.db.WithContext(ctx).Create(menu).Error
}

// FindByID 根据 ID 查找菜单
func (r *MenuRepository) FindByID(ctx context.Context, id uint64) (*model.Menu, error) {
	var menu model.Menu
	err := r.db.WithContext(ctx).First(&menu, id).Error
	return &menu, err
}

// List 获取菜单列表
func (r *MenuRepository) List(ctx context.Context, status int) ([]*model.Menu, error) {
	var menus []*model.Menu
	query := r.db.WithContext(ctx).Model(&model.Menu{})

	if status > 0 {
		query = query.Where("status = ?", status)
	}

	err := query.Order("sort ASC, id ASC").Find(&menus).Error
	return menus, err
}

// GetTree 获取菜单树
func (r *MenuRepository) GetTree(ctx context.Context, status int) ([]*model.Menu, error) {
	var menus []*model.Menu
	query := r.db.WithContext(ctx).Where("parent_id = 0")

	if status > 0 {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("sort ASC, id ASC").Find(&menus).Error; err != nil {
		return nil, err
	}

	// 加载子菜单
	for _, menu := range menus {
		r.loadChildren(ctx, menu, status)
	}

	return menus, nil
}

// loadChildren 递归加载子菜单
func (r *MenuRepository) loadChildren(ctx context.Context, parent *model.Menu, status int) {
	var children []*model.Menu
	query := r.db.WithContext(ctx).Where("parent_id = ?", parent.ID)

	if status > 0 {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("sort ASC, id ASC").Find(&children).Error; err != nil {
		return
	}

	if len(children) > 0 {
		parent.Children = children
		for _, child := range children {
			r.loadChildren(ctx, child, status)
		}
	}
}

// GetPermissions 获取角色权限列表
func (r *MenuRepository) GetPermissions(ctx context.Context, roleIDs []uint64) ([]string, error) {
	var permissions []string
	err := r.db.WithContext(ctx).
		Model(&model.Menu{}).
		Joins("JOIN role_menus ON role_menus.menu_id = menus.id").
		Where("role_menus.role_id IN ?", roleIDs).
		Where("menus.permission != ''").
		Pluck("menus.permission", &permissions).Error
	return permissions, err
}

// GetButtons 获取按钮权限列表
func (r *MenuRepository) GetButtons(ctx context.Context, roleIDs []uint64) ([]*model.Menu, error) {
	var buttons []*model.Menu
	err := r.db.WithContext(ctx).
		Model(&model.Menu{}).
		Joins("JOIN role_menus ON role_menus.menu_id = menus.id").
		Where("role_menus.role_id IN ?", roleIDs).
		Where("menus.type = 2"). // 按钮
		Find(&buttons).Error
	return buttons, err
}
```

### 更新用户仓库

```go
// internal/repository/user.go - 添加角色相关方法

// GetRoles 获取用户角色
func (r *UserRepository) GetRoles(ctx context.Context, userID uint64) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.WithContext(ctx).
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error
	return roles, err
}

// GetRoleIDs 获取用户角色ID列表
func (r *UserRepository) GetRoleIDs(ctx context.Context, userID uint64) ([]uint64, error) {
	var roleIDs []uint64
	err := r.db.WithContext(ctx).
		Model(&model.UserRole{}).
		Where("user_id = ?", userID).
		Pluck("role_id", &roleIDs).Error
	return roleIDs, err
}

// AssignRoles 为用户分配角色
func (r *UserRepository) AssignRoles(ctx context.Context, userID uint64, roleIDs []uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除原有角色
		if err := tx.Where("user_id = ?", userID).Delete(&model.UserRole{}).Error; err != nil {
			return err
		}

		// 添加新角色
		if len(roleIDs) > 0 {
			var userRoles []model.UserRole
			for _, roleID := range roleIDs {
				userRoles = append(userRoles, model.UserRole{
					UserID: userID,
					RoleID: roleID,
				})
			}
			if err := tx.Create(&userRoles).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
```

## Service 层实现

### 角色服务

```go
// internal/service/role.go
package service

import (
	"context"
	"errors"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
)

var (
	ErrRoleAlreadyExists = errors.New("role already exists")
	ErrRoleNotFound      = errors.New("role not found")
)

// RoleService 角色业务逻辑
type RoleService struct {
	repos *repository.Repositories
}

// NewRoleService 创建角色服务
func NewRoleService(repos *repository.Repositories) *RoleService {
	return &RoleService{repos: repos}
}

// List 获取角色列表
func (s *RoleService) List(ctx context.Context, keyword string, status int) ([]*model.Role, error) {
	return s.repos.Role.List(ctx, keyword, status)
}

// GetByID 获取角色详情
func (s *RoleService) GetByID(ctx context.Context, id uint64) (*model.Role, error) {
	role, err := s.repos.Role.FindByID(ctx, id)
	if err != nil {
		return nil, ErrRoleNotFound
	}

	// 获取角色的菜单ID
	menuIDs, _ := s.repos.Role.GetMenuIDs(ctx, id)
	return role, nil
}

// Create 创建角色
func (s *RoleService) Create(ctx context.Context, role *model.Role) error {
	// 检查代码是否存在
	existRole, _ := s.repos.Role.FindByCode(ctx, role.Code)
	if existRole != nil {
		return ErrRoleAlreadyExists
	}

	return s.repos.Role.Create(ctx, role)
}

// Update 更新角色
func (s *RoleService) Update(ctx context.Context, role *model.Role) error {
	existRole, err := s.repos.Role.FindByID(ctx, role.ID)
	if err != nil {
		return ErrRoleNotFound
	}

	// 不允许修改代码
	role.Code = existRole.Code

	return s.repos.Role.Update(ctx, role)
}

// Delete 删除角色
func (s *RoleService) Delete(ctx context.Context, id uint64) error {
	// 不允许删除管理员角色
	if id == 1 {
		return errors.New("cannot delete admin role")
	}

	return s.repos.Role.Delete(ctx, id)
}

// AssignMenus 为角色分配菜单
func (s *RoleService) AssignMenus(ctx context.Context, roleID uint64, menuIDs []uint64) error {
	return s.repos.Role.AssignMenus(ctx, roleID, menuIDs)
}
```

### 菜单服务

```go
// internal/service/menu.go
package service

import (
	"context"
	"errors"
	"iwan-station-gin/internal/model"
	"iwan-station-gin/internal/repository"
)

var (
	ErrMenuNotFound = errors.New("menu not found")
)

// MenuService 菜单业务逻辑
type MenuService struct {
	repos *repository.Repositories
}

// NewMenuService 创建菜单服务
func NewMenuService(repos *repository.Repositories) *MenuService {
	return &MenuService{repos: repos}
}

// GetTree 获取菜单树
func (s *MenuService) GetTree(ctx context.Context) ([]*model.Menu, error) {
	return s.repos.Menu.GetTree(ctx, 1) // 只获取启用的
}

// GetUserMenus 获取用户菜单
func (s *MenuService) GetUserMenus(ctx context.Context, userID uint64) ([]*model.Menu, error) {
	// 获取用户角色
	roleIDs, err := s.repos.User.GetRoleIDs(ctx, userID)
	if err != nil || len(roleIDs) == 0 {
		return []*model.Menu{}, nil
	}

	// 获取角色的菜单ID
	var menuIDs []uint64
	for _, roleID := range roleIDs {
		ids, _ := s.repos.Role.GetMenuIDs(ctx, roleID)
		menuIDs = append(menuIDs, ids...)
	}

	// 去重
	menuIDMap := make(map[uint64]bool)
	for _, id := range menuIDs {
		menuIDMap[id] = true
	}

	// 获取菜单
	var menus []*model.Menu
	for id := range menuIDMap {
		menu, _ := s.repos.Menu.FindByID(ctx, id)
		if menu != nil && menu.Status == 1 && menu.Type == 1 && menu.Visible == 1 {
			menus = append(menus, menu)
		}
	}

	// 构建树形结构
	return s.buildMenuTree(menus, 0), nil
}

// buildMenuTree 构建菜单树
func (s *MenuService) buildMenuTree(menus []*model.Menu, parentID uint64) []*model.Menu {
	var tree []*model.Menu
	for _, menu := range menus {
		if menu.ParentID == parentID {
			menu.Children = s.buildMenuTree(menus, menu.ID)
			tree = append(tree, menu)
		}
	}
	return tree
}

// GetUserPermissions 获取用户权限
func (s *MenuService) GetUserPermissions(ctx context.Context, userID uint64) ([]string, error) {
	roleIDs, err := s.repos.User.GetRoleIDs(ctx, userID)
	if err != nil || len(roleIDs) == 0 {
		return []string{}, nil
	}

	return s.repos.Menu.GetPermissions(ctx, roleIDs)
}
```

## 数据传输对象

### 角色 DTO

```go
// internal/api/v1/dto/role.go
package dto

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
	Status      int    `json:"status" binding:"oneof=0 1"`
}

// AssignMenusRequest 分配菜单请求
type AssignMenusRequest struct {
	MenuIDs []uint64 `json:"menu_ids" binding:"required"`
}
```

### 菜单 DTO

```go
// internal/api/v1/dto/menu.go
package dto

// CreateMenuRequest 创建菜单请求
type CreateMenuRequest struct {
	ParentID   uint64 `json:"parent_id"`
	Name       string `json:"name" binding:"required"`
	Path       string `json:"path"`
	Component  string `json:"component"`
	Icon       string `json:"icon"`
	Type       int    `json:"type" binding:"oneof=1 2"`
	Permission string `json:"permission"`
	Sort       int    `json:"sort"`
	Visible    int    `json:"visible" binding:"oneof=0 1"`
}

// UpdateMenuRequest 更新菜单请求
type UpdateMenuRequest struct {
	ParentID   uint64 `json:"parent_id"`
	Name       string `json:"name" binding:"required"`
	Path       string `json:"path"`
	Component  string `json:"component"`
	Icon       string `json:"icon"`
	Type       int    `json:"type" binding:"oneof=1 2"`
	Permission string `json:"permission"`
	Sort       int    `json:"sort"`
	Status     int    `json:"status" binding:"oneof=0 1"`
	Visible    int    `json:"visible" binding:"oneof=0 1"`
}
```

## 初始化数据

### 默认角色和菜单

```go
// internal/pkg/seed/permission.go
package seed

import (
	"iwan-station-gin/internal/model"

	"gorm.io/gorm"
)

// SeedPermissions 初始化权限数据
func SeedPermissions(db *gorm.DB) error {
	// 创建默认角色
	adminRole := &model.Role{
		Name: "管理员",
		Code: "admin",
		Sort: 1,
	}
	db.FirstOrCreate(adminRole, model.Role{Code: "admin"})

	editorRole := &model.Role{
		Name: "编辑",
		Code: "editor",
		Sort: 2,
	}
	db.FirstOrCreate(editorRole, model.Role{Code: "editor"})

	// 创建系统管理菜单
	menus := []*model.Menu{
		{
			ParentID:   0,
			Name:       "系统管理",
			Path:       "/system",
			Icon:       "setting",
			Type:       1,
			Sort:       100,
			Status:     1,
			Visible:    1,
		},
		{
			ParentID:   0,
			Name:       "用户管理",
			Path:       "/system/user",
			Component:  "system/user/index",
			Type:       1,
			Permission: "user:list",
			Sort:       1,
			Status:     1,
			Visible:    1,
		},
		// ... 更多菜单
	}

	for _, menu := range menus {
		db.FirstOrCreate(menu, model.Menu{Permission: menu.Permission})
	}

	// 为管理员分配所有菜单
	var allMenus []model.Menu
	db.Find(&allMenus)

	for _, menu := range allMenus {
		var roleMenu model.RoleMenu
		db.Where("role_id = ? AND menu_id = ?", adminRole.ID, menu.ID).FirstOrCreate(&roleMenu)
	}

	return nil
}
```

## 最佳实践

### ✅ 应该做的

1. **使用事务**：分配角色/菜单时使用事务
2. **软删除**：角色和菜单使用软删除
3. **级联删除**：使用外键约束自动清理关联
4. **缓存菜单**：用户菜单应该缓存到 Redis
5. **权限细粒度**：按钮权限与菜单权限分离

### ❌ 不应该做的

1. **硬编码权限**：权限应该可配置
2. **忽略层级关系**：菜单是有父子关系的
3. **过度嵌套**：菜单层级不要超过3层
4. **忘记索引**：为外键和常用查询字段添加索引

## 下一步

权限模型设计完成后，让我们学习「[权限中间件](./permission-middleware.html)」
