"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AlignedNodePair, DecisionDivergence } from "@/lib/types/cross-case";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Sparkle,
  CircleNotch,
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  X,
  Diamond,
  Play,
  Stop,
} from "@phosphor-icons/react";
import {
  getOutcomeDotColor,
} from "@/lib/utils/format";

// ─── Props ───

interface StepExplainerProps {
  alignedPairs: AlignedNodePair[];
  divergences: DecisionDivergence[];
  /** Current step index (-1 = not started) */
  activeStepIndex: number;
  /** Called to change the active step */
  onStepChange: (index: number) => void;
}

// ─── Build context payload for the API ───

function buildStagePayload(
  pair: AlignedNodePair,
  divergences: DecisionDivergence[],
) {
  const stageDivergences = divergences.filter(
    (d) => d.stageKey === pair.stageKey,
  );

  return {
    stageKey: pair.stageKey,
    stageLabel: pair.stageLabel,
    referencePatient: {
      name: pair.referenceNode.patientName,
      action: pair.referenceNode.action.replace(/_/g, " "),
      actionCategory: pair.referenceNode.actionCategory,
      department: pair.referenceNode.department.replace(/_/g, " "),
      mortalityRisk: pair.referenceNode.mortalityRisk,
      complicationRisk: pair.referenceNode.complicationRisk,
      decisionQuality: pair.referenceNode.decisionQuality,
      transitionSuccess: pair.referenceNode.transitionSuccess,
      flagsCount: pair.referenceNode.flagsCount,
      criticalFlags: pair.referenceNode.criticalFlags,
      outcome: pair.referenceNode.outcome,
    },
    comparedPatients: pair.comparedNodes.map((cn) => {
      const div = stageDivergences.find(
        (d) => d.comparedNode.patientId === cn.patientId,
      );
      return {
        name: cn.patientName,
        action: cn.action.replace(/_/g, " "),
        actionCategory: cn.actionCategory,
        department: cn.department.replace(/_/g, " "),
        mortalityRisk: cn.mortalityRisk,
        complicationRisk: cn.complicationRisk,
        decisionQuality: cn.decisionQuality,
        transitionSuccess: cn.transitionSuccess,
        flagsCount: cn.flagsCount,
        criticalFlags: cn.criticalFlags,
        outcome: cn.outcome,
        isDivergent: !!div,
        divergenceType: div?.divergenceType ?? null,
        divergenceDescription: div?.description ?? null,
      };
    }),
    totalDivergences: stageDivergences.length,
  };
}

// ─── Component ───

