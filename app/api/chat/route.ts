import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMedGemmaChatAnalysis,
  isMedGemmaConfigured,
} from "@/lib/ai/medgemma-client";
import { MEDGEMMA_CHAT } from "@/lib/ai/medgemma-prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Presentation prompt (phase 2 — OpenAI) ───

const PRESENTATION_PROMPT = `You are MedGraph AI, a senior clinical intelligence assistant embedded in a hospital decision-support platform.

You are having a multi-turn conversation with a clinician about a specific patient case. You receive a CLINICAL ANALYSIS from a specialist medical AI for each user question. Your job is to present that analysis in a clear, conversational way.

Guidelines:
1. Be precise, evidence-based, and concise (100-250 words per response)
2. Reference specific data points from the patient's graph when relevant
3. Use markdown formatting for readability
4. Highlight critical concerns with **bold** or ⚠️ emoji
5. When uncertain, clearly state limitations
6. Always relate insights back to actionable clinical decisions
7. Maintain conversation context across turns

IMPORTANT: Do NOT reference MedGemma or the "specialist AI" — present everything as your own analysis. The user should see a seamless conversational experience.`;

// ─── Fallback prompt (OpenAI-only) ───

const FALLBACK_PROMPT = `You are MedGraph AI, a senior clinical intelligence assistant embedded in a hospital decision-support platform.

You are having a multi-turn conversation with a clinician about a specific patient case. You have access to the patient's complete clinical graph data.

Your capabilities:
- Explain any aspect of the patient's care pathway, decisions, risks, vitals, complications
- Answer "what-if" clinical questions (e.g. "what if we had used drug X instead?")
- Identify patterns, anomalies, and red flags in the patient data
- Compare with historical outcomes from similar cases
- Discuss cost-effectiveness and resource utilization
- Suggest clinical decision optimizations
- Explain AI flags and risk assessments

Guidelines:
1. Be precise, evidence-based, and concise (100-250 words per response)
2. Reference specific data points from the patient's graph when relevant
3. Use markdown formatting for readability
4. Highlight critical concerns with **bold** or ⚠️ emoji
5. When uncertain, clearly state limitations
6. Always relate insights back to actionable clinical decisions
7. You can be asked follow-up questions — maintain conversation context`;

export async function POST(req: NextRequest) {
  try {
    const { messages, patientContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing messages array" },
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

    // ── Phase 1: MedGemma clinical analysis of the latest question ──

    let medGemmaAnalysis: string | null = null;

    if (isMedGemmaConfigured()) {
      try {
        // Build MedGemma messages: system prompt with patient data +
        // conversation history for context continuity
        const medGemmaSystemPrompt = `${MEDGEMMA_CHAT}\n\nPatient clinical data:\n${JSON.stringify(patientContext, null, 2)}`;

        medGemmaAnalysis = await getMedGemmaChatAnalysis({
          systemPrompt: medGemmaSystemPrompt,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          maxTokens: 1536,
        });
      } catch (err) {
        console.warn(
          "[chat] MedGemma unavailable, falling back to OpenAI-only:",
          err,
        );
      }
    }

    // ── Phase 2: OpenAI presentation (streaming) ──

    let systemContent: string;
    let openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;

    if (medGemmaAnalysis) {
      // Dual-model path: inject MedGemma analysis as context
      systemContent = `${PRESENTATION_PROMPT}\n\nPatient clinical data:\n\`\`\`json\n${JSON.stringify(patientContext, null, 2)}\n\`\`\``;

      // Include the conversation history, but augment the last user message
      // with MedGemma's clinical analysis
      const augmentedMessages = [...messages];
      const lastMsg = augmentedMessages[augmentedMessages.length - 1];
      if (lastMsg?.role === "user") {
        augmentedMessages[augmentedMessages.length - 1] = {
          ...lastMsg,
          content: `${lastMsg.content}\n\n[Clinical analysis from specialist medical AI for this question]:\n---\n${medGemmaAnalysis}\n---\n\nPresent this analysis conversationally. Do NOT mention the specialist AI.`,
        };
      }

      openaiMessages = [
        { role: "system", content: systemContent },
        ...augmentedMessages,
      ];
    } else {
      // Fallback: OpenAI-only (original behavior)
      systemContent = `${FALLBACK_PROMPT}\n\nHere is the patient's complete clinical data:\n\n\`\`\`json\n${JSON.stringify(patientContext, null, 2)}\n\`\`\``;
      openaiMessages = [{ role: "system", content: systemContent }, ...messages];
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
      messages: openaiMessages,
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
    console.error("[chat] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
