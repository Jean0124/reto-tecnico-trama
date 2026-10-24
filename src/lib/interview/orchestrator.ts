import { ErrorLLM, type ClienteLLM, type DefinicionHerramienta, type EleccionHerramienta, type LlamadaHerramienta, type MensajeLLM } from "../llm/types";
import {
  aJsonSchema,
  ContextoSchema,
  RequerimientoMotorSchema,
  type EstadoEntrevista,
  type MensajeChat,
} from "./contract";
import {
  calcularFase,
  camposFaltantes,
  debeForzarRegistro,
  describirFaltantes,
  fusionarContexto,
  herramientasDisponibles,
  type Fase,
  type NombreHerramienta,
} from "./engine";
import { construirPromptSistema } from "./prompt";
import { cifrasNoAportadas, validarRequerimiento } from "./validation";

/** Iteraciones máximas modelo↔herramientas en un turno. */
const MAX_PASOS = 5;
/** Intentos de registrar un requerimiento inválido antes de rendirse en este turno. */
const MAX_INTENTOS_INVALIDOS = 2;

const DEFINICIONES: Record<NombreHerramienta, DefinicionHerramienta> = {
  registrar_contexto: {
    nombre: "registrar_contexto",
    descripcion:
      "Registra lo que el usuario dijo sobre la decisión a tomar, las entidades involucradas, el período, la sospecha inicial y las unidades o áreas. La sospecha es la CAUSA que el usuario cree que explica el problema (ej. \"creemos que son las devoluciones\"), no el problema en sí; si no la dijo, null. Usá null o [] para lo que no se sabe.",
    parametros: aJsonSchema(ContextoSchema),
  },
  registrar_requerimiento: {
    nombre: "registrar_requerimiento",
    descripcion:
      "Registra el requerimiento de entrada para el motor (RequerimientoMotor) para que el usuario lo revise y confirme. Cada llamada crea una nueva versión completa.",
    parametros: aJsonSchema(RequerimientoMotorSchema),
  },
};

export type EventoTurno =
  | { tipo: "contexto_actualizado" }
  | { tipo: "requerimiento_registrado"; version: number }
  | { tipo: "requerimiento_invalido"; errores: string[] }
  | { tipo: "cifras_bloqueadas"; cifras: string[] };

export type ResultadoTurno = {
  respuesta: string;
  estado: EstadoEntrevista;
  fase: Fase;
  eventos: EventoTurno[];
  /** true si el modelo no dio una respuesta válida y se usó el texto de respaldo. */
  respaldo: boolean;
};

export class EntrevistaCerradaError extends Error {
  constructor() {
    super("La entrevista ya fue confirmada");
  }
}

/**
 * Ejecuta un turno de la entrevista: recibe la conversación visible y el estado,
 * deja que el modelo use las herramientas permitidas en la fase actual, valida
 * todo en el servidor y devuelve la respuesta del agente con el estado nuevo.
 */
export async function ejecutarTurno(params: {
  llm: ClienteLLM;
  mensajes: MensajeChat[];
  estado: EstadoEntrevista;
  signal?: AbortSignal;
}): Promise<ResultadoTurno> {
  const { llm, signal } = params;
  if (params.estado.confirmado) throw new EntrevistaCerradaError();

  let estado: EstadoEntrevista = structuredClone(params.estado);
  estado.turnosUsuario += 1;

  const textoUsuario = params.mensajes
    .filter((m) => m.rol === "usuario")
    .map((m) => m.contenido)
    .join("\n");
  const conversacion: MensajeLLM[] = params.mensajes.map((m) =>
    m.rol === "usuario" ? { rol: "usuario", contenido: m.contenido } : { rol: "agente", contenido: m.contenido },
  );

  const eventos: EventoTurno[] = [];
  let intentosInvalidos = 0;
  let ultimosErrores: string[] = [];
  let registroEnEsteTurno = false;
  let respuesta: string | null = null;
  /** Respuestas vacías (sin texto ni herramientas) ya reintentadas en este turno. */
  let vacias = 0;

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    if (signal?.aborted) throw new ErrorLLM("timeout", "Se agotó el tiempo del turno");
    const fase = calcularFase(estado);
    const agotoIntentos = intentosInvalidos >= MAX_INTENTOS_INVALIDOS;

    // Tras una respuesta vacía en "proponer", se obliga a registrar: es lo que correspondía hacer.
    const forzarPorVacia = vacias > 0 && fase === "proponer" && !registroEnEsteTurno;

    let eleccion: EleccionHerramienta = "auto";
    if (registroEnEsteTurno || agotoIntentos) eleccion = "ninguna";
    else if (debeForzarRegistro(estado) || forzarPorVacia) eleccion = { nombre: "registrar_requerimiento" };

    const nota = agotoIntentos
      ? `El requerimiento no pasó la validación del servidor y NO se mostró al usuario. Errores: ${ultimosErrores.join("; ")}. No vuelvas a registrarlo en este turno: pedile al usuario, en una o dos preguntas, la información que falta para resolverlo.`
      : registroEnEsteTurno
        ? "El requerimiento quedó registrado y ya se ve en el panel. Ahora respondé al usuario en 1 o 2 frases: qué propusiste y que lo revise para confirmarlo o pedir ajustes."
        : vacias > 0
          ? "Tu respuesta anterior llegó vacía. Respondé ahora: llamá a la herramienta que corresponda o escribile al usuario en 1 o 2 frases."
          : undefined;

    const res = await llm.completar({
      sistema: construirPromptSistema(estado, nota),
      mensajes: conversacion,
      herramientas: herramientasDisponibles(fase).map((n) => DEFINICIONES[n]),
      eleccion,
      signal,
    });

    const texto = res.texto?.trim() || null;
    if (res.llamadas.length === 0 && !texto && vacias < 1) {
      // Respuesta vacía (pasa con algunos modelos que "razonan" y no escriben nada): un reintento.
      vacias += 1;
      continue;
    }
    if (res.llamadas.length === 0 || eleccion === "ninguna") {
      respuesta = texto;
      break;
    }

    conversacion.push({ rol: "agente", contenido: res.texto, llamadas: res.llamadas });
    for (const llamada of res.llamadas) {
      const salida = procesarLlamada(llamada, estado, fase, textoUsuario);
      estado = salida.estado;
      if (salida.evento) eventos.push(salida.evento);
      if (salida.evento?.tipo === "requerimiento_registrado") registroEnEsteTurno = true;
      if (salida.evento?.tipo === "requerimiento_invalido") {
        intentosInvalidos += 1;
        ultimosErrores = salida.evento.errores;
      }
      conversacion.push({ rol: "herramienta", idLlamada: llamada.id, contenido: salida.resultado });
    }
  }

  respuesta = await vigilarCifras(respuesta, textoUsuario, estado, conversacion, llm, eventos, signal);

  return {
    respuesta: respuesta ?? respuestaDeRespaldo(estado),
    estado,
    fase: calcularFase(estado),
    eventos,
    respaldo: respuesta === null,
  };
}