export function StepExplainer({
  alignedPairs,
  divergences,
  activeStepIndex,
  onStepChange,
}: StepExplainerProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedIndex = useRef<number>(-2);

  const totalSteps = Math.min(alignedPairs.length, 16);
  const currentPair =
    activeStepIndex >= 0 && activeStepIndex < alignedPairs.length
      ? alignedPairs[activeStepIndex]
      : null;

  const isActive = activeStepIndex >= 0;
  const hasPrev = activeStepIndex > 0;
  const hasNext = activeStepIndex >= 0 && activeStepIndex < totalSteps - 1;
  const progressPct = isActive ? ((activeStepIndex + 1) / totalSteps) * 100 : 0;

  const fetchExplanation = useCallback(
    async (pair: AlignedNodePair, index: number) => {
      setText("");
      setError(null);
      setLoading(true);
      lastFetchedIndex.current = index;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const stageData = buildStagePayload(pair, divergences);

        const res = await fetch("/api/cross-case-step-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageData }),
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
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message ?? "Something went wrong");
        } else if (!(err instanceof DOMException)) {
          setError("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    },
    [divergences],
  );

  // Auto-fetch when step changes
  useEffect(() => {
    if (currentPair && activeStepIndex !== lastFetchedIndex.current) {
      fetchExplanation(currentPair, activeStepIndex);
    }
  }, [currentPair, activeStepIndex, fetchExplanation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleBegin = () => {
    onStepChange(0);
  };

  const handlePrev = () => {
    if (hasPrev) onStepChange(activeStepIndex - 1);
  };

  const handleNext = () => {
    if (hasNext) onStepChange(activeStepIndex + 1);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setText("");
    setError(null);
    setLoading(false);
    lastFetchedIndex.current = -2;
    onStepChange(-1);
  };

  const stageDivergences = currentPair
    ? divergences.filter((d) => d.stageKey === currentPair.stageKey)
    : [];

  // ─── Not started: show CTA ───
  if (!isActive) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/20 p-6">
        <Sparkle size={22} className="text-primary" weight="duotone" />
        <div className="text-center">
          <p className="text-sm font-medium">AI Step-by-Step Flow Analysis</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            Walk through each stage of the patient journey incrementally.
            AI will explain what happened at each step, highlight differences between patients,
            and identify patterns that led to different outcomes.
          </p>
        </div>
        <Button onClick={handleBegin} size="sm" className="gap-2 mt-1">
          <Play size={14} weight="fill" />
          Begin Analysis
        </Button>
      </div>
    );
  }

  // ─── Active walkthrough ───
  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/3 overflow-hidden">
      {/* Header with progress */}
      <div className="border-b border-primary/10">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkle size={16} weight="fill" className="text-primary shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">
                  Step {activeStepIndex + 1} of {totalSteps}
                </span>
                {currentPair && (
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {currentPair.stageLabel}
                  </Badge>
                )}
                {stageDivergences.length > 0 && (
                  <Badge className="text-[9px] bg-orange-500/15 text-orange-400 border-orange-500/30 gap-0.5">
                    <Diamond size={8} weight="fill" />
                    {stageDivergences.length} divergence{stageDivergences.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrev}
              disabled={!hasPrev || loading}
              title="Previous step"
            >
              <ArrowLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleNext}
              disabled={!hasNext || loading}
              title="Next step"
            >
              <ArrowRight size={14} />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleStop}
              title="Stop analysis"
            >
              <Stop size={14} weight="fill" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPct} className="h-1 rounded-none" />
      </div>

      {/* Quick context: who did what */}
      {currentPair && (
        <div className="border-b border-primary/10 px-4 py-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${getOutcomeDotColor(currentPair.referenceNode.outcome)}`} />
              <span className="font-semibold">{currentPair.referenceNode.patientName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono">{currentPair.referenceNode.action.replace(/_/g, " ")}</span>
              <Badge variant="outline" className="text-[8px] h-4 px-1">ref</Badge>
            </div>
            {currentPair.comparedNodes.map((cn) => {
              const isDivergent = stageDivergences.some(
                (d) => d.comparedNode.patientId === cn.patientId,
              );
              return (
                <div key={cn.patientId} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${getOutcomeDotColor(cn.outcome)}`} />
                  <span className="font-medium">{cn.patientName}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono">{cn.action.replace(/_/g, " ")}</span>
                  {isDivergent && <Diamond size={8} weight="fill" className="text-orange-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI response area */}
      <div className="px-4 py-3">
        {loading && !text && (
          <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
            <CircleNotch size={16} className="animate-spin" />
            <span className="text-xs">
              Analyzing step {activeStepIndex + 1}: {currentPair?.stageLabel}…
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-red-400 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1 text-xs"
              onClick={() => currentPair && fetchExplanation(currentPair, activeStepIndex)}
            >
              <ArrowClockwise size={12} />
              Retry
            </Button>
          </div>
        )}

        {text && (
          <div
            className="max-h-72 overflow-y-auto pr-2
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-border
              [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40"
          >
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
              <MarkdownContent content={text} />
            </div>
            {loading && (
              <span className="inline-block h-3 w-1.5 animate-pulse rounded-sm bg-primary/60 ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      {!loading && text && (
        <div className="border-t border-primary/10 px-4 py-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => currentPair && fetchExplanation(currentPair, activeStepIndex)}
          >
            <ArrowClockwise size={12} />
            Regenerate
          </Button>
          <div className="flex items-center gap-2">
            {hasPrev && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePrev}>
                <ArrowLeft size={12} />
                Previous
              </Button>
            )}
            {hasNext ? (
              <Button variant="default" size="sm" className="gap-1.5 text-xs" onClick={handleNext}>
                Next step
                <ArrowRight size={12} />
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleStop}>
                Finish
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markdown renderer ───

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### "))
          return <h4 key={i} className="font-semibold text-xs mt-3 mb-1">{trimmed.slice(4)}</h4>;
        if (trimmed.startsWith("## "))
          return <h3 key={i} className="font-semibold text-sm mt-3 mb-1">{trimmed.slice(3)}</h3>;
        if (trimmed.startsWith("# "))
          return <h2 key={i} className="font-bold text-sm mt-3 mb-1">{trimmed.slice(2)}</h2>;

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="mt-1 text-muted-foreground">•</span>
              <span><InlineMarkdown text={trimmed.slice(2)} /></span>
            </div>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="text-muted-foreground font-mono min-w-[1.2em]">{numberedMatch[1]}.</span>
              <span><InlineMarkdown text={numberedMatch[2]} /></span>
            </div>
          );
        }

        if (!trimmed) return <div key={i} className="h-1.5" />;
        return <p key={i}><InlineMarkdown text={trimmed} /></p>;
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
