from functools import lru_cache

from src.core.config import SETTINGS
from src.domains.auth.interfaces import KYCServiceInterface
from src.domains.auth.services import KYCService, MockKYCService


@lru_cache()
def get_kyc_service() -> KYCServiceInterface:
    env = SETTINGS.ENVIRONMENT
    if env == "dev":
        return MockKYCService()
    elif env == "test":
        return MockKYCService()
    elif env == "prod":
        return KYCService()
    else:
        raise ValueError(f"Invalid environment: {env}")
