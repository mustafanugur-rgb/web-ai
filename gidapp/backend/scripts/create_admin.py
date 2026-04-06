"""
Create an ADMIN user (run once). From `backend` folder:

  set PYTHONPATH=.
  python scripts/create_admin.py you@example.com yourpassword
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.models.enums import UserRole
from app.security import hash_password


async def main():
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.create_admin <email> <password>")
        sys.exit(1)
    email, password = sys.argv[1].lower(), sys.argv[2]
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": UserRole.ADMIN.value, "hashed_password": hash_password(password)}},
        )
        print("Updated existing user to ADMIN.")
    else:
        from datetime import datetime, timezone

        await db.users.insert_one(
            {
                "email": email,
                "hashed_password": hash_password(password),
                "role": UserRole.ADMIN.value,
                "created_at": datetime.now(timezone.utc),
            }
        )
        print("Created ADMIN user.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
