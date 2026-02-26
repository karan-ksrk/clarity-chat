import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { X, MoreHorizontal, MessageCircleQuestion } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/api';

interface SidePanelProps {
  isOpen: boolean;
  highlightedText: string;
  mainTopic: string;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export function SidePanel({ 
  isOpen, 
  highlightedText, 
  mainTopic,
  messages, 
  isLoading, 
  onSendMessage, 
  onClose 
}: SidePanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter out system messages for display
  const displayMessages = messages.filter(m => m.role !== 'system');

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-full max-w-md bg-card side-panel z-40",
      "flex flex-col animate-slide-in-right"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Quick Info</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Topic Badge */}
      <div className="px-4 pt-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {highlightedText.length > 30 ? highlightedText.slice(0, 30) + '...' : highlightedText}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {displayMessages.map((message) => (
          <ChatMessage 
            key={message.id} 
            role={message.role as 'user' | 'assistant'} 
            content={message.content} 
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirm Button */}
      <div className="p-4 border-t border-border">
        <Button 
          onClick={onClose} 
          className="w-full"
          variant="default"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
}
