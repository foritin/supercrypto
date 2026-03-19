from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import anyio
import pytest
from web3 import Web3

from src.services.treasury_service import TreasuryService


def test_verify_onchain_signature_converts_signer_to_checksum_before_call() -> None:
    async def run_case() -> None:
        service = TreasuryService()

        lower_signer = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"
        checksum_signer = Web3.to_checksum_address(lower_signer)

        service._get_treasury_multisig_contract = AsyncMock(
            return_value=SimpleNamespace(address="0x5FbDB2315678afecb367f032d93F642f64180aa3")
        )
        service._get_contract_abi = AsyncMock(return_value=[])

        mock_adapter = MagicMock()
        mock_adapter.register_contract = MagicMock()
        mock_adapter.call_function = AsyncMock(
            side_effect=[
                [checksum_signer],  # get_signers
                True,  # has_signed
            ]
        )

        @asynccontextmanager
        async def mock_adapter_ctx():
            yield mock_adapter

        with patch(
            "src.services.treasury_service.get_async_web3_adapter",
            return_value=mock_adapter_ctx(),
        ):
            await service._verify_onchain_signature(
                proposal_id=3,
                signer_address=lower_signer,
            )

        has_signed_call = mock_adapter.call_function.call_args_list[1]
        assert has_signed_call.args[1] == "has_signed"
        assert has_signed_call.args[2][1] == checksum_signer

    anyio.run(run_case)
