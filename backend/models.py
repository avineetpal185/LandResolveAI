
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime
from datetime import datetime

from database import Base

import uuid;

class User(Base):

    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)

    google_id = Column(String, unique=True)

    email = Column(String, unique=True)

    memories = relationship("Memory")

    name = Column(String)

    picture = Column(String)


class Conversation(Base):

    __tablename__ = "conversations"

    id = Column(
    String,
    primary_key=True,
    index=True,
    default=lambda: str(uuid.uuid4())
    )

    title = Column(String)

    created_at = Column(
    DateTime,
    default=datetime.utcnow
    )

    user_id = Column(
        String,
        ForeignKey("users.id")
    )

    messages = relationship(
        "Message",
        back_populates="conversation"
    )

    user = relationship("User")

import uuid

class Message(Base):

    __tablename__ = "messages"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4())
    )

    conversation_id = Column(
        String,
        ForeignKey("conversations.id")
    )

    role = Column(String)

    content = Column(String)

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )

class UserMemory(Base):

    __tablename__ = "user_memories"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4())
    )

    user_id = Column(
        String,
        ForeignKey("users.id")
    )

    memory = Column(String)

class Memory(Base):
    __tablename__ = "memories"

    id = Column(String, primary_key=True, index=True)

    user_id = Column(String, ForeignKey("users.id"))

    memory_text = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")