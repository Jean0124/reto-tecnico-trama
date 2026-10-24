import type { Contexto, EstadoEntrevista } from "./contract";

/**
 * Máquina de fases de la entrevista. Es código determinista: el LLM no decide
 * en qué fase está, solo aporta datos (vía tools) y el motor calcula la fase.
 *
 *   delimitar ──(decisión + entidades + período, o tope de turnos)──▶ proponer
 *   proponer  ──(requerimiento válido registrado)───────────────────▶ revisar
 *   revisar   ──(ajuste del usuario → nueva versión)────────────────▶ revisar
 *   revisar   ──(usuario confirma en el panel)──────────────────────▶ confirmado
 */
export type Fase = "delimitar" | "proponer" | "revisar" | "confirmado";

export const FASES: { id: Fase; etiqueta: string }[] = [
  { id: "delimitar", etiqueta: "Delimitar" },
  { id: "proponer", etiqueta: "Proponer y pedir" },
  { id: "revisar", etiqueta: "Revisar" },
  { id: "confirmado", etiqueta: "Confirmado" },
];

/** Turnos del usuario tras los cuales se deja de preguntar y se propone con lo que haya. */
export const MAX_TURNOS_DELIMITAR = 4;
/** Turnos tras los cuales el agente está obligado a registrar un requerimiento. */
export const MAX_TURNOS_SIN_PROPUESTA = 6;

export type CampoContexto = "decision" | "entidades" | "periodo" | "sospecha";

const ETIQUETAS: Record<CampoContexto, string> = {
  decision: "qué decisión se quiere tomar",
  entidades: "sobre qué entidades (personas, procesos, productos…)",
  periodo: "en qué período",
  sospecha: "cuál es la sospecha o hipótesis inicial",
};

/** Campos sin los cuales no se puede proponer un modelo. La sospecha se pide, pero es opcional. */
const OBLIGATORIOS: CampoContexto[] = ["decision", "entidades", "periodo"];

export function camposFaltantes(ctx: Contexto): CampoContexto[] {
  const falta: CampoContexto[] = [];
  if (!ctx.decision?.trim()) falta.push("decision");
  if (ctx.entidades.filter((e) => e.trim()).length === 0) falta.push("entidades");
  if (!ctx.periodo?.trim()) falta.push("periodo");
  if (!ctx.sospecha?.trim()) falta.push("sospecha");
  return falta;
}

export function describirFaltantes(campos: CampoContexto[]): string[] {
  return campos.map((c) => ETIQUETAS[c]);
}

export function calcularFase(estado: EstadoEntrevista): Fase {
  if (estado.confirmado) return "confirmado";
  if (estado.versiones.length > 0) return "revisar";
  const obligatoriosFaltantes = camposFaltantes(estado.contexto).filter((c) => OBLIGATORIOS.includes(c));
  if (obligatoriosFaltantes.length === 0 || estado.turnosUsuario >= MAX_TURNOS_DELIMITAR) return "proponer";
  return "delimitar";
}

/** Si el agente ya no puede seguir preguntando: debe registrar un requerimiento sí o sí. */
export function debeForzarRegistro(estado: EstadoEntrevista): boolean {
  return calcularFase(estado) === "proponer" && estado.turnosUsuario >= MAX_TURNOS_SIN_PROPUESTA;
}

export type NombreHerramienta = "registrar_contexto" | "registrar_requerimiento";

export function herramientasDisponibles(fase: Fase): NombreHerramienta[] {
  switch (fase) {
    case "delimitar":
      return ["registrar_contexto"];
    case "proponer":
    case "revisar":
      return ["registrar_contexto", "registrar_requerimiento"];
    case "confirmado":
      return [];
  }
}

/** Fusiona lo que el agente registró: un valor nulo o vacío nunca borra lo ya sabido. */
export function fusionarContexto(actual: Contexto, nuevo: Partial<Contexto>): Contexto {
  const texto = (n: string | null | undefined, a: string | null) => (n && n.trim() ? n.trim() : a);
  const lista = (n: string[] | undefined, a: string[]) => {
    const limpia = (n ?? []).map((x) => x.trim()).filter(Boolean);
    return limpia.length ? Array.from(new Set(limpia)) : a;
  };
  return {
    decision: texto(nuevo.decision, actual.decision),
    entidades: lista(nuevo.entidades, actual.entidades),
    periodo: texto(nuevo.periodo, actual.periodo),
    sospecha: texto(nuevo.sospecha, actual.sospecha),
    unidades: lista(nuevo.unidades, actual.unidades),
  };
}
