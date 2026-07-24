import OpenAI from "openai";

export const createOpenAiClient = () =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
