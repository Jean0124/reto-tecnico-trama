import type { ClienteLLM, PeticionLLM, RespuestaLLM } from "./types";

/**
 * Cliente de demostración (LLM_SIMULADO=1): permite recorrer la UI y correr el
 * e2e sin API key. No intenta ser inteligente: responde según la fase que
 * indica el prompt del sistema y el número de turno.
 */
export class ClienteDemo implements ClienteLLM {
  async completar(p: PeticionLLM): Promise<RespuestaLLM> {
    const id = `demo_${Math.random().toString(36).slice(2, 8)}`;
    const ultimo = [...p.mensajes].reverse().find((m) => m.rol === "usuario");
    const yaUsoHerramienta = p.mensajes.at(-1)?.rol === "herramienta";
    const nombres = p.herramientas.map((h) => h.nombre);

    const puedeRegistrar = nombres.includes("registrar_requerimiento") && p.eleccion !== "ninguna";
    if (p.eleccion === "ninguna" || (yaUsoHerramienta && !puedeRegistrar)) {
      if (p.sistema.includes("quedó registrado"))
        return { texto: "Te dejé una propuesta en el panel. Revisala y confirmala, o decime qué ajustar.", llamadas: [] };
      return { texto: "¿Desde cuándo lo notan y qué sospechan que lo causa?", llamadas: [] };
    }

    if (!nombres.includes("registrar_requerimiento")) {
      return {
        texto: null,
        llamadas: [
          {
            id,
            nombre: "registrar_contexto",
            argumentos: JSON.stringify({
              decision: "Decidir qué cambiar para resolver el problema",
              entidades: ["Caso"],
              periodo: p.mensajes.filter((m) => m.rol === "usuario").length >= 2 ? "Últimos meses" : null,
              sospecha: null,
              unidades: [],
            }),
          },
        ],
      };
    }

    return {
      texto: null,
      llamadas: [
        {
          id,
          nombre: "registrar_requerimiento",
          argumentos: JSON.stringify({
            necesidad: ultimo?.rol === "usuario" ? ultimo.contenido.slice(0, 140) : "Necesidad del usuario",
            decision_objetivo: "Decidir qué cambiar para resolver el problema",
            alcance: { periodo: "Últimos meses", unidades: [] },
            esquema: {
              clases: ["Caso", "Responsable"],
              relaciones: [{ sujeto: "Caso", predicado: "asignadoA", objeto: "Responsable" }],
            },
            reglas_candidatas: [{ id: "R1", enunciado: "Si un Caso cambió de Responsable antes de cerrarse, se marca para revisión." }],
            fuentes_requeridas: [
              {
                nombre: "Registro de casos",
                tipo: "csv",
                columnas_minimas: [
                  { nombre: "caso_id", justifica: ["Caso"] },
                  { nombre: "responsable_id", justifica: ["asignadoA"] },
                  { nombre: "fecha_cambio", justifica: ["R1"] },
                ],
                justifica: ["Caso", "R1"],
              },
            ],
            preguntas_abiertas: ["¿El historial de cambios de responsable se guarda o solo el actual?"],
            completitud: "suficiente_para_confirmar",
          }),
        },
      ],
    };
  }
}
