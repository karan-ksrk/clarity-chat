import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateSideRequest {
  main_conversation_id: string;
  highlighted_text: string;
  surrounding_context?: string;
  user_question: string;
  user_level?: string;
}

interface SendMessageRequest {
  message: string;
}

function buildSideSystemPrompt(
  mainTopic: string,
  highlightedText: string,
  surroundingContext: string,
  userQuestion: string,
  userLevel: string
): string {
  return `You are answering a private, contextual doubt.

Main topic: ${mainTopic}
Highlighted text: ${highlightedText}
Context: ${surroundingContext || 'No additional context provided'}
User question: ${userQuestion}
User level: ${userLevel}

Rules:
- Explain only what is necessary to remove confusion.
- Use the main topic as context.
- Be concise.
- Do not introduce unrelated concepts.
- Focus specifically on the highlighted text and user's question.
- Use code examples only if they directly clarify the doubt.
- Format responses with markdown for readability.`;
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
    
    // POST /side-chat - Create new side conversation
    if (req.method === 'POST' && pathParts.length === 1) {
      const body: CreateSideRequest = await req.json();
      
      if (!body.main_conversation_id || !body.highlighted_text || !body.user_question) {
        return new Response(
          JSON.stringify({ error: 'main_conversation_id, highlighted_text, and user_question are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Creating side chat for main conversation:', body.main_conversation_id);
      
      // Verify main conversation exists
      const { data: mainConv, error: mainError } = await supabase
        .from('conversations')
        .select('main_topic')
        .eq('id', body.main_conversation_id)
        .eq('type', 'MAIN')
        .single();
      
      if (mainError || !mainConv) {
        return new Response(
          JSON.stringify({ error: 'Main conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const userLevel = body.user_level || 'beginner';
      
      // Create side conversation
      const { data: sideConv, error: sideError } = await supabase
        .from('conversations')
        .insert({
          type: 'SIDE',
          parent_id: body.main_conversation_id,
          main_topic: mainConv.main_topic,
          highlighted_text: body.highlighted_text,
          surrounding_context: body.surrounding_context || '',
          user_question: body.user_question,
          user_level: userLevel,
          status: 'active'
        })
        .select()
        .single();
      
      if (sideError) {
        console.error('Error creating side conversation:', sideError);
        return new Response(
          JSON.stringify({ error: sideError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Build and store system prompt
      const systemPrompt = buildSideSystemPrompt(
        mainConv.main_topic,
        body.highlighted_text,
        body.surrounding_context || '',
        body.user_question,
        userLevel
      );
      
      await supabase.from('messages').insert({
        conversation_id: sideConv.id,
        role: 'system',
        content: systemPrompt
      });
      
      // Store the user's initial question
      await supabase.from('messages').insert({
        conversation_id: sideConv.id,
        role: 'user',
        content: body.user_question
      });
      
      console.log('Side conversation created:', sideConv.id);
      console.log('Calling LLM for initial response');
      
      // Get initial response from LLM
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body.user_question }
          ],
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
      
      // Store assistant response
      await supabase.from('messages').insert({
        conversation_id: sideConv.id,
        role: 'assistant',
        content: assistantContent
      });
      
      console.log('Side chat created with initial response');
      
      return new Response(
        JSON.stringify({
          side_conversation_id: sideConv.id,
          main_topic: mainConv.main_topic,
          highlighted_text: body.highlighted_text,
          explanation: assistantContent
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /side-chat/{side_conversation_id}/message - Send follow-up message
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'message') {
      const sideConversationId = pathParts[1];
      const body: SendMessageRequest = await req.json();
      
      if (!body.message) {
        return new Response(
          JSON.stringify({ error: 'message is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Sending follow-up to side chat:', sideConversationId);
      
      // Verify side conversation exists and is active
      const { data: sideConv, error: sideError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', sideConversationId)
        .eq('type', 'SIDE')
        .single();
      
      if (sideError || !sideConv) {
        return new Response(
          JSON.stringify({ error: 'Side conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (sideConv.status === 'closed') {
        return new Response(
          JSON.stringify({ error: 'Side conversation is closed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get conversation history
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', sideConversationId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('Error fetching messages:', msgError);
        return new Response(
          JSON.stringify({ error: msgError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store user message
      await supabase.from('messages').insert({
        conversation_id: sideConversationId,
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
      const { data: assistantMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: sideConversationId,
          role: 'assistant',
          content: assistantContent
        })
        .select()
        .single();
      
      console.log('Side chat follow-up complete');
      
      return new Response(
        JSON.stringify({
          message_id: assistantMsg?.id,
          content: assistantContent,
          role: 'assistant'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /side-chat/{side_conversation_id}/close - Close side conversation
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'close') {
      const sideConversationId = pathParts[1];
      
      console.log('Closing side chat:', sideConversationId);
      
      const { data: updatedConv, error: updateError } = await supabase
        .from('conversations')
        .update({ status: 'closed' })
        .eq('id', sideConversationId)
        .eq('type', 'SIDE')
        .select()
        .single();
      
      if (updateError || !updatedConv) {
        return new Response(
          JSON.stringify({ error: 'Side conversation not found or could not be closed' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Side chat closed successfully');
      
      return new Response(
        JSON.stringify({ message: 'Side conversation closed', conversation_id: sideConversationId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // GET /side-chat/{side_conversation_id} - Get side conversation with messages
    if (req.method === 'GET' && pathParts.length === 2) {
      const sideConversationId = pathParts[1];
      
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', sideConversationId)
        .eq('type', 'SIDE')
        .single();
      
      if (convError || !conversation) {
        return new Response(
          JSON.stringify({ error: 'Side conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', sideConversationId)
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
    console.error('Side chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
