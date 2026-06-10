
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Conversation(Base):

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)

    messages = relationship("Message", back_populates="conversation")


class Message(Base):

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id")
    )

    role = Column(String)

    content = Column(String)

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )

