import type { EstadoEntrevista, Fuente, MensajeChat, RequerimientoMotor } from "@/lib/interview/contract";

/** Arma la transcripción en Markdown (para guardar las pruebas de los tres dominios). */
export function transcripcionMarkdown(mensajes: MensajeChat[], estado: EstadoEntrevista, fecha = new Date()): string {
  const lineas = [
    `# Transcripción — entrevista Trama`,
    ``,
    `Fecha: ${fecha.toISOString()}  `,
    `Estado: ${estado.confirmado ? "confirmado" : estado.versiones.length ? "esperando confirmación" : "sin requerimiento"}  `,
    `Versiones del requerimiento: ${estado.versiones.length}`,
    ``,
    `## Conversación`,
    ``,
    ...mensajes.flatMap((m) => [`**${m.rol === "agente" ? "Agente" : "Usuario"}:** ${m.contenido}`, ``]),
  ];
  const ultima = estado.versiones.at(-1);
  if (ultima) {
    lineas.push(
      `## Requerimiento resultante (versión ${estado.versiones.length})`,
      ``,
      "```json",
      JSON.stringify(ultima, null, 2),
      "```",
      ``,
    );
  }
  return lineas.join("\n");
}

export function exportarTranscripcion(mensajes: MensajeChat[], estado: EstadoEntrevista) {
  descargar(
    transcripcionMarkdown(mensajes, estado),
    `transcripcion-trama-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`,
    "text/markdown;charset=utf-8",
  );
}

/* ---------- Tablas CSV ---------- */

/**
 * Separador ";" y BOM UTF-8: así el archivo abre bien en Excel con configuración regional en español
 * (donde la coma es el separador decimal) y respeta las tildes.
 */
const SEP = ";";
const BOM = "﻿";

function celda(valor: string): string {
  return /[";\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

function filaCsv(valores: string[]): string {
  return valores.map(celda).join(SEP);
}

export const TIPO_LEGIBLE: Record<string, string> = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF",
  "crm-export": "Exportación del CRM",
};

/** "R1" → "R1: Si un colaborador…"; una clase o relación queda igual. */
export function explicarReferencias(refs: string[], req: RequerimientoMotor): string {
  const reglas = new Map(req.reglas_candidatas.map((r) => [r.id, r.enunciado]));
  return refs.map((ref) => (reglas.has(ref) ? `${ref}: ${reglas.get(ref)}` : ref)).join(" | ");
}

/** Plantilla de un archivo: solo los encabezados, lista para llenar o para comparar con el export real. */
export function plantillaCsv(fuente: Fuente): string {
  return BOM + filaCsv(fuente.columnas_minimas.map((c) => c.nombre)) + "\r\n";
}

/** Todo el requerimiento como tabla: una fila por columna pedida. */
export function requerimientoCsv(req: RequerimientoMotor): string {
  const filas = [filaCsv(["Archivo", "Tipo", "Columna", "Para qué se usa"])];
  for (const f of req.fuentes_requeridas) {
    for (const c of f.columnas_minimas) {
      filas.push(filaCsv([f.nombre, TIPO_LEGIBLE[f.tipo] ?? f.tipo, c.nombre, explicarReferencias(c.justifica, req)]));
    }
  }
  return BOM + filas.join("\r\n") + "\r\n";
}

export function nombreArchivo(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "archivo"
  );
}

export function descargarPlantilla(fuente: Fuente) {
  descargar(plantillaCsv(fuente), `plantilla-${nombreArchivo(fuente.nombre)}.csv`, "text/csv;charset=utf-8");
}

export function descargarRequerimiento(req: RequerimientoMotor) {
  descargar(requerimientoCsv(req), "requerimiento-de-datos.csv", "text/csv;charset=utf-8");
}

function descargar(contenido: string, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
