from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient | None= None
    sync_client: MongoClient | None = None


db = Database()


async def connect_db():
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.sync_client = MongoClient(settings.MONGODB_URL)
        
        await db.client.admin.command('ping')
        logger.info("✅ Connected to MongoDB")
        
    except Exception as e:
        logger.error(f" MongoDB connection failed: {e}")
        raise


async def disconnect_db():
    if db.client:
        db.client.close()
    if db.sync_client:
        db.sync_client.close()
    logger.info(" Disconnected from MongoDB")


def get_database():
    """Get async database instance"""
    return db.client[settings.DATABASE_NAME]


def get_sync_database():
    """Get sync database instance"""
    return db.sync_client[settings.DATABASE_NAME]


# Collection helpers
def get_collection(name: str):
    """Get async collection"""
    return get_database()[name]


def get_sync_collection(name: str):
    """Get sync collection"""
    return get_sync_database()[name]