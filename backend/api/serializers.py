from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "conversation_id", "role", "content", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    parent_id = serializers.UUIDField(source="parent_id", read_only=True, allow_null=True)

    class Meta:
        model = Conversation
        fields = [
            "id", "type", "parent_id", "main_topic",
            "highlighted_text", "surrounding_context",
            "user_question", "user_level", "status",
            "created_at", "updated_at",
        ]


# ── Request serializers ──────────────────────────────────────


class CreateMainRequestSerializer(serializers.Serializer):
    main_topic = serializers.CharField()


class SendMessageRequestSerializer(serializers.Serializer):
    message = serializers.CharField()


class CreateSideRequestSerializer(serializers.Serializer):
    main_conversation_id = serializers.UUIDField()
    highlighted_text = serializers.CharField()
    surrounding_context = serializers.CharField(required=False, default="")
    user_question = serializers.CharField()
    user_level = serializers.CharField(required=False, default="beginner")
