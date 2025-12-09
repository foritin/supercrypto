from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_address_key";
        DROP INDEX IF EXISTS "uid_account_address_c857e2";
        ALTER TABLE "account" ADD "last_login_dt" TIMESTAMPTZ;
        ALTER TABLE "account" ADD "net_type" VARCHAR(20) NOT NULL DEFAULT 'local';
        ALTER TABLE "account" ALTER COLUMN "tag" DROP NOT NULL;
        COMMENT ON COLUMN "account"."last_login_dt" IS '最后登录时间(UTC)';
COMMENT ON COLUMN "account"."net_type" IS '网络类型';
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_account_address_c72b8f" ON "account" ("address", "net_type");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "uid_account_address_c72b8f";
        ALTER TABLE "account" DROP COLUMN "last_login_dt";
        ALTER TABLE "account" DROP COLUMN "net_type";
        ALTER TABLE "account" ALTER COLUMN "tag" SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_account_address_c857e2" ON "account" ("address");"""


MODELS_STATE = (
    "eJztmG1v2jAQx78KyisqdSgEktBpmkQZU5lWOrXsQX1Q5DhOiEgcmjhtUcd3n88hJCSEAV"
    "LHKvUNSu7+59i/s302z5IfWMSLGl2Mg5gy6X3tWaLIJ/yh6DquSWg6zRxgYMj0hBblRGbE"
    "QoShLRt5EeEmi0Q4dKfMDSiIb+OOpWi3saa0dP7c0ToQZwWYB7rUqZbE1L2PicECh7AxCb"
    "nw5kZClhWSSHSHEmaw2ZRId3f8zaUWeSIRqOB1OjFsl3jWyhhdC+KEPYnktgFln4UQOmUa"
    "OPBin2bi6YyNA7pUu8moHUJJiBiB5lkYw6hp7HkLPimIZACZJOliLsYiNoo9YAfRJXSpMY"
    "dqYcIBBey8N5EYoANfeac023q709LaHS4RPVla9HkyvGzsSaAgMBxJc+FHDCUKgTHjhkMC"
    "gzUQK/P7xD3M9cl6iKuRBZjWIrSRPhTRpiBzbBfklmhTScY2m4YpXOmDHVMMUGtRiBuLmW"
    "6iiDT41DJihg34+kdp/wxswDsanPevRt3zb9C8H0X3nsDWHfXBowjrrGCta0dgD/jKSlbc"
    "spHaz8HorAavteuLYV9QDSLmhOKLmW50LUGfUMwCgwaPBl83OTapOTVxaZbteGrtme3VyL"
    "dsv4Zs5zbU1VT3xihcn+ZcSCHHHNIWWS3tj9ukde0OySvHSdts3sZqS1b5r96S4bctF0tM"
    "xb7poyfDI9RhY/7aVDobEvuje9k7617WuaqQreHCpSS++Qreaeg+cBLGhMx2QVwIOzxm/Q"
    "Q3ATZS90GrqNoWaLmqEq3wraJlyNkF6UK+F8p99qEqklpH5occ3dTJfiTVrUiqG0iqRZLL"
    "k9RanH0a+wLpgPcLUUxKaPPx/26qSl6AkVfexmG22iqfrTqxMP/FugmbQsfci7e8DW65mr"
    "ZchO2hiBle4LjUsHausKXgAxXZysmty7ADt2XCwWsCvK3ynVlTbX6+P1Htdv37qHe0XSZe"
    "e5mFe4g9yZ2owWAiPHlEoWWUPIESVGnLLl/xixZEkSPSBTShn+mVjoQuHkvrLnuJ53jjXS"
    "/T/O2qV31+WnOVe7uzveyd7YGEEXRphwqZCznwgWN7ii9fHGFp7HI4TuSvE2BT3qbccVX1"
    "EVguFTz+RUbomlL35epiWPG3QRZSLHAuZrXfNc+NSov6/wC6gR+Md6Vepdjq591fRaK9rx"
    "enxUIEDZxyugctLPM/6dBx7Q=="
)
