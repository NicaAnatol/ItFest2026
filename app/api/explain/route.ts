import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/ai/openai-client";
import {
  getMedGemmaAnalysis,
  isMedGemmaConfigured,
} from "@/lib/ai/medgemma-client";
import { MEDGEMMA_NODE_EXPLAIN, MEDGEMMA_FLAG_EXPLAIN } from "@/lib/ai/medgemma-prompts";


// ─── Presentation prompt for OpenAI (phase 2) ───

const PRESENTATION_PROMPT = `You are a senior clinical decision-support AI assistant embedded in a hospital intelligence platform called MedGraph AI.

You receive a CLINICAL ANALYSIS produced by a specialist medical AI (MedGemma) that analyzed raw patient graph data. Your job is to PRESENT this analysis clearly for clinicians and hospital administrators.

Presentation rules:
1. Use clear medical terminology but also explain it for non-specialists when appropriate.
2. Highlight the most clinically significant aspects first.
3. If there are AI flags or risks, explain WHY they matter and what the clinician should watch for.
4. Reference the historical data (similar cases, outcome rates) to give evidence-based context.
5. For cost analysis, frame it in terms of value — cost per outcome, not just raw numbers.
6. Keep explanations concise but thorough — aim for 150-300 words.
7. Use bullet points and structure for readability.
8. When discussing complications, explain the causal chain (what led to what).
9. Always end with a brief actionable takeaway or key insight.

IMPORTANT: Do NOT say "according to the analysis" or reference MedGemma — present the information as your own authoritative explanation. The user should see a seamless, polished answer.

Respond in English. Use markdown formatting (headers, bold, bullet points) for readability.`;

// ─── Flag-specific presentation prompt for OpenAI (phase 2) ───

const FLAG_PRESENTATION_PROMPT = `You are a senior clinical decision-support AI assistant embedded in a hospital intelligence platform called MedGraph AI.

You receive a CLINICAL FLAG ANALYSIS produced by a specialist medical AI (MedGemma) that analyzed why specific AI flags were raised on a patient's clinical decision node. Your job is to PRESENT this analysis as a clear, actionable explanation for clinicians.

Structure your response as follows:

## 1. Why This Decision Was Flagged
For EACH flag, explain in plain but medically accurate language:
- **What triggered it:** The specific clinical values or conditions, AND how the chosen decision interacts with them to create risk.
- **Decision context:** Why choosing THIS action (vs the alternatives) is what caused the flag. Would an alternative have been safer?
- Use 🔴 for CRITICAL flags, ⚠️ for WARNING flags, ℹ️ for INFO flags.

## 2. Evidence from Similar Patients
- Cite the similar-case cohort: "Of **N** similar patients, **X%** healed, **Y%** had complications, **Z%** died."
- Reference matched care patterns: "This follows the **[pattern name]** pathway (**X%** similarity) which has a **Y%** mortality rate."
- If deadly patterns are matched, highlight them prominently.
- Compare alternative treatment outcomes if data is available: "Patients who received **[alternative]** instead had **X%** mortality vs **Y%** for the chosen approach."

## 3. Risk Chain & Interactions
- Explain what specific patient factors (vitals, medications, age) combine with this decision to elevate risk.
- Highlight any drug interactions or overlapping decision risks.

## 4. Recommended Actions (Prioritized)
- Numbered list, most urgent first. Be specific: drug names, doses, monitoring protocols, timing.

IMPORTANT: Do NOT say "according to the analysis" or reference MedGemma. Present the information as your own authoritative clinical assessment. Always cite specific numbers from the data. Be direct and actionable.

Respond in English. Use markdown formatting (headers, bold, bullet points) for readability.`;

// ─── Fallback prompt for flags when MedGemma is unavailable ───

const FLAG_FALLBACK_PROMPT = `You are a senior clinical decision-support AI assistant embedded in a hospital intelligence platform called MedGraph AI.

Your role is to explain WHY specific clinical AI flags were raised on a patient's decision node. The system generates flags when it detects elevated risk, deadly pattern matches, drug interactions, or guideline deviations.

The data you receive includes: the decision made (action, reasoning, alternatives with historical outcomes), the patient's clinical state, risk assessment, flags with evidence, similar-case cohort data, and matched clinical patterns.

Structure your response as follows:

## 1. Why This Decision Was Flagged
For each flag:
- Explain what clinical data triggered it AND how the chosen decision interacts with those conditions.
- Would any of the considered alternatives have avoided this flag? Reference their historical outcome data.
- Use 🔴 for CRITICAL, ⚠️ for WARNING, ℹ️ for INFO.

## 2. Evidence from Similar Patients
- "Of **N** similar patients, **X%** healed, **Y%** died."
- Reference matched patterns with similarity scores and outcomes.
- Compare alternative treatment outcomes from the data.
- Highlight deadly patterns if present.

## 3. Risk Chain & Interactions
- What patient factors combine with this decision to elevate risk?
- Drug interactions, overlapping decision risks.

## 4. Recommended Actions (Prioritized)
- Numbered, most urgent first. Specific drug names, doses, monitoring.

Be medically precise but also understandable. Always cite specific numbers from the data. Use markdown formatting for readability.`;

