from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "project_contract_config" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "project_name" VARCHAR(128) NOT NULL,
    "contract_name" VARCHAR(128) NOT NULL,
    "dependency_type" VARCHAR(8) NOT NULL DEFAULT 'business',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "description" TEXT,
    "module" VARCHAR(50),
    "required_deps" JSONB NOT NULL,
    "optional_deps" JSONB NOT NULL,
    "deploy_order" INT NOT NULL DEFAULT 0,
    "allow_zero_address" BOOL NOT NULL DEFAULT True,
    "environments" JSONB NOT NULL,
    "production_address" VARCHAR(42),
    CONSTRAINT "uid_project_con_project_8e6e26" UNIQUE ("project_name", "contract_name")
);
CREATE INDEX IF NOT EXISTS "idx_project_con_project_f41911" ON "project_contract_config" ("project_name");
CREATE INDEX IF NOT EXISTS "idx_project_con_contrac_2e6458" ON "project_contract_config" ("contract_name");
CREATE INDEX IF NOT EXISTS "idx_project_con_is_prim_9d33c7" ON "project_contract_config" ("is_primary");
CREATE INDEX IF NOT EXISTS "idx_project_con_deploy__834ee7" ON "project_contract_config" ("deploy_order");
CREATE INDEX IF NOT EXISTS "idx_project_con_project_3f466b" ON "project_contract_config" ("project_name", "dependency_type");
CREATE INDEX IF NOT EXISTS "idx_project_con_project_b6706d" ON "project_contract_config" ("project_name", "is_primary");
CREATE INDEX IF NOT EXISTS "idx_project_con_project_58402b" ON "project_contract_config" ("project_name", "deploy_order");
COMMENT ON COLUMN "project_contract_config"."project_name" IS '项目名称';
COMMENT ON COLUMN "project_contract_config"."contract_name" IS '合约名称';
COMMENT ON COLUMN "project_contract_config"."dependency_type" IS '依赖类型 (PRIMARY/REQUIRED/BUSINESS/OPTIONAL)';
COMMENT ON COLUMN "project_contract_config"."is_primary" IS '是否为主合约';
COMMENT ON COLUMN "project_contract_config"."description" IS '合约描述';
COMMENT ON COLUMN "project_contract_config"."module" IS '所属模块 (common/mock/project)';
COMMENT ON COLUMN "project_contract_config"."required_deps" IS '必须依赖列表 [''KYC'', ''Token'']';
COMMENT ON COLUMN "project_contract_config"."optional_deps" IS '可选依赖列表 [''Oracle'']';
COMMENT ON COLUMN "project_contract_config"."deploy_order" IS '部署顺序优先级 (数字越小越优先)';
COMMENT ON COLUMN "project_contract_config"."allow_zero_address" IS '是否允许零地址绑定 (支持后置绑定)';
COMMENT ON COLUMN "project_contract_config"."environments" IS '适用环境列表 (空表示所有环境)';
COMMENT ON COLUMN "project_contract_config"."production_address" IS '生产环境固定地址 (0x...)';
COMMENT ON TABLE "project_contract_config" IS '项目合约配置模型';
        CREATE TABLE IF NOT EXISTS "contract_deployment_status" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "network" VARCHAR(50) NOT NULL,
    "status" VARCHAR(14) NOT NULL DEFAULT 'registered',
    "address" VARCHAR(42),
    "bindings" JSONB NOT NULL,
    "deploy_tx_hash" VARCHAR(66),
    "deploy_block_number" BIGINT,
    "deploy_timestamp" TIMESTAMPTZ,
    "config_id" INT NOT NULL REFERENCES "project_contract_config" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_contract_de_config__cd3c75" UNIQUE ("config_id", "network")
);
CREATE INDEX IF NOT EXISTS "idx_contract_de_network_5c6780" ON "contract_deployment_status" ("network");
CREATE INDEX IF NOT EXISTS "idx_contract_de_status_9b9466" ON "contract_deployment_status" ("status");
CREATE INDEX IF NOT EXISTS "idx_contract_de_network_9fbf86" ON "contract_deployment_status" ("network", "status");
COMMENT ON COLUMN "contract_deployment_status"."network" IS '网络名称 (local/testnet/mainnet)';
COMMENT ON COLUMN "contract_deployment_status"."status" IS '合约状态';
COMMENT ON COLUMN "contract_deployment_status"."address" IS '合约部署地址 (0x...)';
COMMENT ON COLUMN "contract_deployment_status"."bindings" IS '依赖绑定状态';
COMMENT ON COLUMN "contract_deployment_status"."deploy_tx_hash" IS '部署交易哈希';
COMMENT ON COLUMN "contract_deployment_status"."deploy_block_number" IS '部署区块号';
COMMENT ON COLUMN "contract_deployment_status"."deploy_timestamp" IS '部署时间戳';
COMMENT ON COLUMN "contract_deployment_status"."config_id" IS '关联的合约配置';
COMMENT ON TABLE "contract_deployment_status" IS '合约部署状态模型';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "contract_deployment_status";
        DROP TABLE IF EXISTS "project_contract_config";"""


MODELS_STATE = (
    "eJztXWtzm0iX/iuUq7bit1axuV9SW1tlJ54Z7yRxNnF23tlkSsWlsXktCQ2gZLxT+e/bp1"
    "uIBhoE6AJO+DAZWeqD0HOa7nN5zum/T+ahh2bx2YXrhqtFcvJC+PtkYc8RflH8aCKc2Mtl"
    "9gG8kdjOjIy1mUFOnES2C9fy7VmM8Fseit0oWCZBuIDBn1emJ+ufV7qsGPi1qZsg54UuFg"
    "wWd/whwnMB/6nJPv5XEaXPK82Ffw3LhNeq6eJ/ZVn8vLJ0Xf28UpGswqeuh/+VHbiUiMcv"
    "Pi+eC0E8dWah+4C8FwKMVFS4sq/nr+n7oom/2vfwFUzLxWMUuMLKMl0E92Ab6Tua5DhYCn"
    "kKkbLIrWoK8kEQKevL0i/GyKGEfrHuKiZ8varlb51+saHJZvr7dRfh15YmipuvFDU3HVP4"
    "Sl3UZfzaEvF9q76qw1fAaw35Nr4hx0aA9moR/LlC0yS8Q8k9ijDmnz6d2J4XoZhodoGSr2"
    "H0cPLHH/iPYOGhv1AMg+DP5cPUD9DMy82WwAMx8v40eVyS964XyU9kIKjXmbrhbDVfZIOX"
    "j8l9uNiMDuj8uUMLFNkYI/xeEq1g/ixWs9l6pqVTit5/NoTeIiPj4Z+7msEsBOnSJEzfZC"
    "bd+i03XMAExncTkx94B9/yXJZUQzUVXTXxEHInm3eMb/TnZb+dChIE3t6efCOf24lNRxAY"
    "M9zcCMGPndpJGb9X+JMkmCM+iHnJApjeWvQsfVGENgWSwXaN3AbadEiGbfZAp+Ce/Ie/Wr"
    "gAqhBH7tl6zXDsGJ3hmTVdJe4Uvv0/T7proAbe2+s3Vx9uL968g8vP4/jPGYHt4vYKPpHJ"
    "u4+Fd0/1f8D7IV6j6Nq1uYjw2/XtLwL8KfzvzdsrgmoYJ3cR+cZs3O3/nsA92asknC7Cr1"
    "P82DDYpG+nb+GhmbZXS6+jtvOSo7afgrazjaas7cswnCF7UbE+5gQLynawZAP9llbKsoJL"
    "S2Xlhq3rsPFqqpzbJIvbdmuNXt7cvM4p8/L6Nq+utx/fXF69P5WIFvGgIEHsupphvcarw5"
    "OVl+zpyeJuUid5i4TaKJbmq6cfb1/+Y2f0n9zzlGrKeSzr+OW9HdXrl0oV9Iuh6lGjpihq"
    "zdR4Mrf/ms7Q4i65x39Kslmj1/+5eP/ylwv80MhmQVlv1x/J9DP+E4TNihjfbAnhW/RXhT"
    "lXlhwUyppiweKlI3H3R+bqn7e5pyVF9PTNxT//kXtiXt+8/Tkdzmjg5eubywLwmVvQfptg"
    "BIe2TWxcmiFtE2u8OmwTecmhbROM//jDbxOpptptE3mp/hcwRqOD2iaYIEFTaBmRTrg2WK"
    "OaA2upDtkTRAi7GIoI/6oNd4YjwLuMgi8YiekDajV7C2L9w2xYLgTLVLvTzJU1vQG0eFQl"
    "tOSzPLSJfdcG0vXw3lcC3RQNjKdjoG5Iao2Q1GqQ1IpIptFBLppXi9WcIHqNb8teuKiELC"
    "N+vIl6gm/Nu6e7d3m2+ppEQrgQVXUNBxYF0+mEt9gEbrEabbEI9syOk+ksvAsWU6+11VIS"
    "HpjhohsQ1NZUEWHgdQK8r2k/qBEDwXX/gQkTwxuO7T58xVN3WvoklMOqseWP5vK8+I69sO"
    "+IugBNuM804xPHiJ8KIh9MahNBmyFb00Dvf7sQIM+jknSNXZUKqh7GyWEUshWf8IJiJ6v4"
    "BL//id4bnfnkb7T4EkThYo4WCX2Diaj/MSY6JmOiYwx9j4mOUdvbtU3+38K0Tsf376aw+w"
    "q2QoAtYPmdvEFZbGb51Zl+Jdsvfpw7NIzXFNpMon9wVUTYD4iEYh0SFFR8YxhWNXuzJXir"
    "Q90Fsd6dQ3b+6ooLlBO/6fw9dpybsb+4E3q745i/whF9R2yBzKYIjEnE9R9ZNQzNfwzm2M"
    "yfrqJWy0hOaFCzXNN98BVl1fj4/nUXhLVGC7VWs1Br5YUa38QKHIm2OBfleofa0H0TKG2G"
    "Ak64CcuKqStDgnoWujZ/2a6GmZXpHWJ2Nqu+CjaHr6PzXcPRSiOwlRqwlTLY7iqKYHouo8"
    "DlLNuvkItXilmF31aULRrzVPhsfZFDLd4iTwear4FpIgP6lmlCksWGSJRuKDboxicTX3GF"
    "048fXu0efnp19fL6zcXrU0WfSGYhSZlqRi2BT4CbdnelePIDi/9lSOdjgbruk1SmI7KxwB"
    "8jDJjLWYQJtjzi1XI54+SDah+/ouiAnj5dVMBEkj0/XQ0t0/KE09vwAS1A4QbkPiXX7+vJ"
    "i1cO3LIDj808Zba3wJ4rPyAFaJ4vEzK4Spj2HlVAT2DPg8V0DViFP1aLNU+8H6glkT/b6b"
    "rmin4BcsmTegXeXj5OlXlLuDOhwcxnhdR72ARpWigBGX7HIu9IvnDx7nfh9N/2t5ZI4kRt"
    "BbLeBWR9WCDrQwdZkrugvJYaDMySPGScl1H4L+RydsM6ZspGpHfPi7q1pqhBbZhuErvDsO"
    "A1QinRwnRcXTj10HIWPk6DhR+erX9BQ8iLHnAjB7jG/y15ZOGCJFanHYhYPNnelaIixREg"
    "y0usP4F4AFAAh2x9kAytdUqZC/v2EGYmfcTwJVZ58KVB5HJTKDmMyCWboG8xywtiR8QZwk"
    "wzLsyGYgMz2jQVdp0ZBsxpfp3Hl61kNuSFtjMcDk6XlZy0xlVFjn39qiG2e2A9tKDtcJZx"
    "B/9cfIecBeVyfYmffn2PZlXhS5aa83J9zUt6yWOn+9jdNVtWWhkq2bvr+ZF3FJEXALlkhv"
    "aB1hu42neHEY353QdxEkac57k1Su/ger9kl/uuwGLDBjtOqQ+FCMSTx6kVwzCD1Mfbwiqq"
    "e0BvFug2xP80nIA/MRfsyVXYK6ZtiZjFRb2Kl8lZ/LfQNKfFPYjINGrfkeLxPG+tG8jbOK"
    "s5AKt6fHS4DvTwID0tROooC+TXb9pfqAhphQtYkp361OyXQJ+Nl+F8Hi6EfxfynmBhmPV5"
    "ke89YolwSdN3jSpvBW4Heo/oBtxO0e8UNkxafh8Ooh3KHd3oiOi82I7jU9mlo0zW9F3Kdh"
    "3JrB3Muokwklm7a+B7SsKNZNYfSdv5Fbek8AbRteHQW3Ob0070VqkRu0SqYZdIHHbJEGKZ"
    "DQBvtjsV8R5e6DJvFnQBuwfuJZNAqMU7412+EFxq150LrHDvgbYgBi7U3OY65lsaPTCCB2"
    "v0UAa/0gVgOz2oiHKmCKdjo5CdE1R77PrAGtQNjV1WpFN0czAe/kFCnAVsy8D+FEYouFv8"
    "ih5L+ZAaZ/8p4Vrl5eO3I/vrxtnKzST8s2mfCbLcXnx4efHq6uRbj2Wem+hKVViBDb9siy"
    "ewsZ92cQTIPYH7rfmkLZKDSB7K1RqEDgqiaatQ2htTRSa4844GnGbRhqVJ1i14Hxx4mgKm"
    "32YgV89dioQZLFGU89fSZcVP93aW78/ekO+Lbv5bNcuU4X38rQvSqtPwST5fdoECjCTStt"
    "Nfj1hpig6BBUIVolw42vVT9wyV975lQMtPw0L++uokDWI4UNPOuTr51BKhv4iGDHLXvpde"
    "y/B9JyVelj9lr5ztt/RbTcdBRNIj6Zh1oe7mW0nHUtPX9ZT0vP5Nrg8pMVdnepvqoHdkOy"
    "nahqNaFcGSQjxkDHR0WNwnY6BjdH3HQMcPp20HeVEYzjled+XKyIr0n/MvbZNAGT+eUZzD"
    "0k7uK8CspSDm5HYmIe61M0vJ2AB0hdNCF3ZFtfNjwdQR5DNtfwxFdVL08GqI+3/6nLWrcj"
    "6nw3ufy5kJBwhjw4uU3znYGDVln3S7V+ymBMQ9T+34Tw6vtgZRHp92SIBiu1XpCcpZmEzj"
    "4P84obdKPFmR3kFNQ5qaMegZ+4jsaOqsglmbpSAv1D/UXC+tRzwjtAi/2NwmtfWY5gR7x5"
    "UW45i+V+nr9oPxMgqXKEoeW4fmS4K9E7pzIRYmKB9jPGdo6tvzYPY4Eeb4KsHmLwyvF05I"
    "4B5FbrCm0fbOtgfeW8BjM1VvgJlE/5PdMiAQ5aoyteH6mdpQBA6VqDW8eT6UJcH+p7a1Ll"
    "mVWLb8CyF03dUyQN5E+GK79iKZCEs7SjrO4v0nnubhIrmfPcJS3LaStSg6LB+FlEhRpUA1"
    "5Z6r9SVxIjf2PGbIjtEULbypt+4SU46fVJh4Jcm6+EkvM35DywMjz9DA/dOA2AYVabvDfX"
    "F7VUzYzdEiSLgL7399uHlbkbJjhQoQflzgX/TJC1z8aM6COPnjyDDyg+MC/JgXwqdneLV4"
    "wOg9mwjPlmE4g//fPc7hfzFyV1GQPOLXZ2dnf+wMNnxjLkBV6uxUbOI0yUee4ALFzk4LFN"
    "zdO2F0H4Yc87BaY0W5gSlNU3VyBBw4NVkeZa20v2MX3/YsplkHDP4iDhL6R3wfLpdYP/DX"
    "t2FqbBAZ8Y7JkSHmw9ukcLfmzlOG/KEz5/3gf6C8+e65cFoQVJUI35QLbcuCzzcDW6bANd"
    "uC4m/SmYi23sLuqN4oBc6KZiT5XKA2l40mrhk9HDPL4q7z4VW3kWWvaVa22I4tPbmSXl3z"
    "IXJByfM0Jw0zhgaNiMw6ZwwHa6o+hJV02QaqvKqm3+J6GsnFO2wnsrWcBdl6y7TIGQM+PZ"
    "BTa5YjzvPraU0ZpclnTaLpZ3EYJdMw8vBlRgr9mFnOgTvmGsfM8qjtCm0zi2pJ283aJOSv"
    "cES2MWl8WlbjSX5fHFqP1yRIZq2ixhuB3kNqOXODdEbA23rJ3mkG6wE6cH8nfaJzKA+8T3"
    "TLFrq7dM7dL5mYazh3bJ0riU0Lbmorbsorxf1q7izsYNa2U3FJsPc5bfgypPM1oIuCSzEw"
    "pKFPResaspxQ7wivT061XCfvCkIpWacV+hCHkRHIWrIqcjL9p+lYaC3ZoM0iT53HBMU9US"
    "jm2JptnYrOCfU8ed9gM3ZXO+0gNY9MUKH5fM0LHa8eid/PVIF9TkOmT7om2PR1P/P0Ryip"
    "w1vb+ef1idYQQNvZahsr6wacSRgr676Pyrpc46yqpEKxu9a23EKpu1fbHAPbb19TTHokk9"
    "wox1Ap6hD+nK91ir+PZy6OMfYx6jrG2Edtt9R2lxN5ej6Jp8pWGMhxO3G4iniQ1hy2uJHo"
    "PVSTP0gHQmI6sobT6Wf0E0Y/YfQTin7CyguS1yG/p2f6Wb1XAKOms7Bx607NsUmDDfiXUn"
    "g13yvBXTmQ8ooyix96M8AIQxVJWBg4RpRFpMsqOU5NtPC/KjCNVF9zm3kIox8w+gGjZTj6"
    "AaO2G2gbqv/sJIy69FDkyfbeQzHbLcAuEDVgeDqk1QC8HmBXRdutPo62wZnW7k4kkUMhvy"
    "PDSWqS55Wq07xSibdgR3e1p4dXsBbyYgdy0xojzB40tRvCutoAYV2tRBg+4iLMs7G24su1"
    "tXpEV2h8/svhlwcPJXYwa1XJxogMrCQqtzgzbfrWLe/oEq3KDul/L+fb1NHTlun5vpoIgY"
    "q0sdvw6qPiletyN9PapDIjdbCMculp2LxRoyo2t6zLEuygsrV75eYeE8koirAdMsforfm3"
    "TZmWJcHeQ3GWJlnk6fCL7RfFTStI3bDgebEUiZwGS5+g3Z+Fg/Axk7+m93Z832pbyET63h"
    "RURDpY6RKc9666oAEkuoPZHYJlF8M9L9X7jC+a7ML1O2FXU33/Bs4qRtjTueP2QKheX/JS"
    "/UPtqT6pf4OJrOum8BHfn3CR3t/wVo9hH+JYWkYaneH4QiCjzhMUJ+dzDG2XCa7IDSa4Il"
    "dOcPhox0rk/YWy09OnTjih7M1nk7pQtsuOahLJZlr/V7BX2CG6LUtpt+LPC/ceKwV7LaQw"
    "VTHJAyVRq/QFVJhKL4QrCE6j1Vx4g4cuUELeliRNw/+8ED6gZTgLSKWqIimK8UL4BWN4by"
    "fnr2Fm3GPzkgjAJ+/C2eNduIC/VVnSsfRF5AR45s3JEPGFcIN/1zyIyd+mquH5dWnHqCJY"
    "/ukk5Yenv6J0LNQYQJ+MAfQxpDoG0Edtb9d22xKd7/F0p4MU5nTwa/aeh9ihxcnejnI6CL"
    "geWs7CR9Qp7cOT7X82WyICwH1DTvM+A4QdG4Jfw+iha7KHEe8fcMMnx3ggb/d0zyGg3li3"
    "Jawvg7vqc+kZqf5ZY9Cb5vqVcHp1/e65pDXtib62Zi1Zxp6FLCq6qamGoZnixqwtf1Rn31"
    "5e/wwmbg56Tslf6K24J6s37NiQifc/tXmen9aUrVdgQzYiQ9ZwIYvzen0kXevS4KJc/ygX"
    "jkwemv3RQ9x6z7TofUWuD2PeOcF0aSet8GVljtjUhRPOu7i8Fgpt1jxI2Gi+qQ4G4rqWyd"
    "tX5B37Jh9sQc4aJ/cK9MAip6/QEmFgFy63WpAzatIkmurlx7eMq2LbkLQOtOyUqG240DK/"
    "Qby1TrTMImYlWT9A10hPBMfCO4ylqxokmQw/PZGPMo1V3/Lg6dVyjhohHcjwPRppyJIbxX"
    "6bBKkregYA+82UpkBpDZYIHQ1N34UKC8cDprpvKmlHREFwwtXCS50p4UssUAdrGiz8UEiP"
    "HFgfM5Dd4CIt1NBkmZyxY3v5RL1Fjyqw4FxDXffV9Brwwypiw2MceIwDj5HB3LgxDjxqu5"
    "G2N2ectw455AV7bydUPIm7MReyl7BDZqG0Br4k2j/0XCtj2ArYTN8OkWSebO8UmeL837lo"
    "4BAFsRvk2oaBSoJDxHunYNBB8GbWim4ZE450/8hXODUDnO8Mgm1nPEd0uMgPb+YH8dSBn8"
    "jbXLd0SMvkhtYgTfOg9VAWZGiG9nGo7Bi4dYa1A+Ss5DBBz6IkfYM+vAgeVh0wVj/QyGt9"
    "HC8/dtIkmreeHSDGnIrXNqrHhrmyWCxLkdwS29t+ARrhy505wsYGSdzO9D0Ib5mqm8b58v"
    "E3081HEZlvgtCZ45IzSGS7uPVBZJD9lE1zq0i0064E+DXpUKBLDXqYfQId+AHps5Am8Yus"
    "y09sen+tnrGn2RiCy4E7BmXGENyo7SoqZh27qoKNeXhGVfP6Y2anyRwB4TQrFsF3S+pF8P"
    "+bcoEOfsDxsFPM5QKdCN0FcYIiaiMfMNMsNalAk6or0KRSBVoPjNj9nofJtwGzcINwKv51"
    "dnbWaW6rTeqh1Op6KFUuwg3uK/7+VqX3rMweau+78VWyXcNZBbMkWMRn8LWcbaIQiuDbyz"
    "v7aQcpsV8nyTuwtMqSvT8a7OOwP96WrjepgS3u2EwNrM6njU8dvCU9TPHy7vCOIdiSc+Fd"
    "oPfMS249UqB7PjA+SY/qdl0aj5/+InMZW4F4M50v25q5PPmejN0mqlk7+hphs2A0d16anp"
    "yNS+MI7Vqh5mT6Z7WzPTvXZ8bmGFXQ5sXwddTquTtUd9QsbpMHu3V71HeUf51G8F5urvt0"
    "of+WTrQtDVRz829IHVRpGPV64YcnnGAr8+mkLrzK0PV2jafmA4kNY6iZEI2bUnajikxEju"
    "kD645EMqtinnQiVEVlKYeRPQuaOcnZdEkMFPq71kX60+Y1lgjsS41MM8qc1CzwcwsjrfR0"
    "54zhmd+fN6dH0HEefGZKEonNyi6Z5hIxpCoT+ev7VyCSm6tDkEViB8O50llv2sqo7lr12J"
    "8kO2cpuc6EF4J4Cr36vqCx3H6M8Y5RvzHGO2q727kVxIxq4+8zIkcMM361ueEWdrOhjTxN"
    "x9VfCG44n4eLiTDHjvFEwNITIU7CieCEC+/s7GwY0d7N/kYAbKGCkuDxFIH+cmerGPbdbY"
    "ZYVsScquOUNSX+QZVzSppoQSmK42mFzzffdQo2FCItLXWxUzhz/4d8F2yVltGyVKz3LAlr"
    "CVq6Anaq42gvBPE51dnzh0d3IkjPQVfPk/ABLeKJID/HT9Tmr47P0346bg2IxblPtfBZbC"
    "+EN1gNHz+8up0Iv/7+8g1xxKKJ8P63i1tQxofbm47K2H9/v0EQmQ9WNTnAxudPPF2bc5g3"
    "qdt1bz+8e9MWb3jToAnbYaw4Y9+XXqb6IHvg9p2eOgjSm5X4C4riynMVtqzijOzRsD+Rzs"
    "QzcbuRKqsmDXMNZkGh7PqA1/ulrkd9Xm5gjepzWfFSoDxbYSYCbckt/P0ss2+evRCeESLD"
    "s2/DzJ1nsciSxrYRzDO5AbSoLx15Tov16UkBugd1RabnKiPpvJT54GejOEmQyrRVdT4k7T"
    "S0WU6zHFqT3EihLRAnO7WFa97uAmWuOSu/zo0YmpXmQ6quWGjVT9jiLhJ+v3jzutApBl8B"
    "MiqOrtFv9i3YQy1VoDidr/GLz/9mezZ9O3u05zOBJHA87qJEaDsqomdicNMVxR5QeTeyTE"
    "gvjmdKqchjjwXKg/AisYyCuR098j9fBxTCyMO3NRLcx+RH3gwaw+Fj8mPUdm3yY7C9/5rH"
    "TvbW+u+wTuT3GpcdDNJFi4KL9fZCAs5ljtgf0FnFwWIdEKv3JDcZJuH03fvrNxfvfz9/f/"
    "XfH6/fX706v/z44frt1YcP5zfvbq9v3l687pQ3aqKjag2VzxfKjLnWriIjeDxfsVElMnUW"
    "i40n+nYN889Fdvsl4KtPGyqI9R44zDXSVYB+ZvpNV5+6jfsQJw3RDsRtVvtMoneg6Xnpmq"
    "sxvq1mCKc0J3oOydDUrxxI5ViE/lwFETZA8drdKnJYEhxSnQ18Ib/ORvPhoEts+DiF9h+y"
    "ZNC+lsIniCE+mwjPSG702R/DDB6G5EfZs9aKKwk+EcUp0NjXEknRf5XibgiOQ1VZLuRS0t"
    "i2Yp2N2KFKB0qbuMj1GVjih2lAtBeZ5IxMySSkYrrT4EUvPTdWc6CEx/RMGOuKfvo6k2jX"
    "UX/HmA1TyDmbYcfv/1AUVudha60r/gWO2PClSUgeA0x7Y0BMVfcL/XWzWkOqsIxfTnvn0q"
    "hqNqqhqo5jnjHHC7ZaAotyT2MFtKAVcto0eXOKYW4FBMKbDc8kadCMfUwwsKlRQtulZHK7"
    "K/IgayS2jrwVgaQLN4Iv3btZaGgSKfmwjYLmdN9OMwZDKr9ukR0r7m5MVyNeJvpyfZGffn"
    "2PZnaFg9Sgy9L3V6317ZB5xvcIrvFyZgfzE052kf14UpdTjMjAqbsZ2aTIyqJmmiOBwUBr"
    "hjx9W5FVI6Gxd/qY1xozHWNea9T2XrT9FfszqBPxuizZe8aF2sm6rBhwgBvsI5oyUFqqPQ"
    "9XvHPVXyE3mNuzCt9zI1R8uKjU2Vr62NYSu1uDtSS8e30rpKEAS3L9nf2OV1cvr99cvD5V"
    "9IlkFnzEjYlbCnQ+de4vA+vAub+Md90G7YLY8UrTSKUA1+POfLV1PQFp/0Z6v3VBe/+0X+"
    "xoPeDvn0bIDbFd3sqo5coOsS2J6dGV3HHrnIZe2pLkMSyD37o9yQd6wfeb6z1d6Ju2JeHO"
    "wyG1J1nr5HUwD5ITjvec+3xS5z6nP3W2GdrAf2Z1YOka7KKm5XF8Zv7AdTOSTRONtAGJrk"
    "G7kAqZtHGzB+Fgw0J+hbf9iZjy8CG7eo+dNUYnfHTLRid81HYHbacLalnPFdnh9fg67R7Z"
    "9aZbi25Ie/D1sEqK/WDxzMl20BYec15wWF4zrZiiwGkGZIUME7J21Rv+kdxm146iAC8hXQ"
    "AvyfaDOZfGkJk2qa2rG+ScCRI26h32VdwR87zggACnzejYg397B3kMVBw0UDGQGsu8S13t"
    "v2U+93YHLvP323pw1V505cDyQdtsbHu9eBGfznCkgtOelUOO+dLRVRuN99FVG7U95ku5Js"
    "SYL+3F82N3a5Ivff/bhUAqD4aQNV2iKAjbbP2ZQP+pJBZaTdVNGpNIu2BrlmzRPtd4mmrn"
    "iniuaud601m+Zyr6HP+SYDkLeIUBtdM6Lzisqc2S+DQRil5hPmO0z8Rz+Uw7V/F/xtnudW"
    "jp1JbEidx4ZmNTPkqm1dG26q06L7mHrfpwk96HwzE1y3XYMzt2xvvJbdRo4XXSNCs3aD3L"
    "ipgubj+0nv9aIhesaMpT5phktWspT3xAETTLpGFKyV9zqrL1ta/gMPDAO8PNkR4Q2uvDM/"
    "hstt6Rf3oHPmYd6+pN4J0Oe7QaOBtWpath8ehVqMvZdiXB3vmDuaDgsPmDq0Vn3Dmi/SNv"
    "IeWJID8mRI7H3Fw5m1tuydssS/Z+biOHOejYNBXhDY+0yQBYxr09ZbNwuScLe2PCZnkC5u"
    "iaH65uhbcfX7+u42uyDUiyksIdC0YLZYzfH3X2oDWiuXnMS5MW5nlNlrQ4skmOlDtxaSE7"
    "L1O6ZTiXq8pYBXV01U+c8HxuPLRTteMYj6Czv/Th2r4mrzcxhLHH6phbzZsvY7ZtzK2O2h"
    "5zq2Nu9VAxcsZKsCRPomxD2iVHUTadV5Ao7d4Np2NVKiR6KVzcKb49lpe/whHbrcJxYlzf"
    "mzaRUpFHjj+G4AcgzLZd7TTbm7Q+lKpbH0ol7Geh+zBtneAuSPWf5bY0UUqnMkkOnJJmT7"
    "01VVtyetTWrx5LXnPaAS0dNKVGwv8X734XTv9tf6uFJE7UxotF9NWe0se90yrNEx9QwsVU"
    "HAPcOMsYIhFmQHSBvQanmWk+sgUGxRbYa/eIwh5BOjpCVsLQfnDKQBgFdwF0w+2qde4FBq"
    "Z+TbH89Mnmc0XAaMgxSki3XVP0YV0gxyWBxO773pObHxHyEJp3CjsURAc2J0xPhVM/dA/9"
    "2AvAhvSDfxzC121rVXHlB2RWZawhePZlK6sG6sGKst1khZfKjlBzpAcENN5dERQ1qhoLNF"
    "1Yi4+aSdtxOJbRW+DhabfDYu3WgZMq6DbQhc1Sluwfd2YqDxz3oVPkOCE1OD0JUNs243cj"
    "yclNImlydSRNfmKF1BygmxCHMMCmCI3VHbfhmUSHhpnNOTeMVrIi/YcqWZYEXklU2hP9eH"
    "HKGlIQAaoMbGs20EV6naeCa1PWDzuT2nZnq2qYtyPfp22zvKdHvToo4ec2shex7VbxfdiP"
    "J3V0n6QwsAHbhzUdKhg+vCHb+xd8OvGjcM4mf5PsbBbCx0mtqRJRh+GEjFSdkaqTNxhG8s"
    "ZI1Rm1zdd2D6GEfa2PJ4P3YovbWVOEi3LHc66qkxCEgCOSTNTwiE9JzSFwNRO57uS3HkDW"
    "FRtaL2qKPkiQnyS7jB9W39DJegrgLlDyNYwe2kxWRuSIsRZiqqPVnB9u8TWJJKM7rbj7D7"
    "F8Z0FDdnMbWtAQ2wA78R4z8SOCTXxdnzZbqUd7J7Lj/tG+s8lJ8G6rk7VzQj3nHn62Y0DY"
    "NyAuq3RaLnS1Aaq6WokqfFRGFTqutgU1lRkEpmxL1sYEu0Mj6xCeLV4FHF5LpMvgrjLqUp"
    "TsvzhWUWx6EDy89tvFuy1ZVhRDFhXd1FTD0ExxE5opf1QXo7m8/hnCNDkFlNm7FDzwbvGy"
    "O1+2dd854gOjvbDK+JFpL+sqmVbxzJxM/49VKQKfldZcvzpeUilnlIc8AuEt+qsC0XR873"
    "l9zYJUp+6iUii+/aNw9c/b3FNQOhZ68yS8vnn7czq8eFb0YPpHf4xR9Ouje8JJkaQfTerS"
    "I3ivj6YP61ENciNZsZjw6+8vhU1iyXGlymRJI5km2ZM0ITImQDqtBGMCpLsGvqfddUyA/E"
    "jaHl6tcvd0CL88GVismisCM0qyrKaVhTkXUW3SQkmtbqGkllooUfC6xo8y6UHwzljchxY7"
    "eoJBUWxYT0nhHY2zFOCmNtLQAqLxypkHSbdtoyg7MK9bVzxxEx/9gb3uCH0J0NeO1UQ50Y"
    "EpWCMFDbqpmKOCsZaidoGVglT/oRVGmypybOH6lXDqoWWEXLiBiYB9WmFz02vrpad+A8Xb"
    "aGN+8WT7D8UUwN9ny5j9G2ER+hdykyn2UWNeN8Xq0FdJsHfgddmTSS7a21TM6mj30wn2Fg"
    "/LVy0mKIKq44dHl7vW1FRdlEV7h95wZNIdV4SqOc2x1lEs3YBDIzTZloTGEd1C05hmXWPq"
    "2saUu54DHSV6xJB6rbKpRbneUdd0Ut7tgBlMG/UYpigJp9cfbgRF0vXnkmDPlvf2c7mTx9"
    "dkraleakorTRBPbdeNkBckvITrZRjOkL2oCEQWZQvYO1j4UL5IZaBX16FPkqbKBH6SllLh"
    "YBpIb8NqZGlpNYcpiu0KCbgJwJub17l16PK6uNB8fHN5hR+HAgepvOcG3k7UDUa892eAhs"
    "hV0uIg87uFU3yPrh1550s7jpdhlJx7UfAFWwqzwEWLGHV7IPbuMuK7pInu1gzcsuSgVAF5"
    "cuHDLxeypgu78nL3T07IwJvZcaJ2w30jOjjgyUKEoIrMV0m3PF0XSem6aZADs8i5og7p8W"
    "ai1FTVHL9jYLCJSVptkZYI0/grp+SPFlrJCQ1LH5ZHiOliQ57pEewfCDFMQ3/qBFHCWXPq"
    "j6rPCe54Zv1+2QTk0HWNtsU55Pn1eAXwo3CRTFfRrOXKkZMb1DTVHR1PU8vQwYOSdGjhJq"
    "uG8CZYXN9AOtqDdkKabzYMCRX2TU1rsnFqWvXOCZ+V1AD8gA5aYMUGpQRTdN2npYQYzfDV"
    "2uogL9W7CnRZhY55ChS25NQhIWi3JrvekFWAoXPv8RdO48eFO90t1VN1rYGw4S3VJ21LRO"
    "pquWTZ0oaXCNrA2KGyjifb+xNSBfz+au90vYmNX8wMMDa+XvtcdMrY8K8wsMRNlWp0WYI4"
    "s2z96P0hUyWiKAo5TPTqAHdZcrDPoWYpEmldoQ0z8j0QJuhvlDLCIYL+tiGTVPNAM8JJEx"
    "Yom/OpIH3yhmzneI7MzsnI7By5fiOzc9T2dm134BQMnsvZKY54mNNG3ehxCY/EMgq+QGzw"
    "AXHOjqjrH1hxgf77MGiyDXA7rp4WJxkWRAYs1W56CGZOAZrUJJuKR1UqgHzWooXAdm+/n3"
    "YC+Na8e7qG1nQTGB6J1rFnKYqFXaOu9wUjNaDmF6qvWbT5BckHmb+hANYZOIARUkbkTWv3"
    "2Hm3xsb2XZs1ZD28d9eM9ho1HAMNJjJou4Sx0rLhaE6ofyYj71xWnZbK9VUkSsgoSfCFsx"
    "ZsJ7GkckcksGzsjRr+iu67cKqEpzRcbQ/HUxlIrOACRYF7f8KJFaw/mdTFCuxszLZYQbVd"
    "PsYCjh4L+IKimHuqePUGxIj0bLY2R/EIe8+S03uixula8npNPBEAD0RSXSTcduz/9eHmbR"
    "U/dSNSAPLjAv/AT17gJhNhFsTJH8OEtQZF+NX1oehi1HmSjybABXoPRX/7fxNg2LQ="
)
