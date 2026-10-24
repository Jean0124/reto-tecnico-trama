import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ESTADO_INICIAL } from "@/lib/interview/contract";
import { ClienteGuionado, texto } from "@/lib/llm/guionado";
import { ErrorLLM, type ClienteLLM } from "@/lib/llm/types";
import { manejarChat } from "@/lib/server/chat-handler";
import { LimitadorDeTasa, verificarAcceso } from "@/lib/server/proteccion";
import { estadoDelimitado, requerimientoValido } from "./helpers/fixtures";

const peticion = (cuerpo: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });

const cuerpoValido = { mensajes: [{ rol: "usuario", contenido: "Hola" }], estado: ESTADO_INICIAL };

const deps = (llm: ClienteLLM | null, extra: Partial<Parameters<typeof manejarChat>[1]> = {}) => ({
  crearLLM: () => llm,
  limitador: new LimitadorDeTasa(100, 60_000),
  password: undefined,
  ...extra,
});

describe("POST /api/chat", () => {
  it("responde con el mensaje del agente y el estado nuevo", async () => {
    const res = await manejarChat(peticion(cuerpoValido), deps(new ClienteGuionado([texto("¿Qué decisión querés tomar?")])));
    expect(res.status).toBe(200);
    const datos = await res.json();
    expect(datos.respuesta).toBe("¿Qué decisión querés tomar?");
    expect(datos.estado.turnosUsuario).toBe(1);
  });

  it("exige la contraseña cuando está configurada", async () => {
    const llm = new ClienteGuionado([texto("ok")]);
    expect((await manejarChat(peticion(cuerpoValido), deps(llm, { password: "secreta" }))).status).toBe(401);
    const ok = await manejarChat(peticion(cuerpoValido, { "x-access-password": "secreta" }), deps(llm, { password: "secreta" }));
    expect(ok.status).toBe(200);
  });

  it("aplica el límite de mensajes", async () => {
    const limitador = new LimitadorDeTasa(1, 60_000);
    const llm = new ClienteGuionado([texto("uno"), texto("dos")]);
    expect((await manejarChat(peticion(cuerpoValido), deps(llm, { limitador }))).status).toBe(200);
    expect((await manejarChat(peticion(cuerpoValido), deps(llm, { limitador }))).status).toBe(429);
  });

  it("valida el cuerpo: JSON roto, último mensaje no del usuario, mensaje demasiado largo", async () => {
    const llm = new ClienteGuionado([]);
    expect((await manejarChat(peticion("{roto"), deps(llm))).status).toBe(400);
    expect(
      (await manejarChat(peticion({ ...cuerpoValido, mensajes: [{ rol: "agente", contenido: "hola" }] }), deps(llm))).status,
    ).toBe(400);
    const largo = await manejarChat(
      peticion({ ...cuerpoValido, mensajes: [{ rol: "usuario", contenido: "x".repeat(5000) }] }),
      deps(llm),
    );
    expect(largo.status).toBe(400);
    expect((await largo.json()).codigo).toBe("demasiado_largo");
    expect(llm.peticiones).toHaveLength(0);
  });

  it("rechaza un estado manipulado (requerimiento inválido en las versiones)", async () => {
    const estado = { ...ESTADO_INICIAL, versiones: [{ ...requerimientoValido(), completitud: "quizas" }] };
    const res = await manejarChat(peticion({ ...cuerpoValido, estado }), deps(new ClienteGuionado([])));
    expect(res.status).toBe(400);
  });

  it("traduce timeouts y errores del proveedor a mensajes claros", async () => {
    const timeout = await manejarChat(peticion(cuerpoValido), deps(new ClienteGuionado([new ErrorLLM("timeout", "x")])));
    expect(timeout.status).toBe(504);
    expect((await timeout.json()).error).toContain("Tu mensaje sigue ahí");

    const servicio = await manejarChat(peticion(cuerpoValido), deps(new ClienteGuionado([new ErrorLLM("servicio", "x")])));
    expect(servicio.status).toBe(502);

    const inesperado = await manejarChat(peticion(cuerpoValido), deps(new ClienteGuionado([new Error("boom")])));
    expect(inesperado.status).toBe(500);
    expect(JSON.stringify(await inesperado.json())).not.toContain("boom");
  });

  it("corta el turno si supera el tiempo máximo y responde 504", async () => {
    const lento: ClienteLLM = {
      completar: ({ signal }) =>
        new Promise((_, rechazar) =>
          signal?.addEventListener("abort", () => rechazar(new ErrorLLM("timeout", "abortado"))),
        ),
    };
    const res = await manejarChat(peticion(cuerpoValido), deps(lento, { tiempoMaxMs: 50 }));
    expect(res.status).toBe(504);
  });

  it("devuelve 409 si la entrevista ya está confirmada", async () => {
    const estado = estadoDelimitado({ versiones: [requerimientoValido()], confirmado: true });
    const res = await manejarChat(peticion({ ...cuerpoValido, estado }), deps(new ClienteGuionado([])));
    expect(res.status).toBe(409);
  });

  it("avisa si falta la API key", async () => {
    const res = await manejarChat(peticion(cuerpoValido), deps(null));
    expect(res.status).toBe(500);
    expect((await res.json()).codigo).toBe("sin_configurar");
  });
});

describe("protección", () => {
  it("la ventana del limitador se libera con el tiempo", () => {
    let t = 0;
    const l = new LimitadorDeTasa(2, 1000, () => t);
    expect(l.permitir("ip")).toBe(true);
    expect(l.permitir("ip")).toBe(true);
    expect(l.permitir("ip")).toBe(false);
    expect(l.permitir("otra-ip")).toBe(true);
    t = 1500;
    expect(l.permitir("ip")).toBe(true);
  });

  it("compara contraseñas de forma segura", () => {
    expect(verificarAcceso(null, undefined)).toBe(true);
    expect(verificarAcceso("a", "b")).toBe(false);
    expect(verificarAcceso("abc", "abcd")).toBe(false);
    expect(verificarAcceso("abcd", "abcd")).toBe(true);
  });
});

describe("la key no llega al cliente", () => {
  const archivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? archivos(p) : [p];
    });

  it("ningún componente cliente importa OpenAI ni lee OPENAI_API_KEY", () => {
    const raiz = join(__dirname, "..", "src");
    const clientes = archivos(raiz).filter((f) => /\.(tsx?|jsx?)$/.test(f) && readFileSync(f, "utf8").includes('"use client"'));
    expect(clientes.length).toBeGreaterThan(0);
    for (const f of clientes) {
      const codigo = readFileSync(f, "utf8");
      expect(codigo, f).not.toMatch(/from "openai"|OPENAI_API_KEY|@\/lib\/llm\/openai|@\/lib\/server/);
    }
  });

  it("el adaptador de OpenAI está marcado como server-only", () => {
    const codigo = readFileSync(join(__dirname, "..", "src", "lib", "llm", "openai.ts"), "utf8");
    expect(codigo.startsWith('import "server-only"')).toBe(true);
  });
});
