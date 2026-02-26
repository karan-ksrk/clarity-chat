-- Create conversation type enum
CREATE TYPE public.conversation_type AS ENUM ('MAIN', 'SIDE');

-- Create conversation status enum
CREATE TYPE public.conversation_status AS ENUM ('active', 'closed');

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.conversation_type NOT NULL,
  parent_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  main_topic TEXT NOT NULL,
  highlighted_text TEXT,
  surrounding_context TEXT,
  user_question TEXT,
  user_level TEXT DEFAULT 'beginner',
  status public.conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_parent CHECK (
    (type = 'MAIN' AND parent_id IS NULL) OR 
    (type = 'SIDE' AND parent_id IS NOT NULL)
  )
);

-- Create message role enum
CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system');

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role public.message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_parent_id ON public.conversations(parent_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create public access policies (MVP - no auth)
CREATE POLICY "Allow public read on conversations"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on conversations"
  ON public.conversations FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read on messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;