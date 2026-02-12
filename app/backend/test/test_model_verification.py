"""
Model Layer Verification Script

This script verifies the model layer implementation for KYC Admin Backend Enhancement:
1. Model imports work correctly
2. New fields have correct default values
3. KycAuditLog model can be created with a foreign key to AccountKyc

Task: 1.6 Checkpoint: 模型层验证
"""

import asyncio
import sys
from datetime import datetime

import pytest
from tortoise import Tortoise

# Test imports work correctly
from src.models import (
    AccountKyc,
    KycAuditLog,
    KycAuditAction,
    KycStatus,
    RiskLevel,
    ReviewPriority,
)
from src.shared.schemas.enums import Network


class TestModelImports:
    """Test that all model imports work correctly"""

    def test_account_kyc_import(self):
        """Verify AccountKyc model can be imported"""
        assert AccountKyc is not None
        # Check fields exist in the model's fields_map
        fields_map = AccountKyc._meta.fields_map
        assert 'risk_level' in fields_map
        assert 'risk_score' in fields_map
        assert 'priority' in fields_map
        assert 'is_pep' in fields_map
        assert 'is_sanctioned' in fields_map
        assert 'source_ip' in fields_map
        assert 'device_fingerprint' in fields_map

    def test_kyc_audit_log_import(self):
        """Verify KycAuditLog model can be imported"""
        assert KycAuditLog is not None
        # Check fields exist in the model's fields_map
        fields_map = KycAuditLog._meta.fields_map
        assert 'kyc' in fields_map or 'kyc_id' in fields_map
        assert 'action' in fields_map
        assert 'actor_address' in fields_map
        assert 'actor_role' in fields_map
        assert 'details' in fields_map

    def test_enum_imports(self):
        """Verify all new enums can be imported"""
        assert RiskLevel is not None
        assert ReviewPriority is not None
        assert KycAuditAction is not None
        
        # Verify enum values
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.CRITICAL.value == "critical"
        
        assert ReviewPriority.LOW.value == "low"
        assert ReviewPriority.NORMAL.value == "normal"
        assert ReviewPriority.HIGH.value == "high"
        assert ReviewPriority.URGENT.value == "urgent"
        
        assert KycAuditAction.SUBMIT.value == "submit"
        assert KycAuditAction.REVIEW.value == "review"
        assert KycAuditAction.APPROVE.value == "approve"
        assert KycAuditAction.REJECT.value == "reject"
        assert KycAuditAction.RESUBMIT.value == "resubmit"
        assert KycAuditAction.SYNC.value == "sync"
        assert KycAuditAction.RESET.value == "reset"


class TestModelFieldDefaults:
    """Test that model fields have correct default values"""

    def test_account_kyc_field_defaults(self):
        """Verify AccountKyc model field defaults are correct"""
        # Get field descriptors
        fields = AccountKyc._meta.fields_map
        
        # Check risk_level default
        risk_level_field = fields.get('risk_level')
        assert risk_level_field is not None
        assert risk_level_field.default == RiskLevel.LOW
        
        # Check risk_score default
        risk_score_field = fields.get('risk_score')
        assert risk_score_field is not None
        assert risk_score_field.default == 0
        
        # Check priority default
        priority_field = fields.get('priority')
        assert priority_field is not None
        assert priority_field.default == ReviewPriority.NORMAL
        
        # Check is_pep default
        is_pep_field = fields.get('is_pep')
        assert is_pep_field is not None
        assert is_pep_field.default == False
        
        # Check is_sanctioned default
        is_sanctioned_field = fields.get('is_sanctioned')
        assert is_sanctioned_field is not None
        assert is_sanctioned_field.default == False
        
        # Check source_ip is nullable
        source_ip_field = fields.get('source_ip')
        assert source_ip_field is not None
        assert source_ip_field.null == True
        
        # Check device_fingerprint is nullable
        device_fingerprint_field = fields.get('device_fingerprint')
        assert device_fingerprint_field is not None
        assert device_fingerprint_field.null == True


