from conversation_store.utils import get_chat_history_store


def update_costs(user_id: str, chat_id: str, tokens: int, model_id: str, message_type: str) -> None:
    chat_history_store = get_chat_history_store()
    chat_history_store.update_cost(
        user_id=user_id,
        chat_id=chat_id,
        tokens=tokens,
        model_id=model_id,
        message_type=message_type,
    )
