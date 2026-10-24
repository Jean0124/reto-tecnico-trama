import { describe, expect, it } from "vitest";

import { ESTADO_INICIAL } from "@/lib/interview/contract";
import { EntrevistaCerradaError, ejecutarTurno } from "@/lib/interview/orchestrator";
import { ClienteGuionado, herramienta, texto } from "@/lib/llm/guionado";
import { ErrorLLM } from "@/lib/llm/types";
import { conversacion, estadoDelimitado, requerimientoValido, TEXTO_USUARIO } from "./helpers/fixtures";

describe("ejecutarTurno", () => {
  it("en la primera fase registra contexto y hace una pregunta", async () => {
    const llm = new ClienteGuionado([
      herramienta("registrar_contexto", {
        decision: null,
        entidades: ["Empleado"],
        periodo: null,
        sospecha: null,
        unidades: ["Operaciones"],
      }),
      texto("¿Qué decisión querés poder tomar con esto y desde cuándo notan el aumento?"),
    ]);
    const r = await ejecutarTurno({
      llm,
      mensajes: conversacion("Se nos está yendo mucha gente de operaciones"),
      estado: ESTADO_INICIAL,
    });

    expect(r.fase).toBe("delimitar");
    expect(r.estado.contexto.entidades).toEqual(["Empleado"]);
    expect(r.estado.turnosUsuario).toBe(1);
    expect(r.respuesta).toContain("¿Qué decisión");
    // En delimitar no se ofrece registrar_requerimiento.
    expect(llm.peticiones[0].herramientas.map((h) => h.nombre)).toEqual(["registrar_contexto"]);
    // El resultado de la tool vuelve al modelo con lo que falta.
    const resultadoTool = llm.peticiones[1].mensajes.at(-1);
    expect(resultadoTool?.rol).toBe("herramienta");
    expect(JSON.stringify(resultadoTool)).toContain("qué decisión se quiere tomar");
  });

  it("tool call válida: registra el requerimiento y lo muestra como versión 1", async () => {
    const llm = new ClienteGuionado([
      herramienta("registrar_requerimiento", requerimientoValido()),
      texto("Propongo este esquema y estos datos; revisalos en el panel antes de seguir."),
    ]);
    const r = await ejecutarTurno({
      llm,
      mensajes: conversacion(TEXTO_USUARIO),
      estado: estadoDelimitado(),
    });

    expect(r.estado.versiones).toHaveLength(1);
    expect(r.fase).toBe("revisar");
    expect(r.eventos).toContainEqual({ tipo: "requerimiento_registrado", version: 1 });
    // Tras registrar, se pide solo texto.
    expect(llm.peticiones[1].eleccion).toBe("ninguna");
  });

  it("tool call inválida: no se muestra, el modelo recibe los errores y corrige", async () => {
    const malo = { ...requerimientoValido(), esquema: { clases: ["Empleado"], relaciones: [{ sujeto: "Empleado", predicado: "x", objeto: "Turno" }] } };
    const llm = new ClienteGuionado([
      herramienta("registrar_requerimiento", malo),
      herramienta("registrar_requerimiento", requerimientoValido()),
      texto("Listo, revisalo en el panel."),
    ]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado: estadoDelimitado() });

    expect(r.estado.versiones).toHaveLength(1);
    expect(r.eventos[0].tipo).toBe("requerimiento_invalido");
    const devolucion = JSON.stringify(llm.peticiones[1].mensajes.at(-1));
    expect(devolucion).toContain("NO se registró");
    expect(devolucion).toContain("no está en esquema.clases");
  });

  it("si sigue inválida, no se registra nada y el agente pide lo que falta", async () => {
    const llm = new ClienteGuionado([
      herramienta("registrar_requerimiento", "{json roto"),
      herramienta("registrar_requerimiento", { necesidad: "x" }),
      texto("Antes de proponer, ¿qué sistema usan para registrar los turnos?"),
    ]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado: estadoDelimitado() });

    expect(r.estado.versiones).toHaveLength(0);
    expect(r.eventos.filter((e) => e.tipo === "requerimiento_invalido")).toHaveLength(2);
    expect(llm.peticiones[2].eleccion).toBe("ninguna");
    expect(llm.peticiones[2].sistema).toContain("NO se mostró al usuario");
    expect(r.respuesta).toContain("¿qué sistema usan");
  });

  it("ajuste después de una propuesta: crea una nueva versión sin perder la anterior", async () => {
    const v2 = requerimientoValido();
    v2.fuentes_requeridas[0].tipo = "csv";
    const llm = new ClienteGuionado([herramienta("registrar_requerimiento", v2), texto("Actualicé la nómina a CSV.")]);
    const r = await ejecutarTurno({
      llm,
      mensajes: conversacion(TEXTO_USUARIO, "Revisalo en el panel.", "La nómina la exportamos en CSV, no en Excel"),
      estado: estadoDelimitado({ versiones: [requerimientoValido()] }),
    });

    expect(r.estado.versiones).toHaveLength(2);
    expect(r.estado.versiones[0].fuentes_requeridas[0].tipo).toBe("excel");
    expect(r.estado.versiones[1].fuentes_requeridas[0].tipo).toBe("csv");
    expect(llm.peticiones[0].sistema).toContain("FASE ACTUAL: REVISAR");
  });

  it("después de confirmar, no se vuelve a llamar al modelo", async () => {
    const llm = new ClienteGuionado([]);
    await expect(
      ejecutarTurno({
        llm,
        mensajes: conversacion("una cosa más"),
        estado: estadoDelimitado({ versiones: [requerimientoValido()], confirmado: true }),
      }),
    ).rejects.toBeInstanceOf(EntrevistaCerradaError);
    expect(llm.peticiones).toHaveLength(0);
  });

  it("rechaza una herramienta que no corresponde a la fase", async () => {
    const llm = new ClienteGuionado([herramienta("registrar_requerimiento", requerimientoValido()), texto("¿Desde cuándo pasa?")]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion("hola"), estado: ESTADO_INICIAL });
    expect(r.estado.versiones).toHaveLength(0);
    expect(JSON.stringify(llm.peticiones[1].mensajes.at(-1))).toContain("no está disponible en la fase delimitar");
  });

  it("al llegar al tope de turnos obliga a registrar", async () => {
    const llm = new ClienteGuionado([herramienta("registrar_requerimiento", requerimientoValido()), texto("Ahí está.")]);
    await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado: { ...ESTADO_INICIAL, turnosUsuario: 5 } });
    expect(llm.peticiones[0].eleccion).toEqual({ nombre: "registrar_requerimiento" });
  });

  it("bloquea cifras inventadas en la respuesta del chat", async () => {
    const llm = new ClienteGuionado([
      texto("Seguramente el 40% de las salidas es por los turnos."),
      texto("El motor podrá verificar si las salidas se concentran en algún turno."),
    ]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado: estadoDelimitado() });
    expect(r.respuesta).not.toContain("40%");
    expect(r.eventos).toContainEqual({ tipo: "cifras_bloqueadas", cifras: ["40%"] });
  });

  it("si insiste con cifras inventadas, responde con un mensaje seguro", async () => {
    const llm = new ClienteGuionado([texto("Es el 40%."), texto("Insisto: 40%.")]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion("hola"), estado: ESTADO_INICIAL });
    expect(r.respuesta).not.toMatch(/\d+%/);
    expect(r.respuesta.length).toBeGreaterThan(10);
  });

  it("propaga los errores del proveedor como ErrorLLM", async () => {
    const llm = new ClienteGuionado([new ErrorLLM("timeout", "tarde")]);
    await expect(ejecutarTurno({ llm, mensajes: conversacion("hola"), estado: ESTADO_INICIAL })).rejects.toMatchObject({
      tipo: "timeout",
    });
  });

  it("no sigue llamando al modelo si el turno ya fue cancelado", async () => {
    const llm = new ClienteGuionado([texto("no debería llegar")]);
    await expect(
      ejecutarTurno({ llm, mensajes: conversacion("hola"), estado: ESTADO_INICIAL, signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ tipo: "timeout" });
    expect(llm.peticiones).toHaveLength(0);
  });

  it("si el modelo responde vacío, reintenta y en proponer obliga a registrar", async () => {
    const llm = new ClienteGuionado([
      texto(""),
      herramienta("registrar_requerimiento", requerimientoValido()),
      texto("Te dejé la propuesta en el panel."),
    ]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado: estadoDelimitado() });
    expect(llm.peticiones[1].eleccion).toEqual({ nombre: "registrar_requerimiento" });
    expect(llm.peticiones[1].sistema).toContain("llegó vacía");
    expect(r.estado.versiones).toHaveLength(1);
    expect(r.respaldo).toBe(false);
  });

  it("si sigue vacío tras el reintento, usa la respuesta de respaldo", async () => {
    const llm = new ClienteGuionado([texto(""), texto("")]);
    const r = await ejecutarTurno({ llm, mensajes: conversacion("hola"), estado: ESTADO_INICIAL });
    expect(llm.peticiones).toHaveLength(2);
    expect(r.respaldo).toBe(true);
    expect(r.respuesta.length).toBeGreaterThan(10);
  });

  it("no muta el estado recibido", async () => {
    const estado = estadoDelimitado();
    const copia = structuredClone(estado);
    const llm = new ClienteGuionado([herramienta("registrar_requerimiento", requerimientoValido()), texto("ok")]);
    await ejecutarTurno({ llm, mensajes: conversacion(TEXTO_USUARIO), estado });
    expect(estado).toEqual(copia);
  });
});
