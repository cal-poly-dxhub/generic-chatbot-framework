# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import uuid
from typing import Any, Dict, List, Optional, Tuple, Union

import sqlalchemy
from francis_toolkit.utils import get_timestamp
from sqlalchemy import Column, Index, String, Enum, asc, desc, Integer
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import sessionmaker, mapped_column

try:
    from sqlalchemy.orm import declarative_base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base

from ..base import BaseChatHistoryStore, Chat, ChatMessage, ChatMessageSource

Base = declarative_base()  # type: Any


class ChatEntity(Base):
    __tablename__ = "chats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False)
    chat_title = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    handoff_requests = mapped_column(Integer, nullable=False, default=0)
    handoff_object = mapped_column(String, nullable=True)

    __table_args__ = (
        Index(
            "chat_idx_user_id",
            user_id,
        ),
    )


class MessageEntity(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_type = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    chat_id = Column(
        UUID(as_uuid=True),
        sqlalchemy.ForeignKey(
            f"{ChatEntity.__tablename__}.id",
            ondelete="CASCADE",
        ),
    )
    content = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    tokens: Mapped[Optional[int]] = mapped_column(sqlalchemy.Integer, nullable=True)
    thumb: Mapped[Optional[str]] = mapped_column(Enum("up", "down", name="thumb"), nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    __table_args__ = (Index("message_idx_user_id", user_id),)


class SourceEntity(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(
        UUID(as_uuid=True),
        sqlalchemy.ForeignKey(
            f"{MessageEntity.__tablename__}.id",
            ondelete="CASCADE",
        ),
    )
    page_content = Column(String, nullable=False)
    cmetadata = sqlalchemy.Column(JSONB, nullable=True)
    created_at = Column(String, nullable=False)

    __table_args__ = (Index("source_idx_message_id", message_id),)


Connection = Union[sqlalchemy.engine.Engine, str]


class PostgresChatHistoryStore(BaseChatHistoryStore):
    def __init__(self, *, connection: Connection, engine_args: Optional[dict[str, Any]] = None, create_tables: bool = True):
        if isinstance(connection, str):
            self._engine = sqlalchemy.create_engine(url=connection, **(engine_args or {}))
        elif isinstance(connection, sqlalchemy.engine.Engine):
            self._engine = connection
        else:
            raise ValueError("connection should be a connection string or an instance of " "sqlalchemy.engine.Engine")

        self._session_maker = sessionmaker(bind=self._engine)
        self.create_tables = create_tables

        self.__post_init__()

    def __post_init__(
        self,
    ) -> None:
        """Initialize the store."""
        if self.create_tables:
            self.create_tables_if_not_exists()

    def create_tables_if_not_exists(self) -> None:
        with self._session_maker() as session:
            Base.metadata.create_all(session.get_bind())

    def create_chat(self, user_id: str, chat_title: str) -> Chat:
        with self._session_maker() as session:
            now = str(get_timestamp())
            chat = ChatEntity(
                id=str(uuid.uuid4()),
                user_id=user_id,
                chat_title=chat_title,
                created_at=now,
                updated_at=now,
                handoff_requests=0,
                handoff_object=None,
            )
            session.add(chat)
            session.commit()
            return self._entity_to_chat(chat)

    def _entity_to_chat(self, entity: ChatEntity) -> Chat:
        return Chat(
            chatId=str(entity.id),
            userId=str(entity.user_id),
            title=str(entity.chat_title),
            createdAt=int(entity.created_at),
            updatedAt=int(entity.updated_at),
        )

    def increment_handoff_counter(self, user_id: str, chat_id: str) -> int:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")

            chat.handoff_requests += 1
            chat.updated_at = get_timestamp()
            session.commit()

            return chat.handoff_requests

    def populate_handoff(self, user_id: str, chat_id: str, handoff_object: str) -> None:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")

            chat.handoff_object = handoff_object
            chat.updated_at = get_timestamp()
            session.commit()

    def update_chat(self, user_id: str, chat_id: str, chat_title: str) -> Chat:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")
            chat.chat_title = chat_title  # type: ignore
            chat.updated_at = get_timestamp()
            session.commit()
            return self._entity_to_chat(chat)

    def delete_chat(self, user_id: str, chat_id: str) -> None:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")
            session.delete(chat)
            session.commit()

    def get_chat(self, user_id: str, chat_id: str) -> Chat:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")
            return self._entity_to_chat(chat)

    def list_chats(self, user_id: str) -> List[Chat]:
        with self._session_maker() as session:
            chats = session.query(ChatEntity).filter_by(user_id=user_id).order_by(desc(ChatEntity.created_at)).all()
            return [self._entity_to_chat(chat) for chat in chats]

    def create_chat_message(
        self,
        user_id: str,
        chat_id: str,
        message_type: str,
        content: str,
        tokens: int,
        sources: Optional[List[Dict[str, Any]]] = None,
    ) -> ChatMessage:
        now = str(get_timestamp())
        with self._session_maker() as session:
            message_entity = MessageEntity(
                id=str(uuid.uuid4()),
                message_type=message_type,
                user_id=user_id,
                chat_id=chat_id,
                content=content,
                tokens=tokens,
                created_at=now,
            )
            session.add(message_entity)

            message_sources = []
            for source in sources or []:
                source = SourceEntity(
                    id=str(uuid.uuid4()),
                    message_id=message_entity.id,
                    page_content=source.get("pageContent"),
                    cmetadata=source.get("metadata"),
                    created_at=now,
                )
                message_sources.append(self._entity_to_source(source))
                session.add(source)

            session.commit()

            message = self._entity_to_message(message_entity)
            message.sources = message_sources
            return message

    def delete_chat_message(self, user_id: str, message_id: str) -> None:
        with self._session_maker() as session:
            message = session.query(MessageEntity).filter_by(user_id=user_id, message_id=message_id).first()
            if not message:
                raise ValueError("Message not found")
            session.delete(message)
            session.commit()

    def update_feedback(self, user_id: str, message_id: str, thumb: Optional[str], feedback: Optional[str]) -> None:
        with self._session_maker() as session:
            message = session.query(MessageEntity).filter_by(user_id=user_id, id=message_id).first()
            if not message:
                raise ValueError("Message not found")
            message.thumb = thumb
            message.feedback = feedback
            message.updated_at = get_timestamp()
            session.commit()

    def _entity_to_message(self, entity: MessageEntity) -> ChatMessage:
        return ChatMessage(
            messageId=str(entity.id),
            messageType=str(entity.message_type),
            userId=str(entity.user_id),
            chatId=str(entity.chat_id),
            content=str(entity.content),
            createdAt=int(entity.created_at),
        )

    def _entity_to_source(self, entity: SourceEntity) -> ChatMessageSource:
        return ChatMessageSource(
            sourceId=str(entity.id),
            messageId=str(entity.message_id),
            pageContent=str(entity.page_content),
            metadata=entity.cmetadata,  # type: ignore
            createdAt=int(entity.created_at),
        )

    def _is_valid_token(self, token: Optional[str]) -> bool:
        if not isinstance(token, str):
            return False

        try:
            int(token)
            return True
        except ValueError:
            return False

    # NOTE: note to reviewer; this function was originally not implemented when token-counting
    # features were added. This is a "passthrough" function that allows the Postgres conversation
    # store to not explode.
    # Note that update_chat was implemented on the DynamoChatHistoryStore, but not on this class nor th
    # base class.
    def update_cost(self, user_id: str, chat_id: str, tokens: int, model_id: str, message_type: str) -> Chat:
        with self._session_maker() as session:
            chat = session.query(ChatEntity).filter_by(user_id=user_id, id=chat_id).first()
            if not chat:
                raise ValueError("Chat not found")
            chat.updated_at = get_timestamp()
            session.commit()
            return self._entity_to_chat(chat)

    def list_chat_messages(
        self,
        user_id: str,
        chat_id: str,
        next_token: Optional[str] = None,
        limit: int = 50,
        ascending: bool = True,
    ) -> Tuple[List[ChatMessage], Optional[str]]:
        with self._session_maker() as session:
            query = (
                session.query(MessageEntity)
                .filter_by(chat_id=chat_id, user_id=user_id)
                .order_by(asc(MessageEntity.created_at) if ascending else desc(MessageEntity.created_at))
            )

            if self._is_valid_token(next_token):
                if ascending:
                    query = query.filter(MessageEntity.created_at > next_token)
                else:
                    query = query.filter(MessageEntity.created_at < next_token)

            messages = query.limit(limit).all()

            next_token_value = None
            if len(messages) == limit:
                last_message = messages[-1]
                next_token_value = last_message.created_at

            return ([self._entity_to_message(message) for message in messages], next_token_value)  # type: ignore

    def list_chat_message_sources(self, user_id: str, message_id: str) -> List[ChatMessageSource]:
        with self._session_maker() as session:
            sources = (
                session.query(SourceEntity)
                .join(MessageEntity)
                .filter(MessageEntity.id == message_id, MessageEntity.user_id == user_id)
                .all()
            )
            return [self._entity_to_source(source) for source in sources]
