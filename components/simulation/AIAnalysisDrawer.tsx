'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, X, Sparkles, Send, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  simulationData: any;
}

export default function AIAnalysisDrawer({ isOpen, onClose, simulationData }: AIAnalysisDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-analyze when drawer opens (initial analysis)
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isAnalyzing && !error) {
      analyzeSimulation();
    }
  }, [isOpen]);

  const analyzeSimulation = async (followUpQuestion?: string) => {
    setIsAnalyzing(true);
    setError(null);

    // If it's a follow-up question, add user message
    if (followUpQuestion) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: followUpQuestion,
        timestamp: new Date()
      }]);
      setInputMessage('');
    }

    try {
      const response = await fetch('/api/simulation/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simulationData,
          conversationHistory: followUpQuestion ? messages : undefined,
          followUpQuestion: followUpQuestion
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze simulation');
      }

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.analysis,
        timestamp: new Date()
      }]);

    } catch (err: any) {
      console.error('Error analyzing simulation:', err);
      setError(err.message || 'Failed to analyze simulation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = () => {
    const message = inputMessage.trim();
    if (!message || isAnalyzing) return;
    analyzeSimulation(message);
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    analyzeSimulation();
  };

  const renderMessage = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('###')) {
        return (
          <h3 key={index} className="text-base font-bold mt-3 mb-1 text-primary">
            {line.replace(/^###\s*/, '')}
          </h3>
        );
      }
      if (line.startsWith('##')) {
        return (
          <h2 key={index} className="text-lg font-bold mt-4 mb-2 text-primary">
            {line.replace(/^##\s*/, '')}
          </h2>
        );
      }
      if (line.startsWith('#')) {
        return (
          <h1 key={index} className="text-xl font-bold mt-4 mb-3 text-primary">
            {line.replace(/^#\s*/, '')}
          </h1>
        );
      }
      // Bold text
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={index} className="font-bold mt-2 text-foreground">
            {line.replace(/^\*\*|\*\*$/g, '')}
          </p>
        );
      }
      // List items
      if (line.match(/^[\d]+\./)) {
        return (
          <li key={index} className="ml-4 mt-1 text-sm">
            {line.replace(/^[\d]+\.\s*/, '')}
          </li>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={index} className="ml-4 mt-1 list-disc text-sm">
            {line.replace(/^[-*]\s*/, '')}
          </li>
        );
      }
      // Regular paragraphs
      if (line.trim()) {
        return (
          <p key={index} className="mt-1 text-sm text-foreground/90">
            {line}
          </p>
        );
      }
      return <br key={index} />;
    });
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full md:w-[700px] bg-background border-l shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-primary/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">AI Hospital Consultant</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} title="Start new analysis">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by GPT-4 - Ask questions about your simulation
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive text-sm">Analysis Failed</h3>
                    <p className="text-xs text-destructive/80 mt-1">{error}</p>
                    <Button
                      onClick={() => analyzeSimulation()}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/80 border border-border'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderMessage(message.content)}
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <p className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isAnalyzing && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg p-3 bg-muted/80 border border-border">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">AI is analyzing...</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about improvements, specific departments, or mortality reduction..."
              disabled={isAnalyzing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isAnalyzing}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Try: "How can I reduce mortality in triage?" or "What's causing the bottleneck?"
          </p>
        </div>
      </div>
    </div>
  );
}