class TestKycAuditLogModel:
    """Test KycAuditLog model structure"""

    def test_kyc_audit_log_meta(self):
        """Verify KycAuditLog model meta configuration"""
        assert KycAuditLog._meta.db_table == "kyc_audit_log"
        # Check ordering - Tortoise ORM stores ordering as tuple of tuples
        ordering = KycAuditLog._meta.ordering
        # The ordering should contain '-created_at' in some form
        assert ordering is not None
        # Convert to string representation to check
        ordering_str = str(ordering)
        assert 'created_at' in ordering_str

    def test_kyc_audit_log_fields(self):
        """Verify KycAuditLog model fields"""
        fields = KycAuditLog._meta.fields_map
        
        # Check kyc foreign key field (stored as kyc_id in fields_map)
        assert 'kyc' in fields or 'kyc_id' in fields
        
        # Check action field
        action_field = fields.get('action')
        assert action_field is not None
        
        # Check actor_address field
        actor_address_field = fields.get('actor_address')
        assert actor_address_field is not None
        assert actor_address_field.max_length == 42
        
        # Check actor_role field
        actor_role_field = fields.get('actor_role')
        assert actor_role_field is not None
        assert actor_role_field.max_length == 20
        
        # Check details field is nullable
        details_field = fields.get('details')
        assert details_field is not None
        assert details_field.null == True


class TestModelIntegration:
    """Integration tests for model layer using synchronous approach"""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        """Initialize test database synchronously"""
        async def init():
            await Tortoise.init(
                db_url="sqlite://:memory:",
                modules={"models": ["src.models"]},
            )
            await Tortoise.generate_schemas()
        
        async def cleanup():
            await Tortoise.close_connections()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(init())
        yield
        loop.run_until_complete(cleanup())
        loop.close()

    def test_create_account_kyc_with_defaults(self, setup_db):
        """Test creating AccountKyc with default values"""
        async def run_test():
            kyc = await AccountKyc.create(
                address="0x1234567890123456789012345678901234567890",
                network=Network.HARDHAT,
            )
            
            # Verify default values
            assert kyc.risk_level == RiskLevel.LOW
            assert kyc.risk_score == 0
            assert kyc.priority == ReviewPriority.NORMAL
            assert kyc.is_pep == False
            assert kyc.is_sanctioned == False
            assert kyc.source_ip is None
            assert kyc.device_fingerprint is None
            
            # Cleanup
            await kyc.delete()
        
        asyncio.get_event_loop().run_until_complete(run_test())

    def test_create_kyc_audit_log_with_foreign_key(self, setup_db):
        """Test creating KycAuditLog with foreign key to AccountKyc"""
        async def run_test():
            # Create AccountKyc first
            kyc = await AccountKyc.create(
                address="0x2234567890123456789012345678901234567890",
                network=Network.HARDHAT,
            )
            
            # Create KycAuditLog with foreign key
            audit_log = await KycAuditLog.create(
                kyc=kyc,
                action=KycAuditAction.SUBMIT,
                actor_address="0x2234567890123456789012345678901234567890",
                actor_role="user",
                details={"test": "data"},
            )
            
            # Verify foreign key relationship
            assert audit_log.kyc_id == kyc.id
            
            # Verify we can fetch the related KYC
            await audit_log.fetch_related("kyc")
            assert audit_log.kyc.address == kyc.address
            
            # Verify we can fetch audit logs from KYC
            await kyc.fetch_related("audit_logs")
            assert len(kyc.audit_logs) == 1
            assert kyc.audit_logs[0].id == audit_log.id
            
            # Cleanup
            await audit_log.delete()
            await kyc.delete()
        
        asyncio.get_event_loop().run_until_complete(run_test())

    def test_kyc_audit_log_cascade_delete(self, setup_db):
        """Test that KycAuditLog is deleted when AccountKyc is deleted"""
        async def run_test():
            # Create AccountKyc
            kyc = await AccountKyc.create(
                address="0x3234567890123456789012345678901234567890",
                network=Network.HARDHAT,
            )
            
            # Create KycAuditLog
            audit_log = await KycAuditLog.create(
                kyc=kyc,
                action=KycAuditAction.SUBMIT,
                actor_address="0x3234567890123456789012345678901234567890",
                actor_role="user",
            )
            audit_log_id = audit_log.id
            
            # Delete KYC (should cascade delete audit log)
            await kyc.delete()
            
            # Verify audit log is deleted
            deleted_log = await KycAuditLog.get_or_none(id=audit_log_id)
            assert deleted_log is None
        
        asyncio.get_event_loop().run_until_complete(run_test())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
