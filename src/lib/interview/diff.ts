import type { RequerimientoMotor } from "./contract";

/**
 * Qué cambió entre dos versiones del requerimiento, para mostrarlo en el panel.
 * Las fuentes se comparan por nombre, las columnas por nombre dentro de su
 * fuente y las reglas por id (ignorando mayúsculas, tildes y espacios).
 */
export type CambioFuente = {
  estado: "nueva" | "cambiada" | "igual";
  tipoAnterior?: string;
  columnasNuevas: Set<string>;
  columnasQuitadas: string[];
};

export type DiffRequerimiento = {
  fuentes: Map<string, CambioFuente>;
  fuentesQuitadas: string[];
  reglas: Map<string, "nueva" | "cambiada">;
  reglasQuitadas: string[];
  clasesNuevas: string[];
  hayCambios: boolean;
};

export const clave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function compararVersiones(anterior: RequerimientoMotor, actual: RequerimientoMotor): DiffRequerimiento {
  const previas = new Map(anterior.fuentes_requeridas.map((f) => [clave(f.nombre), f]));
  const fuentes = new Map<string, CambioFuente>();

  for (const f of actual.fuentes_requeridas) {
    const previa = previas.get(clave(f.nombre));
    if (!previa) {
      fuentes.set(clave(f.nombre), {
        estado: "nueva",
        columnasNuevas: new Set(f.columnas_minimas.map((c) => clave(c.nombre))),
        columnasQuitadas: [],
      });
      continue;
    }
    const antes = new Set(previa.columnas_minimas.map((c) => clave(c.nombre)));
    const ahora = new Set(f.columnas_minimas.map((c) => clave(c.nombre)));
    const columnasNuevas = new Set([...ahora].filter((c) => !antes.has(c)));
    const columnasQuitadas = previa.columnas_minimas.filter((c) => !ahora.has(clave(c.nombre))).map((c) => c.nombre);
    const tipoCambio = previa.tipo !== f.tipo;
    fuentes.set(clave(f.nombre), {
      estado: tipoCambio || columnasNuevas.size || columnasQuitadas.length ? "cambiada" : "igual",
      tipoAnterior: tipoCambio ? previa.tipo : undefined,
      columnasNuevas,
      columnasQuitadas,
    });
  }

  const actuales = new Set(actual.fuentes_requeridas.map((f) => clave(f.nombre)));
  const fuentesQuitadas = anterior.fuentes_requeridas
    .filter((f) => !actuales.has(clave(f.nombre)))
    .map((f) => f.nombre);

  const reglasPrevias = new Map(anterior.reglas_candidatas.map((r) => [r.id, r.enunciado]));
  const reglas = new Map<string, "nueva" | "cambiada">();
  for (const r of actual.reglas_candidatas) {
    if (!reglasPrevias.has(r.id)) reglas.set(r.id, "nueva");
    else if (clave(reglasPrevias.get(r.id)!) !== clave(r.enunciado)) reglas.set(r.id, "cambiada");
  }
  const idsActuales = new Set(actual.reglas_candidatas.map((r) => r.id));
  const reglasQuitadas = anterior.reglas_candidatas.filter((r) => !idsActuales.has(r.id)).map((r) => r.id);

  const clasesPrevias = new Set(anterior.esquema.clases.map(clave));
  const clasesNuevas = actual.esquema.clases.filter((c) => !clasesPrevias.has(clave(c)));

  const hayCambios =
    [...fuentes.values()].some((f) => f.estado !== "igual") ||
    fuentesQuitadas.length > 0 ||
    reglas.size > 0 ||
    reglasQuitadas.length > 0 ||
    clasesNuevas.length > 0;

  return { fuentes, fuentesQuitadas, reglas, reglasQuitadas, clasesNuevas, hayCambios };
}

/** Resumen en una lista de frases cortas, para el recuadro "Cambios respecto a vN". */
export function resumirCambios(
  diff: DiffRequerimiento,
  actual: RequerimientoMotor,
  tipoLegible: (t: string) => string,
): string[] {
  const frases: string[] = [];
  for (const f of actual.fuentes_requeridas) {
    const c = diff.fuentes.get(clave(f.nombre));
    if (!c || c.estado === "igual") continue;
    if (c.estado === "nueva") {
      frases.push(`Nuevo archivo: ${f.nombre}`);
      continue;
    }
    if (c.tipoAnterior) frases.push(`${f.nombre}: de ${tipoLegible(c.tipoAnterior)} a ${tipoLegible(f.tipo)}`);
    const nuevas = f.columnas_minimas.filter((col) => c.columnasNuevas.has(clave(col.nombre))).map((col) => col.nombre);
    if (nuevas.length)
      frases.push(`${f.nombre}: ${nuevas.length === 1 ? "nueva columna" : "nuevas columnas"} ${nuevas.join(", ")}`);
    if (c.columnasQuitadas.length) frases.push(`${f.nombre}: se quitó ${c.columnasQuitadas.join(", ")}`);
  }
  for (const nombre of diff.fuentesQuitadas) frases.push(`Se quitó el archivo ${nombre}`);
  for (const [id, estado] of diff.reglas) frases.push(`${id}: regla ${estado === "nueva" ? "nueva" : "modificada"}`);
  for (const id of diff.reglasQuitadas) frases.push(`Se quitó la regla ${id}`);
  if (diff.clasesNuevas.length) frases.push(`Nuevas entidades: ${diff.clasesNuevas.join(", ")}`);
  return frases;
}
