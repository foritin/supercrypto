from src.domains.auth.interfaces import KYCServiceInterface


class MockKYCService(KYCServiceInterface):

    async def verify_user(self, user_id: str) -> dict:
        return {"status": "approved", "mock": "true"}
    

    async def get_status(self, verification_id:str) -> str:
        return "approved"


class KYCService(KYCServiceInterface):

    async def verify_user(self, user_id: str) -> dict:
        # TODO: 调用第三方KYC服务商API进行验证
        pass

    async def get_status(self, verification_id:str) -> str:
        # TODO: 调用第三方KYC服务商API获取验证状态
        pass


