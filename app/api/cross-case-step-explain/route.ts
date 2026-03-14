import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMedGemmaAnalysis,
  isMedGemmaConfigured,
} from "@/lib/ai/medgemma-client";
import { MEDGEMMA_STEP_EXPLAIN } from "@/lib/ai/medgemma-prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Presentation prompt (phase 2 — OpenAI) ───

const PRESENTATION_PROMPT = `You are a senior clinical decision-support AI embedded in MedGraph AI, a hospital intelligence platform.

You receive a CLINICAL STAGE ANALYSIS produced by a specialist medical AI that analyzed a single stage in a cross-case comparison graph. Your job is to present it clearly.

Your presentation should:
1. **Summarize the stage** — What is this stage about? What clinical moment does it represent?
2. **Reference patient** — What did the reference patient do? Was it appropriate?
3. **Per-patient breakdown** — For each compared patient, briefly explain:
   - What action they took (same or different from reference)
   - Key risk/quality indicators
   - Whether this was a divergence point and what it may mean
4. **Pattern insight** — What pattern emerges? Did most patients do the same thing? Did patients with worse outcomes diverge here?
5. **Clinical takeaway** — One sentence: what's the key learning from this stage?

IMPORTANT: Do NOT reference MedGemma or say "according to the analysis" — present as your own explanation.

Keep it concise but informative — aim for 200-400 words total. Use markdown formatting with **bold** for patient names and key terms. Use bullet points for per-patient breakdowns. Group patients by outcome when it helps clarify patterns.

Do NOT repeat raw data — interpret it. Focus on clinical significance.`;

// ─── Fallback prompt (OpenAI-only) ───

const FALLBACK_PROMPT = `You are a senior clinical decision-support AI embedded in MedGraph AI, a hospital intelligence platform.

You are explaining a SINGLE STAGE in a cross-case comparison graph. The user is stepping through stages one-by-one to understand what happened at each point across multiple similar patients.

You receive:
- The stage label (e.g., "Diagnostic #2", "Treatment #3")
- The reference patient's action at this stage
- Each compared patient's action at this stage, including their final outcome
- Any divergence information (where a patient's action differed from the reference)

Your explanation should:
1. **Summarize the stage** — What is this stage about? What clinical moment does it represent?
2. **Reference patient** — What did the reference patient do? Was it appropriate?
3. **Per-patient breakdown** — For each compared patient, briefly explain:
   - What action they took (same or different from reference)
   - Key risk/quality indicators
   - Whether this was a divergence point and what it may mean
4. **Pattern insight** — What pattern emerges? Did most patients do the same thing? Did patients with worse outcomes diverge here?
5. **Clinical takeaway** — One sentence: what's the key learning from this stage?

Keep it concise but informative — aim for 200-400 words total. Use markdown formatting with **bold** for patient names and key terms. Use bullet points for per-patient breakdowns. Group patients by outcome when it helps clarify patterns.

Do NOT repeat raw data — interpret it. Focus on clinical significance.`;

export async function POST(req: NextRequest) {
  try {
    const { stageData } = await req.json();

    if (!stageData) {
      return NextResponse.json(
        { error: "Missing stageData" },
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

    // ── Phase 1: MedGemma clinical stage analysis (non-streaming) ──

    let medGemmaAnalysis: string | null = null;

    if (isMedGemmaConfigured()) {
      try {
        medGemmaAnalysis = await getMedGemmaAnalysis({
          systemPrompt: MEDGEMMA_STEP_EXPLAIN,
          userPrompt: `Analyze this stage in the cross-case comparison:\n\n${JSON.stringify(stageData, null, 2)}`,
          maxTokens: 2048,
        });
      } catch (err) {
        console.warn("[step-explain] MedGemma unavailable, falling back to OpenAI-only:", err);
      }
    }

    // ── Phase 2: OpenAI presentation (streaming) ──

    let systemPrompt: string;
    let userContent: string;

    if (medGemmaAnalysis) {
      systemPrompt = PRESENTATION_PROMPT;
      userContent = `Here is the clinical stage analysis from the specialist medical AI:\n\n---\n${medGemmaAnalysis}\n---\n\nOriginal stage data:\n\`\`\`json\n${JSON.stringify(stageData, null, 2)}\n\`\`\`\n\nPresent this analysis clearly, highlighting divergences and patterns.`;
    } else {
      systemPrompt = FALLBACK_PROMPT;
      userContent = `Explain what happened at this stage in the cross-case comparison:\n\n\`\`\`json\n${JSON.stringify(stageData, null, 2)}\n\`\`\`\n\nGive a clear, clinical explanation of this stage for each patient. Highlight divergences and patterns.`;
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
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
  } catch (error: any) {
    console.error("Step explain API error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to generate step explanation" },
      { status: 500 },
    );
  }
}
