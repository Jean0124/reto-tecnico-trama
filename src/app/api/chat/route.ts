import { manejarChat } from "@/lib/server/chat-handler";
import { LimitadorDeTasa } from "@/lib/server/proteccion";
import { ClienteOpenAI } from "@/lib/llm/openai";
import { ClienteDemo } from "@/lib/llm/demo";

export const maxDuration = 60;

const limitador = new LimitadorDeTasa(
  Number(process.env.RATE_LIMIT_MAX ?? 30),
  Number(process.env.RATE_LIMIT_WINDOW_MS ?? 10 * 60_000),
);

export async function POST(request: Request) {
  return manejarChat(request, {
    limitador,
    password: process.env.ACCESS_PASSWORD || undefined,
    tiempoMaxMs: Number(process.env.TURNO_TIMEOUT_MS) || undefined,
    crearLLM: () => {
      if (process.env.LLM_SIMULADO === "1") return new ClienteDemo();
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;
      return new ClienteOpenAI({
        apiKey,
        modelo: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        baseURL: process.env.OPENAI_BASE_URL || undefined,
        timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || undefined,
      });
    },
  });
}
