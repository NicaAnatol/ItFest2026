import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/ai/openai-client";
import {
  getMedGemmaAnalysis,
  isMedGemmaConfigured,
} from "@/lib/ai/medgemma-client";
import { MEDGEMMA_OPTIMIZE } from "@/lib/ai/medgemma-prompts";


// ─── Presentation prompt (phase 2 — OpenAI) ───

const PRESENTATION_PROMPT = `You are MedGraph AI's Pathway Optimizer — a clinical decision intelligence engine.

You receive a CLINICAL PATHWAY AUDIT produced by a specialist medical AI that analyzed the patient's complete pathway. Your job is to present it as a clear, actionable optimization report.

Format your response as:
## 📊 Pathway Assessment
Overall quality grade (A-F) and brief summary

## ✅ Optimal Decisions
List decisions that were well-made and why

## ⚠️ Suboptimal Decisions
List decisions that could be improved, with specific alternatives

## 🔄 Recommended Optimized Pathway
Step-by-step alternative pathway with expected outcomes

## 📈 Expected Improvements
- Estimated mortality risk reduction
- Estimated complication prevention
- Estimated cost savings
- Estimated LOS reduction

## 🔑 Key Takeaways
Top 3 actionable lessons from this case

IMPORTANT: Do NOT reference MedGemma or the "specialist AI" — present as your own analysis.

Be evidence-based, specific, and actionable. Reference the actual data. Keep to 400-600 words.`;

// ─── Fallback prompt (OpenAI-only) ───

const FALLBACK_PROMPT = `You are MedGraph AI's Pathway Optimizer — a clinical decision intelligence engine.

Given a patient's complete clinical pathway (actual decisions, outcomes, costs, complications), you must:

1. **Evaluate** the actual pathway: identify which decisions were optimal and which were suboptimal
2. **Propose** an optimized alternative pathway: what SHOULD have been done differently
3. **Quantify** the expected improvements: reduced risk, fewer complications, lower cost, shorter LOS
4. **Identify** the critical divergence points: where the actual path deviated from the optimal

Format your response as:
## 📊 Pathway Assessment
Overall quality grade (A-F) and brief summary

## ✅ Optimal Decisions
List decisions that were well-made and why

## ⚠️ Suboptimal Decisions
List decisions that could be improved, with specific alternatives

## 🔄 Recommended Optimized Pathway
Step-by-step alternative pathway with expected outcomes

## 📈 Expected Improvements
- Estimated mortality risk reduction
- Estimated complication prevention
- Estimated cost savings
- Estimated LOS reduction

## 🔑 Key Takeaways
Top 3 actionable lessons from this case

Be evidence-based, specific, and actionable. Reference the actual data. Keep to 400-600 words.`;

export async function POST(req: NextRequest) {
  try {
    const { patientContext } = await req.json();

    if (!patientContext) {
      return NextResponse.json(
        { error: "Missing patient context" },
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

    // ── Phase 1: MedGemma clinical pathway audit (non-streaming) ──

    let medGemmaAnalysis: string | null = null;

    if (isMedGemmaConfigured()) {
      try {
        medGemmaAnalysis = await getMedGemmaAnalysis({
          systemPrompt: MEDGEMMA_OPTIMIZE,
          userPrompt: `Perform a clinical pathway audit on this patient's data:\n\n${JSON.stringify(patientContext, null, 2)}`,
          maxTokens: 3072,
        });
      } catch (err) {
        console.warn("[optimize] MedGemma unavailable, falling back to OpenAI-only:", err);
      }
    }

    // ── Phase 2: OpenAI presentation (streaming) ──

    let systemPrompt: string;
    let userContent: string;

    if (medGemmaAnalysis) {
      systemPrompt = PRESENTATION_PROMPT;
      userContent = `Here is the clinical pathway audit from the specialist medical AI:\n\n---\n${medGemmaAnalysis}\n---\n\nOriginal patient data:\n\`\`\`json\n${JSON.stringify(patientContext, null, 2)}\n\`\`\`\n\nPresent this as a polished optimization report following the required format.`;
    } else {
      systemPrompt = FALLBACK_PROMPT;
      userContent = `Analyze this patient's clinical pathway and generate an optimized alternative:\n\n\`\`\`json\n${JSON.stringify(patientContext, null, 2)}\n\`\`\``;
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
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[optimize] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
