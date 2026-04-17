// config/config.go
package config

// Config 应用配置
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Log      LogConfig      `mapstructure:"log"`
	Casbin   CasbinConfig   `mapstructure:"casbin"`
	Upload   UploadConfig   `mapstructure:"upload"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port         int    `mapstructure:"port"`
	Mode         string `mapstructure:"mode"` // debug/release/test
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Type         string `mapstructure:"type"` // mysql 或 postgresql
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	Username     string `mapstructure:"username"`
	Password     string `mapstructure:"password"`
	Database     string `mapstructure:"database"`
	Charset      string `mapstructure:"charset"` // MySQL 使用
	ParseTime    bool   `mapstructure:"parse_time"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxLifetime  int    `mapstructure:"max_lifetime"`
}

// RedisConfig Redis 配置
type RedisConfig struct {
	Host        string `mapstructure:"host"`
	Port        int    `mapstructure:"port"`
	Password    string `mapstructure:"password"`
	DB          int    `mapstructure:"db"`
	PoolSize    int    `mapstructure:"pool_size"`
	MinIdleConn int    `mapstructure:"min_idle_conn"`
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpireTime int    `mapstructure:"expire_time"` // 小时
	Issuer     string `mapstructure:"issuer"`
}

// LogConfig 日志配置
type LogConfig struct {
	Level      string `mapstructure:"level"`
	Filename   string `mapstructure:"filename"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxBackups int    `mapstructure:"max_backups"`
	MaxAge     int    `mapstructure:"max_age"`
	Compress   bool   `mapstructure:"compress"`
}

// CasbinConfig Casbin 配置
type CasbinConfig struct {
	ModelPath string `mapstructure:"model_path"`
}

// UploadConfig 文件上传配置
type UploadConfig struct {
	MaxSize   int      `mapstructure:"max_size"`
	AllowExts []string `mapstructure:"allow_exts"`
	SavePath  string   `mapstructure:"save_path"`
}

// DefaultConfig 返回带有默认值的配置
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         8080,
			Mode:         "debug",
			ReadTimeout:  60,
			WriteTimeout: 60,
		},
		Database: DatabaseConfig{
			Type:         "postgresql",
			Host:         "localhost",
			Port:         5432,
			Username:     "iwan",
			Password:     "iwan123456",
			Database:     "iwan_station",
			Charset:      "",
			ParseTime:    true,
			MaxIdleConns: 10,
			MaxOpenConns: 100,
			MaxLifetime:  3600,
		},
		Redis: RedisConfig{
			Host:        "localhost",
			Port:        6379,
			Password:    "",
			DB:          0,
			PoolSize:    10,
			MinIdleConn: 5,
		},
		JWT: JWTConfig{
			Secret:     "change-me-in-production",
			ExpireTime: 24,
			Issuer:     "iwan-station",
		},
		Log: LogConfig{
			Level:      "info",
			Filename:   "logs/app.log",
			MaxSize:    100,
			MaxBackups: 3,
			MaxAge:     30,
			Compress:   true,
		},
		Casbin: CasbinConfig{
			ModelPath: "./config/rbac_model.conf",
		},
		Upload: UploadConfig{
			MaxSize:   10,
			AllowExts: []string{".jpg", ".jpeg", ".png", ".gif", ".pdf"},
			SavePath:  "./uploads",
		},
	}
}
