import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Sparkles } from 'lucide-react';

interface TopicSelectorProps {
  onStart: (topic: string) => void;
  isLoading: boolean;
}

const SUGGESTED_TOPICS = [
  'Django',
  'React',
  'Python',
  'JavaScript',
  'TypeScript',
  'Machine Learning',
];

export function TopicSelector({ onStart, isLoading }: TopicSelectorProps) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim());
    }
  };

  const handleSuggestion = (suggestion: string) => {
    onStart(suggestion);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Logo/Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            LearnFlow AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Learn any topic with an AI tutor. Highlight text to ask questions without interrupting your learning flow.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn today?"
              className="text-lg py-6 bg-card"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="lg" 
              disabled={!topic.trim() || isLoading}
              className="px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start
            </Button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Popular topics:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_TOPICS.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestion(suggestion)}
                disabled={isLoading}
                className="rounded-full"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 mx-auto">
              <span className="text-xl">📚</span>
            </div>
            <h3 className="font-medium mb-1">Main Chat</h3>
            <p className="text-sm text-muted-foreground">
              Continuous learning on your chosen topic
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 mx-auto">
              <span className="text-xl">💡</span>
            </div>
            <h3 className="font-medium mb-1">Side Chat</h3>
            <p className="text-sm text-muted-foreground">
              Quick clarifications without interrupting
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 mx-auto">
              <span className="text-xl">✨</span>
            </div>
            <h3 className="font-medium mb-1">Highlight to Ask</h3>
            <p className="text-sm text-muted-foreground">
              Select any text to get instant explanations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
