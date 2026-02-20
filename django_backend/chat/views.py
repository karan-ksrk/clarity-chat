"""
Thin API views — delegate everything to the service layer.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import services
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    CreateMainRequestSerializer,
    SendMessageRequestSerializer,
    CreateSideRequestSerializer,
)


# ── Main Chat ────────────────────────────────────────────────


@api_view(["POST"])
def create_main_conversation(request):
    """POST /conversations/main"""
    ser = CreateMainRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    conv = services.create_main_conversation(ser.validated_data["main_topic"])
    return Response(
        {"conversation_id": str(conv.id), "main_topic": conv.main_topic},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def send_main_message(request, conversation_id):
    """POST /chat/main/{conversation_id}/message"""
    ser = SendMessageRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    try:
        msg = services.send_main_message(conversation_id, ser.validated_data["message"])
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(MessageSerializer(msg).data)


@api_view(["GET"])
def get_main_conversation(request, conversation_id):
    """GET /chat/main/{conversation_id}"""
    try:
        conv, messages = services.get_main_conversation(conversation_id)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "conversation": ConversationSerializer(conv).data,
        "messages": MessageSerializer(messages, many=True).data,
    })


# ── Side Chat ────────────────────────────────────────────────


@api_view(["POST"])
def create_side_chat(request):
    """POST /chat/side"""
    ser = CreateSideRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    d = ser.validated_data

    try:
        conv, explanation = services.create_side_chat(
            main_conversation_id=str(d["main_conversation_id"]),
            highlighted_text=d["highlighted_text"],
            user_question=d["user_question"],
            surrounding_context=d.get("surrounding_context", ""),
            user_level=d.get("user_level", "beginner"),
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "side_conversation_id": str(conv.id),
            "main_topic": conv.main_topic,
            "highlighted_text": conv.highlighted_text,
            "explanation": explanation,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def send_side_message(request, side_conversation_id):
    """POST /chat/side/{side_conversation_id}/message"""
    ser = SendMessageRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    try:
        msg = services.send_side_message(
            side_conversation_id, ser.validated_data["message"]
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(MessageSerializer(msg).data)


@api_view(["POST"])
def close_side_chat(request, side_conversation_id):
    """POST /chat/side/{side_conversation_id}/close"""
    try:
        conv = services.close_side_chat(side_conversation_id)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    return Response({"message": "Side conversation closed", "conversation_id": str(conv.id)})


@api_view(["GET"])
def get_side_conversation(request, side_conversation_id):
    """GET /chat/side/{side_conversation_id}"""
    try:
        conv, messages = services.get_side_conversation(side_conversation_id)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "conversation": ConversationSerializer(conv).data,
        "messages": MessageSerializer(messages, many=True).data,
    })
