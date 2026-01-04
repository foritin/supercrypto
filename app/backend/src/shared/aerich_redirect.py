from falib.adapter.postgresql import get_async_postgresql_adapter

postgresql_adapter = get_async_postgresql_adapter()

TORTOISE_ORM = get_async_postgresql_adapter().get_config()
