import { describe, expect, it } from "vitest";

import { clave, compararVersiones, resumirCambios } from "@/lib/interview/diff";
import { requerimientoValido } from "./helpers/fixtures";

const legible = (t: string) => ({ excel: "Excel", csv: "CSV", pdf: "PDF", "crm-export": "Exportación del CRM" })[t] ?? t;

describe("compararVersiones", () => {
  it("sin cambios no marca nada", () => {
    const d = compararVersiones(requerimientoValido(), requerimientoValido());
    expect(d.hayCambios).toBe(false);
    expect([...d.fuentes.values()].every((f) => f.estado === "igual")).toBe(true);
  });

  it("detecta cambio de tipo, columnas nuevas y quitadas en una fuente", () => {
    const v2 = requerimientoValido();
    v2.fuentes_requeridas[1].tipo = "crm-export";
    v2.fuentes_requeridas[1].columnas_minimas.push({ nombre: "zona", justifica: ["Turno"] });
    v2.fuentes_requeridas[1].columnas_minimas = v2.fuentes_requeridas[1].columnas_minimas.filter((c) => c.nombre !== "hasta");
    const d = compararVersiones(requerimientoValido(), v2);
    const f = d.fuentes.get(clave("Asignación de turnos"))!;
    expect(f.estado).toBe("cambiada");
    expect(f.tipoAnterior).toBe("csv");
    expect([...f.columnasNuevas]).toEqual(["zona"]);
    expect(f.columnasQuitadas).toEqual(["hasta"]);
    expect(resumirCambios(d, v2, legible)).toEqual([
      "Asignación de turnos: de CSV a Exportación del CRM",
      "Asignación de turnos: nueva columna zona",
      "Asignación de turnos: se quitó hasta",
    ]);
  });

  it("detecta archivos y reglas nuevas, modificadas y quitadas", () => {
    const v1 = requerimientoValido();
    const v2 = requerimientoValido();
    v2.fuentes_requeridas.push({
      nombre: "Evaluaciones",
      tipo: "pdf",
      columnas_minimas: [{ nombre: "empleado_id", justifica: ["Empleado"] }],
      justifica: ["Empleado"],
    });
    v2.fuentes_requeridas.splice(0, 1);
    v2.reglas_candidatas[0].enunciado = "Si un Empleado cambió de Turno en los N días previos a su Salida, se marca.";
    v2.reglas_candidatas.push({ id: "R2", enunciado: "Si un Empleado cambió de Supervisor, se marca." });
    v2.esquema.clases.push("Evaluacion");
    const d = compararVersiones(v1, v2);
    expect(d.fuentes.get(clave("evaluaciones"))!.estado).toBe("nueva");
    expect(d.fuentesQuitadas).toEqual(["Nómina"]);
    expect(d.reglas.get("R1")).toBe("cambiada");
    expect(d.reglas.get("R2")).toBe("nueva");
    expect(d.clasesNuevas).toEqual(["Evaluacion"]);
    expect(resumirCambios(d, v2, legible)).toContain("Nuevo archivo: Evaluaciones");
    expect(resumirCambios(d, v2, legible)).toContain("Se quitó el archivo Nómina");
  });

  it("compara nombres sin importar mayúsculas ni tildes", () => {
    const v2 = requerimientoValido();
    v2.fuentes_requeridas[0].nombre = "NOMINA";
    const d = compararVersiones(requerimientoValido(), v2);
    expect(d.hayCambios).toBe(false);
  });
});
