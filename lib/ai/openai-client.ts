// Lazy-initialized OpenAI client singleton.
// Avoids crashing at build time when OPENAI_API_KEY is not set.

import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  _openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

