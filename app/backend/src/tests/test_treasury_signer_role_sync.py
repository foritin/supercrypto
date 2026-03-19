from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import anyio
import pytest

from src.common.exceptions import ValidationException
from src.services.treasury_service import TreasuryService


class _MockAccount:
    def __init__(self, address: str, roles: list[str]):
        self.address = address
        self.roles = roles
        self.save = AsyncMock()


def test_prepare_init_treasury_requires_contract_owner_in_signers() -> None:
    async def run_case() -> None:
        service = TreasuryService()
        service._get_treasury_multisig_contract = AsyncMock(
            return_value=SimpleNamespace(address="0x5FbDB2315678afecb367f032d93F642f64180aa3")
        )
        service._get_contract_abi = AsyncMock(return_value=[])

        non_owner_accounts = [
            _MockAccount("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ["admin"]),
            _MockAccount("0xc5e8c19d212ba765f8bdb28b9e560415cde488cd", ["multisig_signer"]),
            _MockAccount("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", ["treasury"]),
        ]

        with patch("src.services.treasury_service.Account.filter") as mock_filter:
            mock_filter.return_value.all = AsyncMock(return_value=non_owner_accounts)

            with pytest.raises(ValidationException, match="contract_owner"):
                await service.prepare_init_treasury(
                    signer_addresses=[
                        "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
                        "0xc5e8c19d212ba765f8bdb28b9e560415cde488cd",
                        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
                    ],
                    required_signatures=2,
                )

    anyio.run(run_case)


def test_sync_signer_roles_adds_multisig_signer_and_skips_contract_owner() -> None:
    async def run_case() -> None:
        service = TreasuryService()

        owner = _MockAccount(
            "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
            ["admin", "contract_owner"],
        )
        signer = _MockAccount(
            "0xc5e8c19d212ba765f8bdb28b9e560415cde488cd",
            ["admin", "treasury"],
        )

        with patch("src.services.treasury_service.Account.filter") as mock_filter:
            mock_filter.return_value.all = AsyncMock(return_value=[owner, signer])

            await service._sync_signer_roles(
                signer_addresses=[
                    "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
                    "0xc5e8c19d212ba765f8bdb28b9e560415cde488cd",
                ]
            )

        assert owner.roles == ["admin", "contract_owner"]
        owner.save.assert_not_called()

        assert "multisig_signer" in signer.roles
        assert "treasury" not in signer.roles
        signer.save.assert_awaited_once()

    anyio.run(run_case)
