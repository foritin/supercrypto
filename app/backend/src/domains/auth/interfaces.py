from abc import ABC, abstractmethod


class KYCServiceInterface(ABC):

    @abstractmethod
    async def verify_user(self, user_id: str) -> dict:
        pass

    @abstractmethod
    async def get_status(self, verification_id:str) -> str:
        pass