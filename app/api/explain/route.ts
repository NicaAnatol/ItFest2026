import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a senior clinical decision-support AI assistant embedded in a hospital intelligence platform called MedGraph AI.

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

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-key-here") {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
        { status: 500 },
      );
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the relevant data from the patient graph:\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nQuestion: ${question}`,
        },
      ],
    });

    // Return a streaming response
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
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to generate explanation" },
      { status: 500 },
    );
  }
}

