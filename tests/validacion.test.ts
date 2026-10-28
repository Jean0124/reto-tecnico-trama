import { describe, expect, it } from "vitest";

import { cifrasNoAportadas, validarRequerimiento } from "@/lib/interview/validation";
import { requerimientoValido, TEXTO_USUARIO } from "./helpers/fixtures";

describe("validarRequerimiento", () => {
  it("acepta el requerimiento del ejemplo del reto", () => {
    const r = validarRequerimiento(requerimientoValido(), TEXTO_USUARIO);
    expect(r.ok).toBe(true);
  });

  it("rechaza campos faltantes o con tipo incorrecto", () => {
    const { completitud: _omitido, ...sinCompletitud } = requerimientoValido();
    void _omitido;
    const r = validarRequerimiento({ ...sinCompletitud, fuentes_requeridas: [{ nombre: "X", tipo: "word" }] }, "");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.some((e) => e.startsWith("completitud"))).toBe(true);
      expect(r.errores.some((e) => e.includes("tipo"))).toBe(true);
    }
  });

  it("rechaza campos extra (no se aceptan claves inventadas)", () => {
    const r = validarRequerimiento({ ...requerimientoValido(), resultado: "la causa son los turnos" }, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
  });

  it("rechaza relaciones que usan clases no declaradas", () => {
    const req = requerimientoValido();
    req.esquema.relaciones.push({ sujeto: "Empleado", predicado: "trabajaEn", objeto: "Sede" });
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toContain('"Sede" no está en esquema.clases');
  });

  it("rechaza fuentes o columnas sin justificación válida", () => {
    const req = requerimientoValido();
    req.fuentes_requeridas[0].columnas_minimas.push({ nombre: "salario", justifica: ["por las dudas"] });
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toContain('"por las dudas" no es una clase, regla ni relación');

    const sinJustificar = requerimientoValido();
    sinJustificar.fuentes_requeridas[1].justifica = [];
    const r2 = validarRequerimiento(sinJustificar, TEXTO_USUARIO);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.errores.join()).toContain("fuentes_requeridas.1.justifica");
  });

  it("no permite marcar suficiente_para_confirmar sin fuentes", () => {
    const req = { ...requerimientoValido(), fuentes_requeridas: [] };
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    expect(validarRequerimiento({ ...req, completitud: "faltan_datos" }, TEXTO_USUARIO).ok).toBe(true);
  });

  it("rechaza cifras de resultados que el usuario no dio", () => {
    const req = requerimientoValido();
    req.necesidad = "El 35% de las renuncias vienen del turno noche";
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toContain("35%");
  });

  it("detecta ids de regla repetidos y con formato inválido", () => {
    const req = requerimientoValido();
    req.reglas_candidatas.push({ id: "R1", enunciado: "otra" }, { id: "regla-3", enunciado: "otra más" });
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
  });
});

describe("reglas verificables", () => {
  it.each([
    "Si una ruta tiene muchas paradas, podría estar afectando la puntualidad.",
    "Si un pedido tiene un reclamo, indica insatisfacción.",
    "Si hay un reclamo asociado a un pedido retrasado, se marca el reclamo como indicativo de problema en la entrega.",
    "Si una devolución se marca como posible causa.",
    "Si los reclamos aumentan de forma significativa, se marca.",
    "Si una ruta tiene más de 15 paradas, se marca como ruta posiblemente demasiado larga.",
    "Si un repartidor tiene rutas largas, se marca saturación potencial.",
    "Si las salidas no se corresponden con el inventario, se marca posible error en el registro.",
    "Si aumentar la frecuencia de conteos reduce las diferencias, habrá evidencia para decidir esa opción.",
    "Si cambios en el registro de salidas reducen las diferencias, esa es la opción recomendada.",
  ])("rechaza conclusiones o especulación: %s", (enunciado) => {
    const req = requerimientoValido();
    req.reglas_candidatas[0].enunciado = enunciado;
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toContain("no es verificable");
  });

  it("acepta comparaciones entre fuentes aunque digan 'no está registrada'", () => {
    const req = requerimientoValido();
    req.reglas_candidatas[0].enunciado =
      "Si una devolución de las notas crédito no está registrada en los movimientos del ERP para la misma bodega y producto, se marca una inconsistencia.";
    expect(validarRequerimiento(req, TEXTO_USUARIO).ok).toBe(true);
  });

  it("rechaza umbrales que el usuario no dio y acepta los que sí", () => {
    const req = requerimientoValido();
    req.reglas_candidatas[0].enunciado =
      "Si una Evaluación tiene un puntaje menor a 3 en los 60 días previos a la Salida, se marca el hecho.";
    const r = validarRequerimiento(req, TEXTO_USUARIO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toContain('el umbral "3" no lo dijo el usuario');
    expect(validarRequerimiento(req, `${TEXTO_USUARIO} un puntaje bajo es menor a 3`).ok).toBe(true);
  });

  it("acepta condiciones observables con umbral parametrizado", () => {
    const req = requerimientoValido();
    req.reglas_candidatas[0].enunciado =
      "Si la hora real de entrega de un Pedido supera la hora prometida en más de N minutos, se marca el pedido como retrasado.";
    expect(validarRequerimiento(req, TEXTO_USUARIO).ok).toBe(true);
  });
});

describe("cifrasNoAportadas", () => {
  it("permite cifras que el usuario mencionó", () => {
    expect(cifrasNoAportadas("Mencionaste un 12 % de rotación", "tenemos 12% de rotación")).toEqual([]);
    expect(cifrasNoAportadas("El presupuesto de $5.000.000", "tenemos 5.000.000 de pesos")).toEqual([]);
  });

  it("marca porcentajes y montos inventados", () => {
    expect(cifrasNoAportadas("Probablemente el 40% se va por los turnos", "se va gente")).toEqual(["40%"]);
    expect(cifrasNoAportadas("Esto cuesta unos 3000 dólares", "nos cuesta caro")).toEqual(["3000 dólares"]);
  });

  it("no marca umbrales en días o meses", () => {
    expect(cifrasNoAportadas("en los 60 días previos a la salida", "")).toEqual([]);
  });
});
