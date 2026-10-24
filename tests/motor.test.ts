import { describe, expect, it } from "vitest";

import { CONTEXTO_VACIO, ESTADO_INICIAL } from "@/lib/interview/contract";
import {
  calcularFase,
  debeForzarRegistro,
  fusionarContexto,
  herramientasDisponibles,
  MAX_TURNOS_DELIMITAR,
  MAX_TURNOS_SIN_PROPUESTA,
} from "@/lib/interview/engine";
import { construirPromptSistema } from "@/lib/interview/prompt";
import { estadoDelimitado, requerimientoValido } from "./helpers/fixtures";

describe("fases de la entrevista", () => {
  it("empieza delimitando y solo permite registrar contexto", () => {
    expect(calcularFase(ESTADO_INICIAL)).toBe("delimitar");
    expect(herramientasDisponibles("delimitar")).toEqual(["registrar_contexto"]);
  });

  it("pasa a proponer cuando hay decisión, entidades y período (la sospecha es opcional)", () => {
    const estado = estadoDelimitado({ contexto: { ...estadoDelimitado().contexto, sospecha: null } });
    expect(calcularFase(estado)).toBe("proponer");
  });

  it("sigue delimitando si falta el período", () => {
    const estado = estadoDelimitado({ contexto: { ...estadoDelimitado().contexto, periodo: null } });
    expect(calcularFase(estado)).toBe("delimitar");
  });

  it("deja de preguntar al llegar al tope de turnos, aunque falte contexto", () => {
    expect(calcularFase({ ...ESTADO_INICIAL, turnosUsuario: MAX_TURNOS_DELIMITAR })).toBe("proponer");
    expect(debeForzarRegistro({ ...ESTADO_INICIAL, turnosUsuario: MAX_TURNOS_SIN_PROPUESTA })).toBe(true);
  });

  it("revisa cuando hay un requerimiento y termina al confirmar", () => {
    const conVersion = estadoDelimitado({ versiones: [requerimientoValido()] });
    expect(calcularFase(conVersion)).toBe("revisar");
    expect(calcularFase({ ...conVersion, confirmado: true })).toBe("confirmado");
    expect(herramientasDisponibles("confirmado")).toEqual([]);
  });
});

describe("fusionarContexto", () => {
  it("un valor nulo o vacío no borra lo que ya se sabía", () => {
    const actual = { ...CONTEXTO_VACIO, decision: "cambiar turnos", entidades: ["Empleado"] };
    const r = fusionarContexto(actual, { decision: null, entidades: [], periodo: " 2026 " });
    expect(r).toEqual({ ...actual, periodo: "2026" });
  });

  it("elimina duplicados en listas", () => {
    expect(fusionarContexto(CONTEXTO_VACIO, { entidades: ["A", "A ", "B"] }).entidades).toEqual(["A", "B"]);
  });
});

describe("prompt del sistema", () => {
  it("indica la fase y lo que falta, sin listas de dominio fijas", () => {
    const p = construirPromptSistema(ESTADO_INICIAL);
    expect(p).toContain("FASE ACTUAL: DELIMITAR");
    expect(p).toContain("qué decisión se quiere tomar");
    expect(p).toContain("Nunca inventes datos");
  });

  it("incluye el requerimiento vigente en revisión", () => {
    const p = construirPromptSistema(estadoDelimitado({ versiones: [requerimientoValido()] }));
    expect(p).toContain("FASE ACTUAL: REVISAR");
    expect(p).toContain("versión 1");
  });
});
