from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    TIMESCALE_URL: str = "postgresql://mes_ts_user:password@timescaledb:5432/ks_mes_ts"
    POSTGRES_URL:  str = "postgresql://mes_app_user:password@postgres:5432/ks_mes"
    ML_API_KEY:    str = "change-me-in-production"
    MODEL_DIR:     str = "/models"
    PORT:          int = 3007

    # AutoEncoder
    AE_SEQ_LEN:    int   = 60
    AE_HIDDEN_DIM: int   = 64
    AE_LATENT_DIM: int   = 16
    AE_NUM_LAYERS: int   = 2

    # Thresholds (override via env after first training)
    AE_THRESHOLD:  float = 0.05   # reconstruction error
    FAILURE_ALARM_THRESHOLD: float = 0.70
    RUL_WARNING_HOURS:       float = 200.0
    RUL_CRITICAL_HOURS:      float = 72.0


settings = Settings()
