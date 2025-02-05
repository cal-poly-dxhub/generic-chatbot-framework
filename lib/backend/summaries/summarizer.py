from langgraph.graph import END, START, StateGraph, MessagesState
from langchain_core.messages import HumanMessage, AIMessage, RemoveMessage, AnyMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_aws import ChatBedrock
from conversation_store.base import ChatMessage
from typing import Iterable, Literal, Optional
from langgraph.checkpoint.memory import MemorySaver


class SummarizerState(MessagesState):
    summary: str


class Summarizer:
    def __init__(self, model_id, window_size, window_overlap_size):
        self.model = ChatBedrock(model=model_id)
        self.window_size = window_size
        self.window_overlap_size = window_overlap_size
        self.recursive_prompt = lambda summary: (
            f"This is a play-by-play summary of the conversation so far: {summary}.\n\n",
            "Extend the summary by taking into account the new messages above. "
            "Be sure to return a summary of the whole conversation, not just the "
            "new messages. Use bullet points, being sure to add new bullet points to ",
            "reflect these new messages.",
        )
        self.base_prompt: str = str(
            "Create a play-by-play summary of the conversation above, explaining what the user "
            "said and what the AI said. Use simple bullet points, and keep the summary "
            "to a few points.",
        )

    def _map_to_langchain(self, message: ChatMessage) -> Optional[AnyMessage]:
        match message.messageType:
            case "human":
                return HumanMessage(
                    id=message.messageId,
                    content=message.content,
                )
            case "ai":
                return AIMessage(
                    id=message.messageId,
                    content=message.content,
                )
            case _:
                # TODO: logging
                print(f"Unknown message type: {message.messageType}; skipping message")
                return None

    def _langchain_messages_iter(self, messages: Iterable[ChatMessage]) -> Iterable[AnyMessage]:
        for message in messages:
            if langchain_message := self._map_to_langchain(message):
                yield langchain_message

    def summarize(self, francis_messages: list[ChatMessage]) -> str:
        workflow = StateGraph(SummarizerState)
        workflow.add_node("summarize_conversation", self._lc_summarize_conversation)
        workflow.add_conditional_edges(START, self._lc_should_summarize)
        workflow.add_conditional_edges("summarize_conversation", self._lc_should_summarize)

        langchain_messages = list(self._langchain_messages_iter(francis_messages))

        # TODO: list and iter
        start_state = SummarizerState(messages=langchain_messages, summary="")
        memory = MemorySaver()
        summary = workflow.compile(checkpointer=memory)
        config = RunnableConfig(configurable={"thread_id": "42"})

        for _ in summary.stream(start_state, config=config, stream_mode="values"):
            # No-op, just need to iterate through the stream for the summary state at the end
            pass

        snap = summary.get_state(config=config)
        return snap.values["summary"]

    def _lc_should_summarize(self, state: SummarizerState) -> Literal["summarize_conversation", END]:  # type: ignore
        return "summarize_conversation" if len(state["messages"]) > 0 else END

    def _lc_summarize_conversation(self, state: SummarizerState) -> dict:
        if summary := state.get("summary", ""):
            summary_prompt: str = str(self.recursive_prompt(summary))
        else:
            summary_prompt: str = self.base_prompt

        # TODO: can a chat begin with an AI message?

        # LangGraph requires that the first message in a conversation is a human message;
        # find the index of the next human message.
        found_human_message = False
        index_next_human_message = self.window_size
        while index_next_human_message < len(state["messages"]):
            if isinstance(state["messages"][index_next_human_message], HumanMessage):
                found_human_message = True
                break
            index_next_human_message += 1

        # If possible, extend the window so that the next window starts with a human message.
        # If there are no more human messages extend the window until the end.
        if found_human_message:
            window = state["messages"][:index_next_human_message]
        else:
            window = state["messages"]

        window = window + [HumanMessage(content=summary_prompt)]

        # TODO: what to do when the message doesn't have an ID?
        delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][: (self.window_size - self.window_overlap_size)]]

        response = self.model.invoke(window)

        return {"summary": response.content, "messages": delete_messages}
