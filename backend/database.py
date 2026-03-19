from motor.motor_asyncio import AsyncIOMotorClient
import os

client: AsyncIOMotorClient = None
db = None


def get_database():
    return db


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]


async def close_db():
    if client:
        client.close()
