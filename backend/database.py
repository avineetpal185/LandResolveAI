from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

#DATABASE_URL = os.getenv("postgresql://postgres.whkaqjbputtyvpoktkzb:avineet4185aps@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true")
DATABASE_URL = os.getenv("DATABASE_URL")
print("DATABASE_URL =", DATABASE_URL)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()