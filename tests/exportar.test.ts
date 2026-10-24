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

describe("humanizar", () => {
  it("convierte predicados camelCase en texto legible", async () => {
    const { humanizar } = await import("@/components/entrevista/panel-requerimiento");
    expect(humanizar("trabajaEnTurno")).toBe("trabaja en turno");
    expect(humanizar("reportaA")).toBe("reporta a");
    expect(humanizar("asignado_a")).toBe("asignado a");
  });
});

describe("tablas CSV", () => {
  it("la plantilla de un archivo trae solo los encabezados, con BOM y separador ;", async () => {
    const { plantillaCsv } = await import("@/components/entrevista/exportar");
    const csv = plantillaCsv(requerimientoValido().fuentes_requeridas[0]);
    expect(csv).toBe("﻿empleado_id;area;fecha_salida;motivo_salida\r\n");
  });

  it("la tabla completa tiene una fila por columna y explica las reglas", async () => {
    const { requerimientoCsv } = await import("@/components/entrevista/exportar");
    const req = requerimientoValido();
    const filas = requerimientoCsv(req).replace("﻿", "").trim().split("\r\n");
    const total = req.fuentes_requeridas.reduce((n, f) => n + f.columnas_minimas.length, 0);
    expect(filas).toHaveLength(total + 1);
    expect(filas[0]).toBe("Archivo;Tipo;Columna;Para qué se usa");
    expect(filas[3]).toContain("Nómina;Excel;fecha_salida;Salida | R1: Si un Empleado cambió de Turno");
  });

  it("escapa valores con separador o comillas", async () => {
    const { requerimientoCsv } = await import("@/components/entrevista/exportar");
    const req = requerimientoValido();
    req.fuentes_requeridas[0].nombre = 'Nómina; "2026"';
    expect(requerimientoCsv(req)).toContain('"Nómina; ""2026"""');
  });
});
