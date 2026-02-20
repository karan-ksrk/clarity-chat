"""
Service layer — all business logic lives here.
Views are thin; services are fat.
"""

from .models import Conversation, Message
from .prompts import build_main_system_prompt, build_side_system_prompt
from .llm_gateway import chat_completion


# ── Main Chat ────────────────────────────────────────────────


def create_main_conversation(main_topic: str) -> Conversation:
    """Create a new MAIN conversation and store the system prompt."""
    conversation = Conversation.objects.create(
        type=Conversation.Type.MAIN,
        main_topic=main_topic,
    )
    system_prompt = build_main_system_prompt(main_topic)
    Message.objects.create(
        conversation=conversation,
        role=Message.Role.SYSTEM,
        content=system_prompt,
    )
    return conversation


def send_main_message(conversation_id: str, user_message: str) -> Message:
    """Append a user message to a MAIN conversation, call LLM, store reply."""
    conversation = Conversation.objects.get(
        id=conversation_id, type=Conversation.Type.MAIN
    )
    if conversation.status == Conversation.Status.CLOSED:
        raise ValueError("Conversation is closed")

    # Store user message
    Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=user_message,
    )

    # Build LLM context from full history
    history = list(
        conversation.messages.values_list("role", "content").order_by("created_at")
    )
    llm_messages = [{"role": r, "content": c} for r, c in history]

    assistant_content = chat_completion(llm_messages)

    assistant_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=assistant_content,
    )
    return assistant_msg


def get_main_conversation(conversation_id: str):
    """Return a MAIN conversation with all its messages."""
    conversation = Conversation.objects.get(
        id=conversation_id, type=Conversation.Type.MAIN
    )
    messages = list(conversation.messages.order_by("created_at"))
    return conversation, messages


# ── Side Chat ────────────────────────────────────────────────


def create_side_chat(
    main_conversation_id: str,
    highlighted_text: str,
    user_question: str,
    surrounding_context: str = "",
    user_level: str = "beginner",
) -> tuple[Conversation, str]:
    """
    Create a SIDE conversation, call LLM for the initial explanation,
    and return (conversation, explanation).
    """
    main_conv = Conversation.objects.get(
        id=main_conversation_id, type=Conversation.Type.MAIN
    )

    side_conv = Conversation.objects.create(
        type=Conversation.Type.SIDE,
        parent=main_conv,
        main_topic=main_conv.main_topic,
        highlighted_text=highlighted_text,
        surrounding_context=surrounding_context,
        user_question=user_question,
        user_level=user_level,
    )

    system_prompt = build_side_system_prompt(
        main_conv.main_topic,
        highlighted_text,
        surrounding_context,
        user_question,
        user_level,
    )

    # Store system + user messages
    Message.objects.create(
        conversation=side_conv, role=Message.Role.SYSTEM, content=system_prompt
    )
    Message.objects.create(
        conversation=side_conv, role=Message.Role.USER, content=user_question
    )

    # Get LLM response
    explanation = chat_completion(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_question},
        ]
    )

    Message.objects.create(
        conversation=side_conv, role=Message.Role.ASSISTANT, content=explanation
    )

    return side_conv, explanation


def send_side_message(side_conversation_id: str, user_message: str) -> Message:
    """Send a follow-up message in an existing SIDE conversation."""
    conversation = Conversation.objects.get(
        id=side_conversation_id, type=Conversation.Type.SIDE
    )
    if conversation.status == Conversation.Status.CLOSED:
        raise ValueError("Side conversation is closed")

    Message.objects.create(
        conversation=conversation, role=Message.Role.USER, content=user_message
    )

    history = list(
        conversation.messages.values_list("role", "content").order_by("created_at")
    )
    llm_messages = [{"role": r, "content": c} for r, c in history]

    assistant_content = chat_completion(llm_messages)

    assistant_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=assistant_content,
    )
    return assistant_msg


def close_side_chat(side_conversation_id: str) -> Conversation:
    """Mark a SIDE conversation as closed."""
    conversation = Conversation.objects.get(
        id=side_conversation_id, type=Conversation.Type.SIDE
    )
    conversation.status = Conversation.Status.CLOSED
    conversation.save(update_fields=["status", "updated_at"])
    return conversation


def get_side_conversation(side_conversation_id: str):
    """Return a SIDE conversation with all its messages."""
    conversation = Conversation.objects.get(
        id=side_conversation_id, type=Conversation.Type.SIDE
    )
    messages = list(conversation.messages.order_by("created_at"))
    return conversation, messages
