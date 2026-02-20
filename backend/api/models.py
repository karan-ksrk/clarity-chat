import uuid
from django.db import models


class Conversation(models.Model):
    class Type(models.TextChoices):
        MAIN = "MAIN", "Main"
        SIDE = "SIDE", "Side"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=4, choices=Type.choices)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="side_chats",
    )
    main_topic = models.TextField()
    highlighted_text = models.TextField(null=True, blank=True)
    surrounding_context = models.TextField(null=True, blank=True)
    user_question = models.TextField(null=True, blank=True)
    user_level = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(type="MAIN", parent__isnull=True) |
                    models.Q(type="SIDE", parent__isnull=False)
                ),
                name="valid_parent",
            ),
        ]

    def __str__(self):
        return f"{self.type} – {self.main_topic[:40]}"


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:60]}"
