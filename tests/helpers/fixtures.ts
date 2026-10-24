import { ESTADO_INICIAL, type EstadoEntrevista, type MensajeChat, type RequerimientoMotor } from "@/lib/interview/contract";

export const requerimientoValido = (): RequerimientoMotor => ({
  necesidad: "Explicar el aumento de renuncias en operaciones (últimos 8 meses)",
  decision_objetivo: "Decidir entre cambiar esquema de turnos o de supervisión",
  alcance: { periodo: "2026-02 / 2026-10", unidades: ["Operaciones"] },
  esquema: {
    clases: ["Empleado", "Turno", "Supervisor", "Salida"],
    relaciones: [
      { sujeto: "Empleado", predicado: "asignadoA", objeto: "Turno" },
      { sujeto: "Empleado", predicado: "reportaA", objeto: "Supervisor" },
      { sujeto: "Empleado", predicado: "registra", objeto: "Salida" },
    ],
  },
  reglas_candidatas: [
    { id: "R1", enunciado: "Si un Empleado cambió de Turno rotativo en los 60 días previos a su Salida, la salida se asocia al turno." },
  ],
  fuentes_requeridas: [
    {
      nombre: "Nómina",
      tipo: "excel",
      columnas_minimas: [
        { nombre: "empleado_id", justifica: ["Empleado"] },
        { nombre: "area", justifica: ["Empleado"] },
        { nombre: "fecha_salida", justifica: ["Salida", "R1"] },
        { nombre: "motivo_salida", justifica: ["Salida"] },
      ],
      justifica: ["Salida", "R1"],
    },
    {
      nombre: "Asignación de turnos",
      tipo: "csv",
      columnas_minimas: [
        { nombre: "empleado_id", justifica: ["asignadoA"] },
        { nombre: "turno", justifica: ["Turno"] },
        { nombre: "supervisor_id", justifica: ["reportaA"] },
        { nombre: "desde", justifica: ["R1"] },
        { nombre: "hasta", justifica: ["R1"] },
      ],
      justifica: ["asignadoA", "reportaA", "R1"],
    },
  ],
  preguntas_abiertas: ["¿El motivo de salida se registra con categorías fijas o es texto libre?"],
  completitud: "suficiente_para_confirmar",
});

export const conversacion = (...textos: string[]): MensajeChat[] =>
  textos.map((contenido, i) => ({ rol: i % 2 === 0 ? "usuario" : "agente", contenido }));

export const estadoDelimitado = (extra: Partial<EstadoEntrevista> = {}): EstadoEntrevista => ({
  ...ESTADO_INICIAL,
  contexto: {
    decision: "Decidir entre cambiar turnos o supervisión",
    entidades: ["Empleado", "Turno", "Supervisor"],
    periodo: "últimos 8 meses",
    sospecha: "turnos rotativos o supervisores",
    unidades: ["Operaciones"],
  },
  turnosUsuario: 2,
  ...extra,
});

export const TEXTO_USUARIO =
  "Se nos está yendo mucha gente de operaciones y no sabemos por qué. Queremos saber si es por los turnos rotativos o por los supervisores. Empezó hace unos 8 meses.";
