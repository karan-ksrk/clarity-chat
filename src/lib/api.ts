import { supabase } from "@/integrations/supabase/client";

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

// Main Chat APIs
export async function createMainConversation(mainTopic: string): Promise<{ conversation_id: string; main_topic: string }> {
  const { data, error } = await supabase.functions.invoke('main-chat', {
    body: { main_topic: mainTopic }
  });
  
  if (error) throw new Error(error.message);
  return data;
}

export async function sendMainMessage(conversationId: string, message: string): Promise<{ message_id: string; content: string; role: string }> {
  const { data, error } = await supabase.functions.invoke('main-chat', {
    body: { conversation_id: conversationId, message },
    headers: {
      'x-custom-path': `/${conversationId}/message`
    }
  });
  
  // Edge function routing workaround - use fetch directly
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/main-chat/${conversationId}/message`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ message }),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send message');
  }
  
  return response.json();
}

export async function getMainConversation(conversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/main-chat/${conversationId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get conversation');
  }
  
  return response.json();
}

// Side Chat APIs
export async function createSideChat(request: CreateSideRequest): Promise<{
  side_conversation_id: string;
  main_topic: string;
  highlighted_text: string;
  explanation: string;
}> {
  const { data, error } = await supabase.functions.invoke('side-chat', {
    body: request
  });
  
  if (error) throw new Error(error.message);
  return data;
}

export async function sendSideMessage(sideConversationId: string, message: string): Promise<{ message_id: string; content: string; role: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/side-chat/${sideConversationId}/message`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ message }),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send message');
  }
  
  return response.json();
}

export async function closeSideChat(sideConversationId: string): Promise<{ message: string; conversation_id: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/side-chat/${sideConversationId}/close`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to close side chat');
  }
  
  return response.json();
}

export async function getSideConversation(sideConversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/side-chat/${sideConversationId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get side conversation');
  }
  
  return response.json();
}
