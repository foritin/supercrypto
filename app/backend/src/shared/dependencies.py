import datetime
import re
from typing import Optional

import jwt
from falib.adapter.postgresql import PostgresqlAdapterSync
from falib.utils.config import SETTINGS
from fastapi.security import OAuth2PasswordBearer

from src.models.account import Account
from src.models.deploy import DeployInfo
from src.shared.exceptions import UnauthorizedException

TOKEN_URL = "api/v1/auth/token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=TOKEN_URL)


def create_access_token(
    data: dict, expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """创建访问令牌（Access Token）

    Args:
        data (dict): 要编码到JWT中的数据
        expires_delta (Optional[datetime.timedelta], optional): 自定义过期时间. Defaults to None.

    Returns:
        str: 编码后的JWT访问令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(tz=datetime.UTC) + expires_delta
    else:
        expire = datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(
            minutes=SETTINGS.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SETTINGS.JWT_SECRET, algorithm="HS256")
    return encoded_jwt


def create_refresh_token(
    data: dict, expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """创建刷新令牌（Refresh Token）

    Args:
        data (dict): 要编码到JWT中的数据
        expires_delta (Optional[datetime.timedelta], optional): 自定义过期时间. Defaults to None.

    Returns:
        str: 编码后的JWT刷新令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(tz=datetime.UTC) + expires_delta
    else:
        expire = datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(
            minutes=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SETTINGS.JWT_SECRET, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SETTINGS.JWT_SECRET, algorithms=["HS256"])
        address = payload.get("address")
        if not address:
            raise UnauthorizedException("Invalid token")
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Token expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedException("Invalid token")
    except jwt.PyJWTError:
        raise UnauthorizedException("Invalid token")
    return payload


def refresh_token(token: str) -> dict:
    payload = verify_token(token)
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    return access_token, refresh_token


def get_db_adapter() -> PostgresqlAdapterSync:
    return PostgresqlAdapterSync(
        host=SETTINGS.POSTGRESQL.HOST,
        port=SETTINGS.POSTGRESQL.PORT,
        user=SETTINGS.POSTGRESQL.USER,
        password=SETTINGS.POSTGRESQL.PASSWORD,
        database=SETTINGS.POSTGRESQL.DATABASE,
    )


if __name__ == "__main__":
    db_adapter = get_db_adapter()
    print(db_adapter)
