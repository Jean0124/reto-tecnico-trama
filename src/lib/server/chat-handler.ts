import "server-only";
import { z } from "zod";

import { EstadoSchema, MensajeChatSchema } from "@/lib/interview/contract";
import { EntrevistaCerradaError, ejecutarTurno } from "@/lib/interview/orchestrator";
import { ErrorLLM, type ClienteLLM } from "@/lib/llm/types";
import { ipDe, verificarAcceso, type LimitadorDeTasa } from "./proteccion";

/** Tiempo máximo de un turno completo (todas las llamadas al modelo), por debajo del maxDuration de la ruta. */
export const TIEMPO_MAX_TURNO_MS = 55_000;

/** Máximo de mensajes en una conversación (usuario + agente). */
export const MAX_MENSAJES = 40;

export const PeticionChatSchema = z.strictObject({
  mensajes: z
    .array(MensajeChatSchema)
    .min(1)
    .max(MAX_MENSAJES)
    .refine((m) => m.at(-1)?.rol === "usuario", "el último mensaje debe ser del usuario")
    .refine((m) => (m.at(-1)?.contenido.trim().length ?? 0) > 0, "el mensaje está vacío"),
  estado: EstadoSchema,
});

export type RespuestaError = { error: string; codigo: string };

const json = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status });
const fallo = (status: number, codigo: string, error: string) => json({ codigo, error } satisfies RespuestaError, status);

/**
 * Lógica HTTP del endpoint del chat, separada de Next para poder testearla con
 * un cliente LLM simulado.
 */
export async function manejarChat(
  request: Request,
  deps: {
    crearLLM: () => ClienteLLM | null;
    limitador: LimitadorDeTasa;
    password: string | undefined;
    tiempoMaxMs?: number;
  },
): Promise<Response> {
  if (!verificarAcceso(request.headers.get("x-access-password"), deps.password)) {
    return fallo(401, "no_autorizado", "Necesitás la contraseña de acceso.");
  }
  if (!deps.limitador.permitir(ipDe(request))) {
    return fallo(429, "limite", "Llegaste al límite de mensajes por ahora. Probá de nuevo en unos minutos.");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return fallo(400, "peticion_invalida", "El cuerpo no es JSON válido.");
  }
  const peticion = PeticionChatSchema.safeParse(cuerpo);
  if (!peticion.success) {
    const largo = peticion.error.issues.some((i) => i.code === "too_big");
    return fallo(
      400,
      largo ? "demasiado_largo" : "peticion_invalida",
      largo
        ? "La conversación o el mensaje es demasiado largo. Empezá una entrevista nueva o acortá el mensaje."
        : "La petición no tiene el formato esperado.",
    );
  }

  const llm = deps.crearLLM();
  if (!llm) return fallo(500, "sin_configurar", "El servidor no tiene configurada la API key.");

  try {
    const resultado = await ejecutarTurno({
      llm,
      mensajes: peticion.data.mensajes,
      estado: peticion.data.estado,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(deps.tiempoMaxMs ?? TIEMPO_MAX_TURNO_MS)]),
    });
    registrarTurno(resultado);
    return json(resultado);
  } catch (e) {
    if (e instanceof EntrevistaCerradaError)
      return fallo(409, "entrevista_cerrada", "Esta entrevista ya está confirmada. Empezá una nueva.");
    if (e instanceof ErrorLLM) {
      console.error(`[chat] ErrorLLM ${e.tipo}: ${e.message}`);
      const mapa = {
        timeout: [504, "El modelo tardó demasiado en responder. Tu mensaje sigue ahí: probá enviarlo de nuevo."],
        limite: [503, "El modelo está saturado o se alcanzó el tope de gasto. Probá en un rato."],
        autenticacion: [500, "El servidor no pudo autenticarse con el proveedor del modelo."],
        servicio: [502, "El proveedor del modelo devolvió un error. Tu mensaje sigue ahí: probá de nuevo."],
        desconocido: [502, "Algo falló al hablar con el modelo. Tu mensaje sigue ahí: probá de nuevo."],
      } as const;
      const [status, mensaje] = mapa[e.tipo];
      return fallo(status, `llm_${e.tipo}`, mensaje);
    }
    console.error("[chat] Error inesperado", e instanceof Error ? e.message : e);
    return fallo(500, "interno", "Error interno. Tu mensaje sigue ahí: probá de nuevo.");
  }
}

/** Resumen del turno en los logs del servidor (sin contenido del usuario ni la key), para diagnosticar al modelo. */
function registrarTurno(r: Awaited<ReturnType<typeof ejecutarTurno>>) {
  const eventos = r.eventos.map((e) =>
    e.tipo === "requerimiento_invalido"
      ? `requerimiento_invalido(${e.errores.slice(0, 3).join(" | ")})`
      : e.tipo === "requerimiento_registrado"
        ? `requerimiento_registrado(v${e.version})`
        : e.tipo === "cifras_bloqueadas"
          ? `cifras_bloqueadas(${e.cifras.join(", ")})`
          : e.tipo,
  );
  console.info(`[chat] turno ${r.estado.turnosUsuario} · fase=${r.fase} · ${eventos.length ? eventos.join(" ; ") : "sin herramientas"}${r.respaldo ? " · RESPUESTA DE RESPALDO (el modelo no dio texto válido)" : ""}`);
}
