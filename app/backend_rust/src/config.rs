use serde::{Deserialize, Serialize};
use std::env;

/// 应用配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppConfig {
    pub environment: String,
    pub network: String,
    pub debug: bool,
    pub app_name: String,
    pub jwt_secret: String,
    pub access_token_expire_minutes: i64,
    pub refresh_token_expire_minutes: i64,
    pub backdoor: String,
    pub encryption_key: String,
    pub chain: ChainConfig,
    pub sqlite: SqliteConfig,
    pub redis: RedisConfig,
    pub ai_providers: AiProvidersConfig,
    pub aspose: AsposeConfig,
    pub crypto: CryptoConfig,
    pub kyc: KycConfig,
    #[serde(default)]
    pub faucet: FaucetConfig,
    #[serde(default)]
    pub deployer: DeployerConfig,
    #[serde(default)]
    pub log: LogConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChainConfig {
    pub name: String,
    pub network: String,
    pub chain_id: u64,
    pub rpc_url: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SqliteConfig {
    /// SQLite 数据库文件路径，例如 "data/app.sqlite"
    pub database_url: String,
    /// 最大连接数
    pub max_connections: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RedisConfig {
    pub host: String,
    pub port: u16,
    pub db: i64,
    pub password: String,
}

impl RedisConfig {
    pub fn url(&self) -> String {
        format!(
            "redis://:{}@{}:{}/{}",
            self.password, self.host, self.port, self.db
        )
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AiProvidersConfig {
    #[serde(default)]
    pub openai: AiProviderConfig,
    #[serde(default)]
    pub doubao: AiProviderConfig,
    #[serde(default)]
    pub deepseek: AiProviderConfig,
    #[serde(default)]
    pub qwen: AiProviderConfig,
    #[serde(default)]
    pub claude: AiProviderConfig,
    #[serde(default)]
    pub gemini: AiProviderConfig,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct AiProviderConfig {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AsposeConfig {
    pub license_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CryptoConfig {
    pub mainnet_url: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KycConfig {
    pub provider: String,
    pub max_file_size_mb: i64,
    pub review_deadline_hours: i64,
    #[serde(default)]
    pub sumsub: SumsubConfig,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct SumsubConfig {
    pub api_key: String,
    pub webhook_secret: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FaucetConfig {
    pub private_key: String,
    pub amount_eth: String,
}

impl Default for FaucetConfig {
    fn default() -> Self {
        Self {
            private_key: String::new(),
            amount_eth: "1".to_string(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DeployerConfig {
    pub private_key: String,
}

impl Default for DeployerConfig {
    fn default() -> Self {
        Self {
            private_key: String::new(),
        }
    }
}

/// 日志配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LogConfig {
    /// 日志级别: trace, debug, info, warn, error
    #[serde(default = "default_log_level")]
    pub level: String,
    /// 日志目录
    #[serde(default = "default_log_dir")]
    pub dir: String,
    /// 日志轮转: daily, hourly, never
    #[serde(default = "default_log_rotation")]
    pub rotation: String,
    /// 是否同时输出到 stdout
    #[serde(default = "default_true")]
    pub stdout: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: default_log_level(),
            dir: default_log_dir(),
            rotation: default_log_rotation(),
            stdout: true,
        }
    }
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_log_dir() -> String {
    "logs".to_string()
}

fn default_log_rotation() -> String {
    "daily".to_string()
}

fn default_true() -> bool {
    true
}

impl AppConfig {
    pub fn load() -> anyhow::Result<Self> {
        let env = env::var("APP_ENVIRONMENT").unwrap_or_else(|_| "dev".to_string());
        let _config_file = format!("config/{}.yaml", env);
        let config_file = format!("config/{}.yaml", env);

        let cfg = config::Config::builder()
            .add_source(config::File::with_name(&config_file).required(true))
            .add_source(config::Environment::with_prefix("APP").separator("__"))
            .build()?;

        let app_config: AppConfig = cfg.try_deserialize()?;
        Ok(app_config)
    }
}
