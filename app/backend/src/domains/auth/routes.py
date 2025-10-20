# from fastapi import Depends

# @app.post("/kyc/verify")
# async def verify_kyc(
#     user_id: str,
#     kyc_service: KYCServiceInterface = Depends(get_kyc_service)
# ):
#     result = await kyc_service.verify_user(user_id)
#     return result