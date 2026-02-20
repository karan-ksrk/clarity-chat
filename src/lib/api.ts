// API layer — points to Django backend when VITE_DJANGO_API_URL is set,
// otherwise falls back to Supabase Edge Functions.

const DJANGO_URL = import.meta.env.VITE_DJANGO_API_URL as string | undefined;

export interface Conversation {
  id: string;
  type: 'MAIN' | 'SIDE';
  parent_id: string | null;
  main_topic: string;
  highlighted_text: string | null;
  surrounding_context: string | null;
  user_question: string | null;
  user_level: string | null;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface CreateMainRequest {
  main_topic: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface CreateSideRequest {
  main_conversation_id: string;
  highlighted_text: string;
  surrounding_context?: string;
  user_question: string;
  user_level?: string;
}

// ── Helpers ──────────────────────────────────────────────────

async function djangoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DJANGO_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function supabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        ...(options.headers || {}),
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Main Chat APIs ──────────────────────────────────────────

export async function createMainConversation(mainTopic: string): Promise<{ conversation_id: string; main_topic: string }> {
  if (DJANGO_URL) {
    return djangoFetch('/conversations/main', {
      method: 'POST',
      body: JSON.stringify({ main_topic: mainTopic }),
    });
  }
  return supabaseFetch('/main-chat', {
    method: 'POST',
    body: JSON.stringify({ main_topic: mainTopic }),
  });
}

export async function sendMainMessage(conversationId: string, message: string): Promise<{ message_id: string; content: string; role: string }> {
  if (DJANGO_URL) {
    return djangoFetch(`/chat/main/${conversationId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  return supabaseFetch(`/main-chat/${conversationId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getMainConversation(conversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  if (DJANGO_URL) {
    return djangoFetch(`/chat/main/${conversationId}`);
  }
  return supabaseFetch(`/main-chat/${conversationId}`);
}

// ── Side Chat APIs ──────────────────────────────────────────

export async function createSideChat(request: CreateSideRequest): Promise<{
  side_conversation_id: string;
  main_topic: string;
  highlighted_text: string;
  explanation: string;
}> {
  if (DJANGO_URL) {
    return djangoFetch('/chat/side', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  return supabaseFetch('/side-chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function sendSideMessage(sideConversationId: string, message: string): Promise<{ message_id: string; content: string; role: string }> {
  if (DJANGO_URL) {
    return djangoFetch(`/chat/side/${sideConversationId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  return supabaseFetch(`/side-chat/${sideConversationId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function closeSideChat(sideConversationId: string): Promise<{ message: string; conversation_id: string }> {
  if (DJANGO_URL) {
    return djangoFetch(`/chat/side/${sideConversationId}/close`, {
      method: 'POST',
    });
  }
  return supabaseFetch(`/side-chat/${sideConversationId}/close`, {
    method: 'POST',
  });
}

export async function getSideConversation(sideConversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  if (DJANGO_URL) {
    return djangoFetch(`/chat/side/${sideConversationId}`);
  }
  return supabaseFetch(`/side-chat/${sideConversationId}`);
}
