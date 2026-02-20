from django.urls import path
from . import views

urlpatterns = [
    # Main chat
    path("conversations/main", views.create_main_conversation, name="create-main"),
    path("chat/main/<uuid:conversation_id>/message", views.send_main_message, name="send-main-message"),
    path("chat/main/<uuid:conversation_id>", views.get_main_conversation, name="get-main"),

    # Side chat
    path("chat/side", views.create_side_chat, name="create-side"),
    path("chat/side/<uuid:side_conversation_id>/message", views.send_side_message, name="send-side-message"),
    path("chat/side/<uuid:side_conversation_id>/close", views.close_side_chat, name="close-side"),
    path("chat/side/<uuid:side_conversation_id>", views.get_side_conversation, name="get-side"),
]
