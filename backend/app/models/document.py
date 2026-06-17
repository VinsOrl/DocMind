from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # File info
    original_name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer)

    # Processing info
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    status = Column(
        Enum("pending", "processing", "ready", "failed", name="doc_status"),
        default="pending",
    )
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="documents")
    sessions = relationship(
        "ChatSession", back_populates="document", cascade="all, delete"
    )