function procesarLlamada(
  llamada: LlamadaHerramienta,
  estado: EstadoEntrevista,
  fase: Fase,
  textoUsuario: string,
): { estado: EstadoEntrevista; resultado: string; evento?: EventoTurno } {
  const permitidas = herramientasDisponibles(fase) as string[];
  if (!permitidas.includes(llamada.nombre)) {
    return {
      estado,
      resultado: JSON.stringify({ ok: false, error: `La herramienta ${llamada.nombre} no está disponible en la fase ${fase}.` }),
    };
  }

  let argumentos: unknown;
  try {
    argumentos = JSON.parse(llamada.argumentos);
  } catch {
    const errores = ["los argumentos no son JSON válido"];
    return {
      estado,
      resultado: JSON.stringify({ ok: false, errores }),
      evento: llamada.nombre === "registrar_requerimiento" ? { tipo: "requerimiento_invalido", errores } : undefined,
    };
  }

  if (llamada.nombre === "registrar_contexto") {
    const parsed = ContextoSchema.safeParse(argumentos);
    if (!parsed.success) {
      return { estado, resultado: JSON.stringify({ ok: false, errores: parsed.error.issues.map((i) => i.message) }) };
    }
    const contexto = fusionarContexto(estado.contexto, parsed.data);
    const nuevo = { ...estado, contexto };
    return {
      estado: nuevo,
      resultado: JSON.stringify({
        ok: true,
        fase: calcularFase(nuevo),
        falta: describirFaltantes(camposFaltantes(contexto)),
      }),
      evento: { tipo: "contexto_actualizado" },
    };
  }

  // registrar_requerimiento
  const validacion = validarRequerimiento(argumentos, textoUsuario);
  if (!validacion.ok) {
    return {
      estado,
      resultado: JSON.stringify({
        ok: false,
        mensaje: "El requerimiento NO se registró. Corregí estos errores y volvé a llamar a la herramienta.",
        errores: validacion.errores,
      }),
      evento: { tipo: "requerimiento_invalido", errores: validacion.errores },
    };
  }
  const nuevo = { ...estado, versiones: [...estado.versiones, validacion.requerimiento] };
  return {
    estado: nuevo,
    resultado: JSON.stringify({ ok: true, version: nuevo.versiones.length }),
    evento: { tipo: "requerimiento_registrado", version: nuevo.versiones.length },
  };
}

/**
 * Última barrera para "ninguna cifra sale del LLM": si la respuesta del chat
 * trae porcentajes o montos que el usuario no dijo, se pide una reescritura
 * sin ellos; si insiste, se reemplaza por una respuesta segura.
 */
async function vigilarCifras(
  respuesta: string | null,
  textoUsuario: string,
  estado: EstadoEntrevista,
  conversacion: MensajeLLM[],
  llm: ClienteLLM,
  eventos: EventoTurno[],
  signal?: AbortSignal,
): Promise<string | null> {
  if (!respuesta) return respuesta;
  const cifras = cifrasNoAportadas(respuesta, textoUsuario);
  if (cifras.length === 0) return respuesta;
  eventos.push({ tipo: "cifras_bloqueadas", cifras });

  const reintento = await llm.completar({
    sistema: construirPromptSistema(
      estado,
      `Tu respuesta anterior incluía cifras que el usuario nunca dio (${cifras.join(", ")}). Reescribila sin ninguna cifra, porcentaje ni monto inventado. Respuesta anterior: """${respuesta}"""`,
    ),
    mensajes: conversacion,
    // Se reenvían las tools (sin permitir usarlas) porque el historial puede contener llamadas previas.
    herramientas: herramientasDisponibles(calcularFase(estado)).map((n) => DEFINICIONES[n]),
    eleccion: "ninguna",
    signal,
  });
  const texto = reintento.texto?.trim() ?? "";
  if (texto && cifrasNoAportadas(texto, textoUsuario).length === 0) return texto;
  return null;
}

function respuestaDeRespaldo(estado: EstadoEntrevista): string {
  const fase = calcularFase(estado);
  if (fase === "revisar")
    return "Dejé el requerimiento en el panel. Revisalo y confirmalo, o decime qué querés ajustar.";
  const falta = describirFaltantes(camposFaltantes(estado.contexto));
  if (falta.length) return `Para seguir necesito entender mejor ${falta[0]}. ¿Me lo contás?`;
  return "¿Podés contarme un poco más sobre qué datos tienen disponibles para este tema?";
}
