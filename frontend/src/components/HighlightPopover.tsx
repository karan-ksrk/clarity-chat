import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightPopoverProps {
  highlightedText: string;
  context: string;
  position: { x: number; y: number };
  onAsk: (question: string) => void;
  onClose: () => void;
}

export function HighlightPopover({
  highlightedText,
  context,
  position,
  onAsk,
  onClose,
}: HighlightPopoverProps) {
  const [question, setQuestion] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleQuickAsk = () => {
    const defaultQuestion = `What is "${highlightedText}"?`;
    onAsk(defaultQuestion);
  };

  const handleCustomAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onAsk(question.trim());
    }
  };
  const handleCustomAskClick = () => {
    const defaultQuestion = `Explain "${highlightedText}" in more detail.`;
    onAsk(defaultQuestion);
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "fixed z-50 bg-card border border-border rounded-xl shadow-lg p-4 animate-fade-in",
        "max-w-sm"
      )}
      style={{
        left: Math.min(position.x, window.innerWidth - 380),
        top: Math.min(position.y + 10, window.innerHeight - 200),
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Copy</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="mb-3">
        <Label className="text-sm text-muted-foreground">
          Ask a question about "
          <span className="text-foreground font-medium">{highlightedText}</span>
          ":
        </Label>
      </div>

      {!isExpanded ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleQuickAsk}
          >
            What is{" "}
            {highlightedText.length > 15
              ? highlightedText.slice(0, 15) + "..."
              : highlightedText}
            ?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // 👈 extra safety
              setIsExpanded(true);
            }}
          >
            Custom
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCustomAsk} className="space-y-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`What is ${highlightedText}?`}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!question.trim()}>
              <MessageCircleQuestion className="w-3 h-3 mr-1" />
              Ask
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
