from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongodb_db]


async def create_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.restaurants.create_index("owner_id")
    await db.tables.create_index([("restaurant_id", 1), ("table_number", 1)], unique=True)
    await db.tables.create_index("qr_token", unique=True)
    await db.bills.create_index("restaurant_id")
    await db.bills.create_index("table_id")
    await db.bills.create_index("status")
    await db.reviews.create_index([("user_id", 1), ("restaurant_id", 1)])
    await db.platform_ledger.create_index("created_at")
