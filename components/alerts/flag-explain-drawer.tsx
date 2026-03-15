"use client";

import { useState, useCallback, useRef } from "react";
import type { PatientNode } from "@/lib/types/patient";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";
import { getFlagSeverityColor, formatRiskPercentage, formatActionName } from "@/lib/utils/format";
import { buildFlagExplainContext, buildFlagExplainQuestion } from "@/lib/ai/explain-context";
import {
  Warning,
  WarningCircle,
  Info,
  Sparkle,
  CircleNotch,
  ArrowClockwise,
  X,
  ShieldWarning,
  Lightbulb,
  Users,
  GitBranch,
  Pulse,
  Scales,
} from "@phosphor-icons/react";

const severityIcons: Record<string, React.ElementType> = {
  CRITICAL: Warning,
  WARNING: WarningCircle,
  INFO: Info,
};

interface FlagExplainDrawerProps {
  node: PatientNode;
  /** Render as a compact icon-only button */
  compact?: boolean;
}

export function FlagExplainDrawer({ node, compact = false }: FlagExplainDrawerProps) {
  const [open, setOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const flags = node.historical_analysis.flags;
  const flagCounts = countFlagsBySeverity(flags);
  const hasCritical = flagCounts.critical > 0;
  const hasWarning = flagCounts.warning > 0;

  if (flags.length === 0) return null;

  const fetchAiExplanation = useCallback(async () => {
    setAiText("");
    setAiError(null);
    setAiLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: buildFlagExplainContext(node),
          question: buildFlagExplainQuestion(node),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setAiError(errBody.error ?? `HTTP ${res.status}`);
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAiError("No response stream");
        setAiLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiText(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setAiError(err.message ?? "Something went wrong");
      } else if (!(err instanceof DOMException)) {
        setAiError("Something went wrong");
      }
    } finally {
      setAiLoading(false);
    }
  }, [node]);

  const handleOpen = () => {
    setOpen(true);
    fetchAiExplanation();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      abortRef.current?.abort();
    }
    setOpen(isOpen);
  };

  const severityColor = hasCritical
    ? "text-red-500"
    : hasWarning
      ? "text-amber-500"
      : "text-blue-500";

  const severityBg = hasCritical
    ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
    : hasWarning
      ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
      : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30";

  return (
    <>
      {compact ? (
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 shrink-0 ${severityColor} ${hasCritical ? "animate-pulse" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          title="Why flagged? — AI Explanation"
        >
          <ShieldWarning size={14} weight="fill" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 text-[10px] border ${severityBg} ${severityColor}`}
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
        >
          <ShieldWarning size={12} weight="fill" />
          Why Flagged?
        </Button>
      )}

      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="relative">
            <div className="flex items-center gap-2">
              <ShieldWarning size={18} weight="fill" className={severityColor} />
              <DrawerTitle className="text-sm">
                Why Node #{node.sequence} is Flagged
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              <span className="font-medium">{formatActionName(node.decision.action)}</span>
              {" · "}
              {flags.length} flag{flags.length !== 1 ? "s" : ""}
              {flagCounts.critical > 0 && (
                <Badge className="ml-1.5 bg-red-500/20 text-red-500 text-[9px] px-1 py-0">
                  {flagCounts.critical} critical
                </Badge>
              )}
              {flagCounts.warning > 0 && (
                <Badge className="ml-1 bg-amber-500/20 text-amber-500 text-[9px] px-1 py-0">
                  {flagCounts.warning} warning
                </Badge>
              )}
              {flagCounts.info > 0 && (
                <Badge className="ml-1 bg-blue-500/20 text-blue-500 text-[9px] px-1 py-0">
                  {flagCounts.info} info
                </Badge>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 overflow-auto px-4">
            <div className="pb-4 space-y-4">

              {/* ── Decision Context ───────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scales size={14} weight="bold" className="text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Flagged Decision
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      {formatActionName(node.decision.action)}
                    </p>
                    <Badge variant="outline" className="text-[9px]">
                      {node.decision.action_category}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {node.decision.reasoning.primary_reason}
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[9px]">
                    <Badge variant="secondary">
                      By: {node.decision.made_by.name} ({node.decision.made_by.role})
                    </Badge>
                    <Badge variant="secondary">
                      Confidence: {(node.decision.made_by.decision_confidence * 100).toFixed(0)}%
                    </Badge>
                    <Badge
                      variant={node.transition_outcome.net_impact.decision_quality === "APPROPRIATE" ? "secondary" : "destructive"}
                    >
                      Quality: {node.transition_outcome.net_impact.decision_quality}
                    </Badge>
                  </div>
                  {node.decision.alternatives_considered.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <p className="text-[9px] font-medium text-muted-foreground uppercase">
                        Alternatives Considered
                      </p>
                      {node.decision.alternatives_considered.map((alt, i) => (
                        <div key={i} className="rounded border bg-background/50 p-2 text-[10px] space-y-0.5">
                          <p className="font-medium">{alt.option.replaceAll("_", " ")}</p>
                          <p className="text-muted-foreground">{alt.why_not_chosen}</p>
                          {alt.historical_outcome_if_chosen && (
                            <div className="flex gap-1.5 flex-wrap mt-0.5">
                              <Badge variant="outline" className="text-[8px]">
                                {alt.historical_outcome_if_chosen.cases} cases
                              </Badge>
                              <Badge variant="outline" className="text-[8px]">
                                Mortality: {(alt.historical_outcome_if_chosen.mortality_rate * 100).toFixed(1)}%
                              </Badge>
                              {alt.historical_outcome_if_chosen.success_rate !== undefined && (
                                <Badge variant="outline" className="text-[8px]">
                                  Success: {(alt.historical_outcome_if_chosen.success_rate * 100).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* ── Evidence from Similar Patients ─────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={14} weight="bold" className="text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Evidence from Similar Patients
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="font-semibold">{node.historical_analysis.similar_cases.total} similar cases</span>
                    <span className="text-emerald-500 font-medium">
                      {node.historical_analysis.similar_cases.outcomes.healed.percentage}% healed
                    </span>
                    <span className="text-red-500 font-medium">
                      {node.historical_analysis.similar_cases.outcomes.died.percentage}% died
                    </span>
                  </div>

                  {/* Matched standard patterns */}
                  {node.historical_analysis.pattern_matching.matched_standard_patterns.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <GitBranch size={10} className="text-muted-foreground" />
                        <p className="text-[9px] font-medium text-muted-foreground uppercase">
                          Matched Care Patterns
                        </p>
                      </div>
                      {node.historical_analysis.pattern_matching.matched_standard_patterns.map((p) => (
                        <div key={p.pattern_id} className="rounded border bg-background/50 p-2 text-[10px]">
                          <p className="font-medium">{p.pattern_name.replaceAll("_", " ")}</p>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            <Badge variant="outline" className="text-[8px]">
                              {(p.similarity * 100).toFixed(0)}% match
                            </Badge>
                            <Badge variant="outline" className="text-[8px]">
                              Mortality: {(p.pattern_outcomes.mortality * 100).toFixed(1)}%
                            </Badge>
                            <Badge variant="outline" className="text-[8px]">
                              Complications: {(p.pattern_outcomes.complication_rate * 100).toFixed(1)}%
                            </Badge>
                            <Badge variant="outline" className="text-[8px]">
                              Success: {(p.pattern_outcomes.success_rate * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deadly patterns */}
                  {node.historical_analysis.pattern_matching.deadly_pattern_matches.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Pulse size={10} className="text-red-500" />
                        <p className="text-[9px] font-medium text-red-500 uppercase">
                          Deadly Pattern Matches
                        </p>
                      </div>
                      {node.historical_analysis.pattern_matching.deadly_pattern_matches.map((p) => (
                        <div key={p.pattern_id} className="rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px]">
                          <p className="font-medium text-red-600">{p.pattern_name.replaceAll("_", " ")}</p>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            <Badge className="bg-red-500/20 text-red-600 text-[8px]">
                              {(p.similarity * 100).toFixed(0)}% similarity
                            </Badge>
                            <Badge className="bg-red-500/20 text-red-600 text-[8px]">
                              Pattern mortality: {(p.pattern_mortality * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          {p.key_difference && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                              Key difference: {p.key_difference.replaceAll("_", " ")}
                            </p>
                          )}
                          <p className="text-[9px] mt-0.5">
                            Risk: {p.risk_assessment.replaceAll("_", " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* ── Flag Cards ─────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Flags Raised
                </p>
                {flags.map((flag) => {
                  const FlagIcon = severityIcons[flag.severity] ?? Info;
                  return (
                    <div
                      key={flag.flag_id}
                      className={`rounded-lg border p-3 ${getFlagSeverityColor(flag.severity)}`}
                    >
                      <div className="flex items-start gap-2">
                        <FlagIcon size={14} weight="fill" className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px]">
                              {flag.type.replaceAll("_", " ")}
                            </Badge>
                            <Badge variant="outline" className="text-[9px]">
                              {flag.severity}
                            </Badge>
                            {flag.adjusted_risk !== undefined && (
                              <Badge variant="secondary" className="text-[9px]">
                                Risk: {formatRiskPercentage(flag.adjusted_risk)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs">{flag.message}</p>

                          {/* Evidence from this flag */}
                          {flag.evidence && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {flag.evidence.similar_cases !== undefined && (
                                <Badge variant="secondary" className="text-[8px]">
                                  {flag.evidence.similar_cases} similar cases
                                </Badge>
                              )}
                              {flag.evidence.complication_rate !== undefined && (
                                <Badge variant="secondary" className="text-[8px]">
                                  Complication rate: {(flag.evidence.complication_rate * 100).toFixed(1)}%
                                </Badge>
                              )}
                              {flag.evidence.deaths_from_complication !== undefined && (
                                <Badge variant="secondary" className="text-[8px]">
                                  {flag.evidence.deaths_from_complication} deaths
                                </Badge>
                              )}
                              {flag.evidence.mortality_if_occurs !== undefined && (
                                <Badge variant="secondary" className="text-[8px]">
                                  Mortality if occurs: {((flag.evidence.mortality_if_occurs as number) * 100).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          )}

                          {flag.patient_specific_factors && flag.patient_specific_factors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {flag.patient_specific_factors.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-[8px]">
                                  {f.replaceAll("_", " ")}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {flag.recommendation && (
                            <div className="flex items-start gap-1 mt-1 text-[10px] opacity-80">
                              <Lightbulb size={10} className="mt-0.5 shrink-0" weight="bold" />
                              <span>
                                {flag.recommendation.action.replaceAll("_", " ")}
                                {flag.recommendation.message ? ` — ${flag.recommendation.message}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* ── AI Explanation ─────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkle size={14} weight="fill" className="text-primary" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    AI Clinical Analysis
                  </p>
                </div>

                {aiLoading && !aiText && (
                  <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                    <CircleNotch size={18} className="animate-spin" />
                    <span className="text-xs">Analyzing decision flags with MedGemma + OpenAI…</span>
                  </div>
                )}

                {aiError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    <p className="font-medium">Error</p>
                    <p className="mt-1">{aiError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1 text-xs"
                      onClick={fetchAiExplanation}
                    >
                      <ArrowClockwise size={12} />
                      Retry
                    </Button>
                  </div>
                )}

                {aiText && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                    <MarkdownContent content={aiText} />
                  </div>
                )}

                {aiLoading && aiText && (
                  <span className="inline-block h-3 w-1.5 animate-pulse rounded-sm bg-primary/60 ml-0.5 align-middle" />
                )}
              </div>
            </div>
          </ScrollArea>

          <DrawerFooter className="flex-row justify-between border-t pt-3">
            <DrawerClose asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <X size={12} />
                Close
              </Button>
            </DrawerClose>
            {!aiLoading && aiText && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={fetchAiExplanation}
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

// ─── Markdown renderer (same pattern as AiExplainButton) ──────────────

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

