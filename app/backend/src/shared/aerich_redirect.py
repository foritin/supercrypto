from falib.adapter import get_postgresql_adapter

postgresql_adapter = get_postgresql_adapter()

TORTOISE_ORM = postgresql_adapter.get_config()
