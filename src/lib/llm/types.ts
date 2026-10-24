/**
 * Interfaz propia del proveedor de LLM. La lógica de la entrevista solo conoce
 * esto; OpenAI es una implementación (ver ./openai.ts). Cambiar de proveedor =
 * escribir otro adaptador, sin tocar la entrevista.
 */

export type LlamadaHerramienta = {
  id: string;
  nombre: string;
  /** Argumentos en JSON tal cual los devolvió el modelo (pueden venir mal formados). */
  argumentos: string;
};

export type MensajeLLM =
  | { rol: "usuario"; contenido: string }
  | { rol: "agente"; contenido: string | null; llamadas?: LlamadaHerramienta[] }
  | { rol: "herramienta"; idLlamada: string; contenido: string };

export type DefinicionHerramienta = {
  nombre: string;
  descripcion: string;
  parametros: Record<string, unknown>;
};

export type EleccionHerramienta = "auto" | "ninguna" | { nombre: string };

export type PeticionLLM = {
  sistema: string;
  mensajes: MensajeLLM[];
  herramientas: DefinicionHerramienta[];
  eleccion: EleccionHerramienta;
  signal?: AbortSignal;
};

export type RespuestaLLM = {
  texto: string | null;
  llamadas: LlamadaHerramienta[];
};

export interface ClienteLLM {
  completar(peticion: PeticionLLM): Promise<RespuestaLLM>;
}

export type TipoErrorLLM = "timeout" | "limite" | "autenticacion" | "servicio" | "desconocido";

export class ErrorLLM extends Error {
  constructor(
    public readonly tipo: TipoErrorLLM,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorLLM";
  }
}
