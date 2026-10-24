import { z } from "zod";

/**
 * Contrato de salida: RequerimientoMotor.
 *
 * Es la forma base del reto con UNA extensión: cada columna mínima lleva su
 * propia justificación (`columnas_minimas: [{ nombre, justifica }]`), porque la
 * regla dice que "cada fuente y cada columna pedida debe estar justificada" y
 * con una lista de strings eso no se puede verificar en el servidor.
 *
 * Todos los campos son obligatorios (sin opcionales) para que el mismo esquema
 * sirva en modo `strict` de function calling de OpenAI.
 */

export const TIPOS_FUENTE = ["excel", "csv", "pdf", "crm-export"] as const;
export const COMPLETITUD = ["suficiente_para_confirmar", "faltan_datos"] as const;

const texto = z.string().trim().min(1, "no puede estar vacío");

export const RelacionSchema = z.strictObject({
  sujeto: texto,
  predicado: texto,
  objeto: texto,
});

export const ReglaSchema = z.strictObject({
  id: z.string().regex(/^R\d+$/, "el id de regla debe tener la forma R1, R2…"),
  enunciado: texto,
});

export const ColumnaSchema = z.strictObject({
  nombre: texto,
  justifica: z.array(texto).min(1, "cada columna debe justificarse con al menos una clase, relación o regla"),
});

export const FuenteSchema = z.strictObject({
  nombre: texto,
  tipo: z.enum(TIPOS_FUENTE),
  columnas_minimas: z.array(ColumnaSchema).min(1, "cada fuente debe pedir al menos una columna"),
  justifica: z.array(texto).min(1, "cada fuente debe justificarse con al menos una clase, relación o regla"),
});

export const RequerimientoMotorSchema = z.strictObject({
  necesidad: texto,
  decision_objetivo: texto,
  alcance: z.strictObject({
    periodo: texto,
    unidades: z.array(texto),
  }),
  esquema: z.strictObject({
    clases: z.array(texto).min(1, "debe haber al menos una clase"),
    relaciones: z.array(RelacionSchema),
  }),
  reglas_candidatas: z.array(ReglaSchema),
  fuentes_requeridas: z.array(FuenteSchema),
  preguntas_abiertas: z.array(texto),
  completitud: z.enum(COMPLETITUD),
});

export type RequerimientoMotor = z.infer<typeof RequerimientoMotorSchema>;
export type Fuente = z.infer<typeof FuenteSchema>;

/**
 * Lo que el agente va delimitando durante la entrevista. Campos nulos o
 * vacíos = todavía no se sabe.
 */
export const ContextoSchema = z.strictObject({
  decision: z.string().nullable(),
  entidades: z.array(z.string()),
  periodo: z.string().nullable(),
  sospecha: z.string().nullable(),
  unidades: z.array(z.string()),
});

export type Contexto = z.infer<typeof ContextoSchema>;

export const CONTEXTO_VACIO: Contexto = {
  decision: null,
  entidades: [],
  periodo: null,
  sospecha: null,
  unidades: [],
};

/** Estado completo de la entrevista; vive en el cliente y viaja en cada request. */
export const EstadoSchema = z.strictObject({
  contexto: ContextoSchema,
  versiones: z.array(RequerimientoMotorSchema).max(30),
  confirmado: z.boolean(),
  turnosUsuario: z.number().int().min(0),
});

export type EstadoEntrevista = z.infer<typeof EstadoSchema>;

export const ESTADO_INICIAL: EstadoEntrevista = {
  contexto: CONTEXTO_VACIO,
  versiones: [],
  confirmado: false,
  turnosUsuario: 0,
};

export const MensajeChatSchema = z.strictObject({
  rol: z.enum(["usuario", "agente"]),
  contenido: z.string().max(4000),
});

export type MensajeChat = z.infer<typeof MensajeChatSchema>;

/** JSON Schema para las tools (modo strict de OpenAI). */
export function aJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  return limpiarParaStrict(json) as Record<string, unknown>;
}

/** OpenAI strict no acepta algunas palabras clave de validación; se validan igual con Zod. */
function limpiarParaStrict(nodo: unknown): unknown {
  if (Array.isArray(nodo)) return nodo.map(limpiarParaStrict);
  if (nodo && typeof nodo === "object") {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(nodo)) {
      if (["minLength", "maxLength", "minItems", "maxItems", "pattern", "minimum", "maximum"].includes(k)) continue;
      salida[k] = limpiarParaStrict(v);
    }
    return salida;
  }
  return nodo;
}
