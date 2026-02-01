import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  onHighlight?: (text: string, context: string) => void;
}

export function ChatMessage({ role, content, onHighlight }: ChatMessageProps) {
  if (role === 'system') return null;

  const handleTextSelection = () => {
    if (!onHighlight) return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      // Get some context around the selection
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.textContent || '';
      onHighlight(selectedText, container);
    }
  };

  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      
      <div 
        className={cn(
          "max-w-[80%] prose prose-sm dark:prose-invert",
          isUser ? "chat-bubble-user" : "chat-bubble-assistant"
        )}
        onMouseUp={handleTextSelection}
      >
        <ReactMarkdown
          components={{
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code 
                    className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono highlight-text"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <pre className="code-block">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="chat-bubble-assistant">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
