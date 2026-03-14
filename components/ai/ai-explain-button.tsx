"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkle, CircleNotch, ArrowClockwise, X } from "@phosphor-icons/react";

interface AiExplainButtonProps {
  /** JSON-serialisable context that gets sent to the API */
  context: unknown;
  /** Human-readable question / prompt for the AI */
  question: string;
  /** Optional label override */
  label?: string;
  /** Optional drawer title override */
  title?: string;
  /** Compact icon-only mode */
  compact?: boolean;
}

export function AiExplainButton({
  context,
  question,
  label = "Explain with AI",
  title = "AI Explanation",
  compact = false,
}: AiExplainButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchExplanation = useCallback(async () => {
    setText("");
    setError(null);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error ?? `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }, [context, question]);

  const handleOpen = () => {
    setOpen(true);
    fetchExplanation();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      abortRef.current?.abort();
    }
    setOpen(isOpen);
  };

  return (
    <>
      {compact ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleOpen}
          title={label}
        >
          <Sparkle size={14} weight="fill" className="text-primary" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleOpen}
        >
          <Sparkle size={14} weight="fill" className="text-primary" />
          {label}
        </Button>
      )}

      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="relative">
            <div className="flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-primary" />
              <DrawerTitle className="text-sm">{title}</DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Powered by OpenAI · Analysis based on patient graph data
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 overflow-auto px-4" orientation="vertical">
            <div className="pb-4">
              {loading && !text && (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <CircleNotch size={18} className="animate-spin" />
                  <span className="text-xs">Analyzing patient data…</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <p className="font-medium">Error</p>
                  <p className="mt-1">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1 text-xs"
                    onClick={fetchExplanation}
                  >
                    <ArrowClockwise size={12} />
                    Retry
                  </Button>
                </div>
              )}

              {text && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                  <MarkdownContent content={text} />
                </div>
              )}

              {loading && text && (
                <span className="inline-block h-3 w-1.5 animate-pulse rounded-sm bg-primary/60 ml-0.5 align-middle" />
              )}
            </div>
          </ScrollArea>

          <DrawerFooter className="flex-row justify-between border-t pt-3">
            <DrawerClose asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <X size={12} />
                Close
              </Button>
            </DrawerClose>
            {!loading && text && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={fetchExplanation}
              >
                <ArrowClockwise size={12} />
                Regenerate
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** Simple markdown-to-JSX renderer for streaming text */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
          return <h4 key={i} className="font-semibold text-xs mt-3 mb-1">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={i} className="font-semibold text-sm mt-3 mb-1">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={i} className="font-bold text-sm mt-3 mb-1">{trimmed.slice(2)}</h2>;
        }

        // Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="mt-1 text-muted-foreground">•</span>
              <span><InlineMarkdown text={trimmed.slice(2)} /></span>
            </div>
          );
        }

        // Numbered lists
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="text-muted-foreground font-mono min-w-[1.2em]">{numberedMatch[1]}.</span>
              <span><InlineMarkdown text={numberedMatch[2]} /></span>
            </div>
          );
        }

        // Empty lines
        if (!trimmed) return <div key={i} className="h-1.5" />;

        // Regular paragraph
        return <p key={i}><InlineMarkdown text={trimmed} /></p>;
      })}
    </div>
  );
}

/** Handle inline **bold** and `code` */
function InlineMarkdown({ text }: { text: string }) {
  // Split by **bold** and `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

