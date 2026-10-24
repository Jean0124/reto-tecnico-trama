import type { EstadoEntrevista, MensajeChat } from "@/lib/interview/contract";

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
  const blob = new Blob([transcripcionMarkdown(mensajes, estado)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transcripcion-trama-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
