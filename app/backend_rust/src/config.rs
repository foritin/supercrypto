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
    pub postgresql: PostgresqlConfig,
    pub redis: RedisConfig,
    pub rustfs: MinioConfig,
    pub minio: MinioConfig,
    pub ai_providers: AiProvidersConfig,
    pub aspose: AsposeConfig,
    pub crypto: CryptoConfig,
    pub kyc: KycConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChainConfig {
    pub name: String,
    pub network: String,
    pub chain_id: u64,
    pub rpc_url: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PostgresqlConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
    pub pool_size: u32,
    pub echo: bool,
}

impl PostgresqlConfig {
    pub fn url(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.user, self.password, self.host, self.port, self.database
        )
    }
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
pub struct MinioConfig {
    pub access_key: String,
    pub secret_key: String,
    pub endpoint: String,
    pub bucket: String,
    #[serde(default)]
    pub secure: bool,
    #[serde(default)]
    pub redirect: String,
    #[serde(default)]
    pub access: String,
    #[serde(default)]
    pub secret: String,
    #[serde(default)]
    pub version: String,
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

impl AppConfig {
    pub fn load() -> anyhow::Result<Self> {
        let env = env::var("APP_ENVIRONMENT").unwrap_or_else(|_| "dev".to_string());
        let config_file = format!("config/{}.yaml", env);

        let mut cfg = config::Config::builder()
            .add_source(config::File::with_name(&config_file).required(true))
            .add_source(config::Environment::with_prefix("APP").separator("__"))
            .build()?;

        let app_config: AppConfig = cfg.try_deserialize()?;
        Ok(app_config)
    }
}
