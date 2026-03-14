"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import {
  ChatCircleDots,
  PaperPlaneTilt,
  CircleNotch,
  Trash,
  Robot,
  User,
  Sparkle,
} from "@phosphor-icons/react";
import type { PatientGraph } from "@/lib/types/patient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PatientChatProps {
  patient: PatientGraph;
}

const QUICK_PROMPTS = [
  "What are the key risk factors for this patient?",
  "Were any decisions suboptimal? What should we improve?",
  "Summarize the complication timeline and root causes",
  "How does this patient compare to similar historical cases?",
  "What's driving the cost? Where can we optimize?",
  "Explain the critical AI flags for this case",
];

/** Build a trimmed context to send with chat (avoids sending the entire graph) */
function buildChatContext(patient: PatientGraph) {
  const firstNode = patient.nodes[0];
  return {
    patient_id: patient.patient_id,
    patient_name: patient.patient_name,
    demographics: firstNode?.patient_state?.demographics,
    admission: patient.admission,
    discharge: patient.discharge,
    diagnosis: firstNode?.patient_state?.diagnosis?.primary,
    medical_history: firstNode?.patient_state?.medical_history,
    outcome: patient.final_outcome,
    flow_analytics: {
      decision_quality: patient.flow_analytics.decision_quality_analysis,
      cost_analysis: patient.flow_analytics.cost_analysis,
      department_utilization: patient.flow_analytics.department_utilization,
      complication_tracking: patient.flow_analytics.complication_tracking,
      outcome_quality: patient.flow_analytics.outcome_quality,
    },
    nodes_summary: patient.nodes.map((n) => ({
      seq: n.sequence,
      action: n.decision.action,
      category: n.decision.action_category,
      department: n.logistics.location.department.name,
      risk: n.risk_assessment.mortality_risk.total,
      flags: n.historical_analysis.flags.map((f) => ({
        type: f.type,
        severity: f.severity,
        message: f.message,
      })),
      vitals: {
        bp: `${n.patient_state.vitals.blood_pressure.systolic}/${n.patient_state.vitals.blood_pressure.diastolic}`,
        hr: n.patient_state.vitals.heart_rate.value,
        spo2: n.patient_state.vitals.oxygen_saturation.value,
      },
      outcome_success: n.transition_outcome.success,
      decision_quality: n.transition_outcome.net_impact.decision_quality,
      cost: n.transition_outcome.net_impact.cost,
      complications_active: n.patient_state.complications_active.length,
    })),
  };
}

export function PatientChat({ patient }: PatientChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }, []);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || streaming) return;

      setError(null);
      const newUserMsg: ChatMessage = { role: "user", content: userMessage.trim() };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      setInput("");
      setStreaming(true);
      scrollToBottom();

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            patientContext: buildChatContext(patient),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          setError(errBody.error ?? `HTTP ${res.status}`);
          setStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        // Add empty assistant message that we'll stream into
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const current = accumulated;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: current };
            return copy;
          });
          scrollToBottom();
        }

        setStreaming(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to get response");
        }
        setStreaming(false);
      }
    },
    [messages, streaming, patient, scrollToBottom],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 shadow-lg"
        size="sm"
      >
        <ChatCircleDots size={16} weight="fill" />
        AI Chat
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2 text-base">
                  <Robot size={20} weight="fill" className="text-primary" />
                  MedGraph AI — {patient.patient_name}
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  Multi-turn clinical intelligence chat · Ask anything about this patient
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {messages.filter((m) => m.role === "user").length} messages
                </Badge>
                {messages.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat}>
                    <Trash size={14} />
                  </Button>
                )}
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col" style={{ height: "calc(85vh - 140px)" }}>
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkle size={40} className="text-primary/40 mb-3" weight="fill" />
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Ask about risks, decisions, complications, costs, or any clinical aspect of {patient.patient_name}&apos;s case.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className="rounded-full border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Robot size={14} weight="fill" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }}
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/60 animate-pulse rounded-full" />
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User size={14} weight="fill" />
                    </div>
                  )}
                </div>
              ))}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t p-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this patient..."
                  disabled={streaming}
                  className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={streaming || !input.trim()}
                >
                  {streaming ? (
                    <CircleNotch size={16} className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={16} weight="fill" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** Minimal markdown → HTML converter for chat messages */
function simpleMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold mt-2 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold mt-2 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, "<br />");
}


