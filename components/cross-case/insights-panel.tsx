"use client";

import type { CrossCaseInsight } from "@/lib/types/cross-case";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkle,
  CircleNotch,
  Warning,
  Info,
  ShieldWarning,
  TrendUp,
  Clock,
  GitFork,
  LightbulbFilament,
} from "@phosphor-icons/react";

interface InsightsPanelProps {
  text: string;
  insights: CrossCaseInsight[];
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
  disabled?: boolean;
}

function getInsightIcon(type: string) {
  switch (type) {
    case "timing_pattern":
      return <Clock size={14} weight="bold" className="text-blue-500" />;
    case "decision_pattern":
      return <GitFork size={14} weight="bold" className="text-indigo-500" />;
    case "risk_warning":
      return <ShieldWarning size={14} weight="bold" className="text-red-500" />;
    case "complication_predictor":
      return <Warning size={14} weight="bold" className="text-amber-500" />;
    case "positive_pattern":
      return <TrendUp size={14} weight="bold" className="text-emerald-500" />;
    case "outcome_correlation":
      return <LightbulbFilament size={14} weight="bold" className="text-purple-500" />;
    default:
      return <Info size={14} className="text-muted-foreground" />;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-500/30 bg-red-500/5";
    case "warning":
      return "border-amber-500/30 bg-amber-500/5";
    case "info":
      return "border-blue-500/30 bg-blue-500/5";
    default:
      return "border-border";
  }
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "warning":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "info":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function InsightsPanel({
  text,
  insights,
  loading,
  error,
  onAnalyze,
  disabled,
}: InsightsPanelProps) {
  // Remove the JSON block from displayed text
  const displayText = text
    .replace(/<!-- INSIGHTS_JSON_START -->[\s\S]*<!-- INSIGHTS_JSON_END -->/g, "")
    .trim();

  return (
    <div className="space-y-4">
      {/* Trigger button */}
      {!text && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6">
          <Sparkle size={24} className="text-primary" weight="duotone" />
          <div className="text-center">
            <p className="text-sm font-medium">AI Pattern Analysis</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use AI to analyze cross-case decision patterns, identify complication pathways,
              and generate clinical insights from similar cases.
            </p>
          </div>
          <Button
            onClick={onAnalyze}
            disabled={disabled}
            size="sm"
            className="gap-2"
          >
            <Sparkle size={14} weight="bold" />
            Analyze Patterns with AI
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <Button
            onClick={onAnalyze}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && !displayText && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleNotch size={14} className="animate-spin" />
            <span>Analyzing cross-case patterns...</span>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {/* Streaming text */}
      {displayText && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <CircleNotch size={12} className="animate-spin" />
              <span>Generating analysis...</span>
            </div>
          )}

          <ScrollArea className="max-h-100">
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(displayText) }} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Parsed insight cards */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkle size={14} className="text-primary" weight="bold" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Key Insights
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {insights.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={insight.id || i}
                className={`rounded-lg border p-3 space-y-2 ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getInsightIcon(insight.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <Badge className={`text-[8px] ${getSeverityBadgeColor(insight.severity)}`}>
                        {insight.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {insight.message}
                    </p>
                  </div>
                </div>

                {/* Evidence */}
                {insight.evidence && (
                  <div className="flex flex-wrap gap-2 text-[9px]">
                    {insight.evidence.caseCount != null && (
                      <Badge variant="outline" className="text-[8px]">
                        {insight.evidence.caseCount} cases
                      </Badge>
                    )}
                    {insight.evidence.percentage != null && (
                      <Badge variant="outline" className="text-[8px]">
                        {insight.evidence.percentage}%
                      </Badge>
                    )}
                    {insight.evidence.comparisonMetric && (
                      <Badge variant="outline" className="text-[8px]">
                        {insight.evidence.comparisonMetric}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Recommendation */}
                {insight.recommendation && (
                  <div className="rounded-md bg-background/80 p-2 text-[10px]">
                    <span className="font-semibold">Recommendation: </span>
                    {insight.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-analyze button */}
      {text && !loading && (
        <Button
          onClick={onAnalyze}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Sparkle size={12} />
          Re-analyze
        </Button>
      )}
    </div>
  );
}

// ─── Simple markdown to HTML (handles headers, bold, bullets, code) ───

function markdownToHtml(md: string): string {
  return md
    .replace(/### (.*)/g, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-sm font-bold mt-4 mb-1">$1</h2>')
    .replace(/# (.*)/g, '<h1 class="text-base font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[10px]">$1</code>')
    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}


