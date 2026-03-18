"""Initialize database with seed data."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from sqlalchemy import text
from models.database import engine, async_session, Base
from models.user import User
from models.query_log import QueryLog
from models.knowledge import KnowledgeDocument, Feedback
from services.auth_service import hash_password


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")


async def seed_users():
    async with async_session() as db:
        # Check if users already exist
        result = await db.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        if count > 0:
            print(f"Users table already has {count} records. Skipping seed.")
            return

        # Default password for all seed users (change after first login!)
        default_password = hash_password("vihat@2026")

        users = [
            User(
                name="Admin ViHAT",
                email="admin@vihat.vn",
                department="management",
                role="super_admin",
                password_hash=default_password,
                knowledge_access=["sales", "hr", "accounting", "general", "management"],
            ),
            User(
                name="Sales Lead",
                email="sales.lead@vihat.vn",
                department="sales",
                role="lead",
                password_hash=default_password,
                knowledge_access=["sales", "general"],
            ),
            User(
                name="HR Admin",
                email="hr.admin@vihat.vn",
                department="hr",
                role="admin",
                password_hash=default_password,
                knowledge_access=["hr", "general"],
            ),
            User(
                name="Kế toán trưởng",
                email="accounting@vihat.vn",
                department="accounting",
                role="admin",
                password_hash=default_password,
                knowledge_access=["accounting", "general"],
            ),
        ]

        for user in users:
            db.add(user)

        await db.commit()
        print(f"Seeded {len(users)} users with default password: vihat@2026")
        print("⚠️  Please change passwords after first login!")


async def main():
    print("Setting up database...")
    await create_tables()
    await seed_users()
    print("Database setup complete.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
