import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateMainRequest {
  main_topic: string;
}

interface SendMessageRequest {
  conversation_id: string;
  message: string;
}

function buildMainSystemPrompt(mainTopic: string): string {
  return `You are an AI tutor teaching the topic: ${mainTopic}.

Rules:
- Stay focused on the main topic.
- Do not explain prerequisites unless explicitly asked.
- Maintain uninterrupted learning flow.
- Be engaging and encourage questions about the main topic.
- Use examples and code snippets when appropriate.
- Format responses with markdown for better readability.`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // POST /main-chat - Create new main conversation
    if (req.method === 'POST' && pathParts.length === 1) {
      const body: CreateMainRequest = await req.json();
      
      if (!body.main_topic) {
        return new Response(
          JSON.stringify({ error: 'main_topic is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Creating new main conversation for topic:', body.main_topic);
      
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'MAIN',
          main_topic: body.main_topic,
          status: 'active'
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store system prompt as first message
      const systemPrompt = buildMainSystemPrompt(body.main_topic);
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'system',
        content: systemPrompt
      });
      
      console.log('Main conversation created:', conversation.id);
      
      return new Response(
        JSON.stringify({ conversation_id: conversation.id, main_topic: body.main_topic }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /main-chat/{conversation_id}/message - Send message
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'message') {
      const conversationId = pathParts[1];
      const body: SendMessageRequest = await req.json();
      
      if (!body.message) {
        return new Response(
          JSON.stringify({ error: 'message is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Sending message to main chat:', conversationId);
      
      // Verify conversation exists and is active
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('type', 'MAIN')
        .single();
      
      if (convError || !conversation) {
        return new Response(
          JSON.stringify({ error: 'Main conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (conversation.status === 'closed') {
        return new Response(
          JSON.stringify({ error: 'Conversation is closed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get conversation history
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('Error fetching messages:', msgError);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve messages' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store user message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: body.message
      });
      
      // Build messages array for LLM
      const llmMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: body.message }
      ];
      
      console.log('Calling LLM with', llmMessages.length, 'messages');
      
      // Call Lovable AI
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: llmMessages,
          stream: false,
        }),
      });
      
      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await aiResponse.text();
        console.error('AI gateway error:', aiResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'AI service error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const aiData = await aiResponse.json();
      const assistantContent = aiData.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';
      
      // Store assistant message
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantContent
        })
        .select()
        .single();
      
      if (assistantError) {
        console.error('Error storing assistant message:', assistantError);
      }
      
      console.log('Message exchange complete');
      
      return new Response(
        JSON.stringify({
          message_id: assistantMsg?.id,
          content: assistantContent,
          role: 'assistant'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // GET /main-chat/{conversation_id} - Get conversation with messages
    if (req.method === 'GET' && pathParts.length === 2) {
      const conversationId = pathParts[1];
      
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('type', 'MAIN')
        .single();
      
      if (convError || !conversation) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      return new Response(
        JSON.stringify({ conversation, messages: messages || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Main chat error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
