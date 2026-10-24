import "server-only";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

import { ErrorLLM, type ClienteLLM, type PeticionLLM, type RespuestaLLM } from "./types";

type Opciones = {
  apiKey: string;
  modelo: string;
  /** Endpoint compatible con OpenAI (ej. OpenRouter). Sin valor = API oficial de OpenAI. */
  baseURL?: string;
  timeoutMs?: number;
  maxTokens?: number;
};

/** Adaptador de OpenAI (Chat Completions + function calling en modo strict). Solo se importa en el servidor. */
export class ClienteOpenAI implements ClienteLLM {
  private readonly cliente: OpenAI;

  constructor(private readonly opciones: Opciones) {
    this.cliente = new OpenAI({
      apiKey: opciones.apiKey,
      ...(opciones.baseURL ? { baseURL: opciones.baseURL } : {}),
      timeout: opciones.timeoutMs ?? 20_000,
      maxRetries: 1,
    });
  }

  async completar(p: PeticionLLM): Promise<RespuestaLLM> {
    const mensajes: ChatCompletionMessageParam[] = [
      { role: "system", content: p.sistema },
      ...p.mensajes.map((m): ChatCompletionMessageParam => {
        if (m.rol === "usuario") return { role: "user", content: m.contenido };
        if (m.rol === "herramienta") return { role: "tool", tool_call_id: m.idLlamada, content: m.contenido };
        return {
          role: "assistant",
          content: m.contenido,
          ...(m.llamadas?.length
            ? {
                tool_calls: m.llamadas.map((l) => ({
                  id: l.id,
                  type: "function" as const,
                  function: { name: l.nombre, arguments: l.argumentos },
                })),
              }
            : {}),
        };
      }),
    ];

    const tools: ChatCompletionTool[] = p.herramientas.map((h) => ({
      type: "function",
      function: { name: h.nombre, description: h.descripcion, parameters: h.parametros, strict: true },
    }));

    try {
      const respuesta = await this.cliente.chat.completions.create(
        {
          model: this.opciones.modelo,
          messages: mensajes,
          max_completion_tokens: this.opciones.maxTokens ?? 3000,
          ...(tools.length
            ? {
                tools,
                parallel_tool_calls: false,
                tool_choice:
                  p.eleccion === "auto"
                    ? "auto"
                    : p.eleccion === "ninguna"
                      ? "none"
                      : { type: "function", function: { name: p.eleccion.nombre } },
              }
            : {}),
        },
        { signal: p.signal },
      );
      const mensaje = respuesta.choices[0]?.message;
      return {
        texto: mensaje?.content ?? null,
        llamadas: (mensaje?.tool_calls ?? []).flatMap((c) =>
          c.type === "function" ? [{ id: c.id, nombre: c.function.name, argumentos: c.function.arguments }] : [],
        ),
      };
    } catch (e) {
      throw traducirError(e);
    }
  }
}

function traducirError(e: unknown): ErrorLLM {
  if (e instanceof OpenAI.APIConnectionTimeoutError) return new ErrorLLM("timeout", "OpenAI no respondió a tiempo", e);
  // Cancelación por el tope de tiempo del turno (o porque el cliente cortó la conexión).
  if (e instanceof OpenAI.APIUserAbortError) return new ErrorLLM("timeout", "Se agotó el tiempo del turno", e);
  if (e instanceof OpenAI.RateLimitError) return new ErrorLLM("limite", "OpenAI rechazó por límite de uso", e);
  if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError)
    return new ErrorLLM("autenticacion", "La API key no es válida o no tiene permisos", e);
  if (e instanceof OpenAI.APIError) return new ErrorLLM("servicio", `Error de OpenAI (${e.status ?? "sin estado"})`, e);
  if (e instanceof Error && e.name === "AbortError") return new ErrorLLM("timeout", "La petición fue cancelada", e);
  return new ErrorLLM("desconocido", "Error inesperado al llamar al modelo", e);
}
