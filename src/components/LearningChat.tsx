import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { SidePanel } from '@/components/SidePanel';
import { HighlightPopover } from '@/components/HighlightPopover';
import { TopicSelector } from '@/components/TopicSelector';
import { 
  createMainConversation, 
  sendMainMessage, 
  createSideChat, 
  closeSideChat,
  type Message 
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface HighlightState {
  text: string;
  context: string;
  position: { x: number; y: number };
}

export function LearningChat() {
  const { toast } = useToast();
  
  // Main conversation state
  const [mainConversationId, setMainConversationId] = useState<string | null>(null);
  const [mainTopic, setMainTopic] = useState('');
  const [mainMessages, setMainMessages] = useState<Message[]>([]);
  const [isMainLoading, setIsMainLoading] = useState(false);
  
  // Side conversation state
  const [sideConversationId, setSideConversationId] = useState<string | null>(null);
  const [sideMessages, setSideMessages] = useState<Message[]>([]);
  const [isSideLoading, setIsSideLoading] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState('');
  
  // Highlight popover state
  const [highlightState, setHighlightState] = useState<HighlightState | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mainMessages]);

  // Handle starting a new learning session
  const handleStartLearning = async (topic: string) => {
    setIsMainLoading(true);
    try {
      const result = await createMainConversation(topic);
      setMainConversationId(result.conversation_id);
      setMainTopic(topic);
      
      // Add a welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        conversation_id: result.conversation_id,
        role: 'assistant',
        content: `# Welcome to Learning ${topic}! 🎓

I'm your AI tutor, and I'm here to help you learn ${topic}. 

Feel free to ask me anything about ${topic}, and I'll guide you through the concepts step by step. 

**Pro tip:** You can highlight any text in my responses and ask a quick question about it without interrupting our main conversation!

What would you like to learn first?`,
        created_at: new Date().toISOString(),
      };
      setMainMessages([welcomeMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: 'destructive',
      });
    } finally {
      setIsMainLoading(false);
    }
  };

  // Handle sending message to main chat
  const handleSendMainMessage = async (message: string) => {
    if (!mainConversationId) return;
    
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      conversation_id: mainConversationId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMainMessages(prev => [...prev, userMessage]);
    setIsMainLoading(true);
    
    try {
      const result = await sendMainMessage(mainConversationId, message);
      
      const assistantMessage: Message = {
        id: result.message_id || `assistant-${Date.now()}`,
        conversation_id: mainConversationId,
        role: 'assistant',
        content: result.content,
        created_at: new Date().toISOString(),
      };
      setMainMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsMainLoading(false);
    }
  };

  // Handle text highlight
  const handleHighlight = useCallback((text: string, context: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setHighlightState({
      text,
      context,
      position: { x: rect.left, y: rect.bottom }
    });
  }, []);

  // Handle asking a question about highlighted text
  const handleAskAboutHighlight = async (question: string) => {
    if (!mainConversationId || !highlightState) return;
    
    setHighlightState(null);
    setCurrentHighlight(highlightState.text);
    setSidePanelOpen(true);
    setIsSideLoading(true);
    setSideMessages([]);
    
    try {
      const result = await createSideChat({
        main_conversation_id: mainConversationId,
        highlighted_text: highlightState.text,
        surrounding_context: highlightState.context,
        user_question: question,
        user_level: 'beginner',
      });
      
      setSideConversationId(result.side_conversation_id);
      
      // Create messages from the response
      const userMsg: Message = {
        id: 'side-user',
        conversation_id: result.side_conversation_id,
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      };
      
      const assistantMsg: Message = {
        id: 'side-assistant',
        conversation_id: result.side_conversation_id,
        role: 'assistant',
        content: result.explanation,
        created_at: new Date().toISOString(),
      };
      
      setSideMessages([userMsg, assistantMsg]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get explanation',
        variant: 'destructive',
      });
      setSidePanelOpen(false);
    } finally {
      setIsSideLoading(false);
    }
  };

  // Handle closing side panel
  const handleCloseSidePanel = async () => {
    if (sideConversationId) {
      try {
        await closeSideChat(sideConversationId);
      } catch (error) {
        console.error('Failed to close side chat:', error);
      }
    }
    setSidePanelOpen(false);
    setSideConversationId(null);
    setSideMessages([]);
    setCurrentHighlight('');
  };

  // Handle going back to topic selection
  const handleBack = () => {
    setMainConversationId(null);
    setMainTopic('');
    setMainMessages([]);
    handleCloseSidePanel();
  };

  // Close highlight popover when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (highlightState) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-highlight-popover]')) {
          setHighlightState(null);
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [highlightState]);

  // Filter out system messages for display
  const displayMessages = mainMessages.filter(m => m.role !== 'system');

  // Show topic selector if no conversation
  if (!mainConversationId) {
    return <TopicSelector onStart={handleStartLearning} isLoading={isMainLoading} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="flex items-center gap-4 p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg">Learning {mainTopic}</h1>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {displayMessages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role as 'user' | 'assistant'}
              content={message.content}
              onHighlight={message.role === 'assistant' ? handleHighlight : undefined}
            />
          ))}
          {isMainLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <ChatInput
            onSend={handleSendMainMessage}
            disabled={isMainLoading}
            placeholder="Type your message..."
          />
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel
        isOpen={sidePanelOpen}
        highlightedText={currentHighlight}
        mainTopic={mainTopic}
        messages={sideMessages}
        isLoading={isSideLoading}
        onSendMessage={() => {}} // Follow-up messages not implemented in MVP
        onClose={handleCloseSidePanel}
      />

      {/* Highlight Popover */}
      {highlightState && (
        <div data-highlight-popover>
          <HighlightPopover
            highlightedText={highlightState.text}
            context={highlightState.context}
            position={highlightState.position}
            onAsk={handleAskAboutHighlight}
            onClose={() => setHighlightState(null)}
          />
        </div>
      )}
    </div>
  );
}
