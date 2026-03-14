// MedGemma client — calls google/medgemma-27b-text-it via a Hugging Face
// Inference Endpoint running vLLM (OpenAI-compatible API).

import OpenAI from "openai";

// ─── Singleton client ───

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  const baseURL = process.env.HF_ENDPOINT_URL
    ? `${process.env.HF_ENDPOINT_URL.replace(/\/+$/, "")}/v1`
    : "https://u1tfmic38k4ppwtm.us-east-1.aws.endpoints.huggingface.cloud/v1";

  _client ??= new OpenAI({
    apiKey: process.env.HF_TOKEN,
    baseURL,
  });
  return _client;
}

// ─── Configuration ───

/** Model ID served by the vLLM endpoint */
function getModel(): string {
  return process.env.HF_MODEL_ID ?? "google/medgemma-27b-text-it";
}

export function isMedGemmaConfigured(): boolean {
  return Boolean(
    process.env.HF_TOKEN && process.env.HF_TOKEN !== "hf_your-token-here",
  );
}

// ─── Core helper — non-streaming completion ───

export interface MedGemmaOptions {
  /** System prompt (clinical analysis instructions) */
  systemPrompt: string;
  /** User message with raw clinical data */
  userPrompt: string;
  /** Max tokens for the response (default 2048) */
  maxTokens?: number;
  /** Sampling temperature (default 0.2 — deterministic clinical reasoning) */
  temperature?: number;
}

/**
 * Send clinical data to MedGemma for structured medical analysis.
 *
 * Returns the full text response (non-streaming) so we can pipe it into
 * OpenAI for presentation formatting in a second pass.
 *
 * Throws on network / API errors — callers should handle fallback.
 */
export async function getMedGemmaAnalysis(
  opts: MedGemmaOptions,
): Promise<string> {
  const client = getClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    stream: false,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Multi-turn variant for the chat route — sends full conversation history
 * to MedGemma and returns its analysis.
 */
export async function getMedGemmaChatAnalysis(opts: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    stream: false,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: "system", content: opts.systemPrompt },
      ...opts.messages,
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

