import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a senior clinical pathway analyst AI embedded in a hospital intelligence platform called MedGraph AI.

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

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze the following cross-case pattern data for patient "${referencePatientId}":\n\n\`\`\`json\n${JSON.stringify(patternSummary, null, 2)}\n\`\`\`\n\nProvide a clinical pathway analysis comparing this patient's decisions with similar cases. Identify patterns that lead to complications and patterns that protect against them.`,
        },
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
    console.error("Cross-case analysis API error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to generate cross-case analysis" },
      { status: 500 },
    );
  }
}

