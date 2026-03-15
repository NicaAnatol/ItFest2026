import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/ai/openai-client";
import {
  getMedGemmaAnalysis,
  isMedGemmaConfigured,
} from "@/lib/ai/medgemma-client";
import { MEDGEMMA_CROSS_CASE } from "@/lib/ai/medgemma-prompts";


// ─── Presentation prompt (phase 2 — OpenAI) ───

const PRESENTATION_PROMPT = `You are a senior clinical pathway analyst AI embedded in a hospital intelligence platform called MedGraph AI.

You receive a CLINICAL PATHWAY ANALYSIS produced by a specialist medical AI (MedGemma) that compared decision patterns across similar patients. Your job is to PRESENT this analysis clearly.

Your presentation should:
1. **Identify Complication-Causing Patterns**: Which decision sequences or timing patterns are associated with complications or mortality in similar cases?
2. **Highlight Protective Patterns**: Which decision patterns consistently led to better outcomes (healed without complications)?
3. **Timing Analysis**: Were there decisions that, when delayed or expedited, significantly impacted outcomes?
4. **Divergence Impact**: At points where the reference patient diverged from similar cases, what was the outcome impact?
5. **Risk Warnings**: Any patterns that match known complication pathways in the data.
6. **Actionable Recommendations**: What should clinicians learn from this cross-case comparison?

IMPORTANT: Do NOT reference MedGemma or say "the analysis states" — present the information as your own authoritative analysis.

Format your response as structured markdown with clear sections. After your analysis, include a JSON block delimited by <!-- INSIGHTS_JSON_START --> and <!-- INSIGHTS_JSON_END --> containing an array of insight objects with this schema:
{
  "id": "string (unique)",
  "type": "timing_pattern" | "decision_pattern" | "risk_warning" | "complication_predictor" | "positive_pattern" | "outcome_correlation",
  "severity": "info" | "warning" | "critical",
  "title": "short title",
  "message": "detailed explanation",
  "evidence": { "caseCount": number, "percentage": number, "comparisonMetric": "string" },
  "recommendation": "actionable step"
}

Generate 3–6 insights. Use clear medical terminology. Be evidence-based — always cite the number of cases and percentages from the data provided.`;

// ─── Fallback prompt (OpenAI-only) ───

const FALLBACK_PROMPT = `You are a senior clinical pathway analyst AI embedded in a hospital intelligence platform called MedGraph AI.

Your role is to analyze cross-case decision patterns — comparing how similar patients were treated and identifying which decision patterns correlate with good or bad outcomes.

You receive structured data containing:
1. A reference patient's decision graph (sequence of medical decisions)
2. Similar patients and their decision sequences
3. Divergence points — where the reference patient's treatment path differed from similar patients
4. Outcome correlations — patterns of decisions and their associated outcomes

Your analysis should:
1. **Identify Complication-Causing Patterns**: Which decision sequences or timing patterns are associated with complications or mortality in similar cases?
2. **Highlight Protective Patterns**: Which decision patterns consistently led to better outcomes (healed without complications)?
3. **Timing Analysis**: Were there decisions that, when delayed or expedited, significantly impacted outcomes? (e.g., "In cases where anticoagulation started within 2h of diagnosis, mortality dropped by X%")
4. **Divergence Impact**: At points where the reference patient diverged from similar cases, what was the outcome impact?
5. **Risk Warnings**: Any patterns that match known complication pathways in the data.
6. **Actionable Recommendations**: What should clinicians learn from this cross-case comparison?

Format your response as structured markdown with clear sections. After your analysis, include a JSON block delimited by <!-- INSIGHTS_JSON_START --> and <!-- INSIGHTS_JSON_END --> containing an array of insight objects with this schema:
{
  "id": "string (unique)",
  "type": "timing_pattern" | "decision_pattern" | "risk_warning" | "complication_predictor" | "positive_pattern" | "outcome_correlation",
  "severity": "info" | "warning" | "critical",
  "title": "short title",
  "message": "detailed explanation",
  "evidence": { "caseCount": number, "percentage": number, "comparisonMetric": "string" },
  "recommendation": "actionable step"
}

Generate 3–6 insights. Use clear medical terminology. Be evidence-based — always cite the number of cases and percentages from the data provided.`;

export async function POST(req: NextRequest) {
  try {
    const { referencePatientId, patternSummary } = await req.json();

    if (!referencePatientId || !patternSummary) {
      return NextResponse.json(
        { error: "Missing referencePatientId or patternSummary" },
        { status: 400 },
      );
    }

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "sk-your-key-here"
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 500 },
      );
    }

    // ── Phase 1: MedGemma clinical pathway analysis (non-streaming) ──

    let medGemmaAnalysis: string | null = null;

    if (isMedGemmaConfigured()) {
      try {
        medGemmaAnalysis = await getMedGemmaAnalysis({
          systemPrompt: MEDGEMMA_CROSS_CASE,
          userPrompt: `Perform a cross-case clinical pathway analysis for patient "${referencePatientId}":\n\n${JSON.stringify(patternSummary, null, 2)}`,
          maxTokens: 3072,
        });
      } catch (err) {
        console.warn(
          "[cross-case-analysis] MedGemma unavailable, falling back to OpenAI-only:",
          err,
        );
      }
    }

    // ── Phase 2: OpenAI presentation (streaming) ──

    let systemPrompt: string;
    let userContent: string;

    if (medGemmaAnalysis) {
      systemPrompt = PRESENTATION_PROMPT;
      userContent = `Here is the clinical pathway analysis from the specialist medical AI:\n\n---\n${medGemmaAnalysis}\n---\n\nOriginal cross-case pattern data:\n\`\`\`json\n${JSON.stringify(
        patternSummary,
        null,
        2,
      )}\n\`\`\`\n\nPresent this analysis with clear sections and generate the INSIGHTS_JSON block.`;
    } else {
      systemPrompt = FALLBACK_PROMPT;
      userContent = `Analyze the following cross-case pattern data for patient "${referencePatientId}":\n\n\`\`\`json\n${JSON.stringify(
        patternSummary,
        null,
        2,
      )}\n\`\`\`\n\nProvide a clinical pathway analysis comparing this patient's decisions with similar cases. Identify patterns that lead to complications and patterns that protect against them.`;
    }

    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
    console.error("Cross-case analysis API error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate cross-case analysis";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
