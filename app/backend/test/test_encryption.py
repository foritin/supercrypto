"""
私钥加密模块测试

验证:
- encrypt_private_key / decrypt_private_key 往返一致性
- 空输入校验
- 无效加密数据处理
- 不同密钥无法解密
"""

from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet

from src.shared.security.encryption import (
    decrypt_private_key,
    encrypt_private_key,
)


class TestEncryptPrivateKey:
    """encrypt_private_key 单元测试"""

    def test_encrypt_returns_non_empty_string(self):
        """加密后应返回非空字符串"""
        result = encrypt_private_key("0xabc123")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_encrypt_result_differs_from_input(self):
        """加密结果应与原文不同"""
        original = "0xdeadbeef1234567890"
        encrypted = encrypt_private_key(original)
        assert encrypted != original

    def test_encrypt_empty_raises_value_error(self):
        """空字符串应抛出 ValueError"""
        with pytest.raises(ValueError, match="私钥不能为空"):
            encrypt_private_key("")

    def test_encrypt_none_raises_value_error(self):
        """None 应抛出 ValueError"""
        with pytest.raises(ValueError, match="私钥不能为空"):
            encrypt_private_key(None)


class TestDecryptPrivateKey:
    """decrypt_private_key 单元测试"""

    def test_decrypt_empty_raises_value_error(self):
        """空字符串应抛出 ValueError"""
        with pytest.raises(ValueError, match="加密数据不能为空"):
            decrypt_private_key("")

    def test_decrypt_none_raises_value_error(self):
        """None 应抛出 ValueError"""
        with pytest.raises(ValueError, match="加密数据不能为空"):
            decrypt_private_key(None)

    def test_decrypt_invalid_data_raises_value_error(self):
        """无效加密数据应抛出 ValueError"""
        with pytest.raises(ValueError, match="解密失败"):
            decrypt_private_key("not-a-valid-encrypted-string")


class TestEncryptDecryptRoundTrip:
    """加密解密往返测试"""

    def test_roundtrip_basic(self):
        """基本往返: 加密后解密应得到原始值"""
        original = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        encrypted = encrypt_private_key(original)
        decrypted = decrypt_private_key(encrypted)
        assert decrypted == original

    def test_roundtrip_short_key(self):
        """短私钥往返"""
        original = "0x1234"
        encrypted = encrypt_private_key(original)
        decrypted = decrypt_private_key(encrypted)
        assert decrypted == original

    def test_roundtrip_with_special_chars(self):
        """包含特殊字符的私钥往返"""
        original = "0xABCDEF!@#$%^&*()"
        encrypted = encrypt_private_key(original)
        decrypted = decrypt_private_key(encrypted)
        assert decrypted == original

    def test_same_input_produces_different_ciphertext(self):
        """相同输入每次加密应产生不同密文 (Fernet 包含时间戳和随机 IV)"""
        original = "0xdeadbeef"
        encrypted1 = encrypt_private_key(original)
        encrypted2 = encrypt_private_key(original)
        assert encrypted1 != encrypted2

    def test_both_decrypt_to_same_value(self):
        """不同密文解密后应得到相同原文"""
        original = "0xdeadbeef"
        encrypted1 = encrypt_private_key(original)
        encrypted2 = encrypt_private_key(original)
        assert decrypt_private_key(encrypted1) == decrypt_private_key(encrypted2) == original


class TestEncryptionKeyConfig:
    """加密密钥配置测试"""

    def test_missing_encryption_key_raises_error(self):
        """未配置 ENCRYPTION_KEY 应抛出 ValueError"""
        with patch(
            "src.shared.security.encryption.SETTINGS",
            spec=[],
        ) as mock_settings:
            # spec=[] 使 getattr 返回 None
            mock_settings.ENCRYPTION_KEY = None
            with pytest.raises(ValueError, match="ENCRYPTION_KEY 未配置"):
                encrypt_private_key("0x123")

    def test_invalid_encryption_key_raises_error(self):
        """无效的 ENCRYPTION_KEY 应抛出 ValueError"""
        with patch(
            "src.shared.security.encryption.SETTINGS",
        ) as mock_settings:
            mock_settings.ENCRYPTION_KEY = "not-a-valid-fernet-key"
            with pytest.raises(ValueError, match="ENCRYPTION_KEY 格式无效"):
                encrypt_private_key("0x123")

    def test_wrong_key_cannot_decrypt(self):
        """使用不同密钥加密的数据无法解密"""
        # 用当前配置的密钥加密
        encrypted = encrypt_private_key("0xsecret")

        # 用另一个密钥尝试解密
        other_key = Fernet.generate_key().decode()
        with patch(
            "src.shared.security.encryption.SETTINGS",
        ) as mock_settings:
            mock_settings.ENCRYPTION_KEY = other_key
            with pytest.raises(ValueError, match="解密失败"):
                decrypt_private_key(encrypted)
