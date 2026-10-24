import { describe, expect, it } from "vitest";

import { transcripcionMarkdown } from "@/components/entrevista/exportar";
import { conversacion, estadoDelimitado, requerimientoValido } from "./helpers/fixtures";

describe("transcripcionMarkdown", () => {
  it("incluye la conversación y el requerimiento final", () => {
    const md = transcripcionMarkdown(
      conversacion("Se va la gente", "¿Desde cuándo?"),
      estadoDelimitado({ versiones: [requerimientoValido()], confirmado: true }),
      new Date("2026-10-24T00:00:00Z"),
    );
    expect(md).toContain("**Usuario:** Se va la gente");
    expect(md).toContain("**Agente:** ¿Desde cuándo?");
    expect(md).toContain("Estado: confirmado");
    expect(md).toContain('"decision_objetivo"');
  });
});