// ─── Fallback prompt when MedGemma is unavailable ───

const FALLBACK_PROMPT = `You are a senior clinical decision-support AI assistant embedded in a hospital intelligence platform called MedGraph AI.

Your role is to explain medical events, decisions, risks, complications, and costs to clinicians and hospital administrators in a clear, concise, and medically accurate way.

Context about the system:
- Each patient is modeled as a directed graph where nodes represent clinical decision points (admission, triage, diagnostic, treatment, monitoring, consultation, transfer, procedure, discharge).
- Each node contains: patient state (vitals, labs, diagnosis), the decision made, risk assessment, AI flags/alerts, historical analysis from similar cases, execution details, and transition outcomes.
- The system tracks complications, cost, and decision quality throughout the entire patient journey.
- AI flags are generated when a decision has elevated risk, matches a deadly pattern, or has drug interactions.

When explaining:
1. Use clear medical terminology but also explain it for non-specialists when appropriate.
2. Highlight the most clinically significant aspects first.
3. If there are AI flags or risks, explain WHY they matter and what the clinician should watch for.
4. Reference the historical data (similar cases, outcome rates) to give evidence-based context.
5. For cost analysis, frame it in terms of value — cost per outcome, not just raw numbers.
6. Keep explanations concise but thorough — aim for 150-300 words.
7. Use bullet points and structure for readability.
8. When discussing complications, explain the causal chain (what led to what).
9. Always end with a brief actionable takeaway or key insight.

Respond in English. Use markdown formatting (headers, bold, bullet points) for readability.`;

export async function POST(req: NextRequest) {
  try {
    const { context, question } = await req.json();

    if (!context || !question) {
      return NextResponse.json(
        { error: "Missing context or question" },
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

    // ── Detect flag-explain request ──
    // Flag context includes 'deadly_patterns' and 'flags' as top-level keys
    const isFlagExplain =
      context &&
      typeof context === "object" &&
      "deadly_patterns" in context &&
      "flags" in context &&
      Array.isArray(context.flags);

    // ── Phase 1: MedGemma clinical analysis (non-streaming) ──

    let medGemmaAnalysis: string | null = null;

    if (isMedGemmaConfigured()) {
      try {
        const medGemmaPrompt = isFlagExplain ? MEDGEMMA_FLAG_EXPLAIN : MEDGEMMA_NODE_EXPLAIN;
        const medGemmaUserPrompt = isFlagExplain
          ? `Analyze why this clinical node was flagged. Here is the full node data with flags, deadly patterns, and patient state:\n\n${JSON.stringify(context, null, 2)}\n\nClinical question: ${question}`
          : `Analyze this patient graph data:\n\n${JSON.stringify(context, null, 2)}\n\nClinical question: ${question}`;

        medGemmaAnalysis = await getMedGemmaAnalysis({
          systemPrompt: medGemmaPrompt,
          userPrompt: medGemmaUserPrompt,
          maxTokens: isFlagExplain ? 3072 : 2048,
        });
      } catch (err) {
        console.warn("[explain] MedGemma unavailable, falling back to OpenAI-only:", err);
      }
    }

    // ── Phase 2: OpenAI presentation (streaming) ──

    let systemPrompt: string;
    let userContent: string;

    if (medGemmaAnalysis) {
      systemPrompt = isFlagExplain ? FLAG_PRESENTATION_PROMPT : PRESENTATION_PROMPT;
      userContent = `Here is the clinical analysis from the specialist medical AI:\n\n---\n${medGemmaAnalysis}\n---\n\nOriginal clinical data context:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nOriginal question: ${question}\n\nPresent this analysis clearly and concisely for the clinician.`;
    } else {
      systemPrompt = isFlagExplain ? FLAG_FALLBACK_PROMPT : FALLBACK_PROMPT;
      userContent = `Here is the relevant data from the patient graph:\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nQuestion: ${question}`;
    }

    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: isFlagExplain ? 2048 : 1024,
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
    console.error("Explain API error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate explanation";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
