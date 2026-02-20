"""
LLM Gateway — abstraction over the AI provider (OpenAI-compatible API).
"""

from django.conf import settings
from openai import OpenAI


_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
    return _client


def chat_completion(messages: list[dict]) -> str:
    """
    Send messages to the LLM and return the assistant's reply.
    Each message is {"role": str, "content": str}.
    """
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content or "I apologize, I could not generate a response."
