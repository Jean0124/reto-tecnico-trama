import type { ClienteLLM, PeticionLLM, RespuestaLLM } from "./types";

type Paso = RespuestaLLM | Error | ((p: PeticionLLM) => RespuestaLLM | Promise<RespuestaLLM>);

/**
 * Cliente LLM simulado que responde con un guion fijo. Se usa en los tests
 * (sin red) y en el modo demo local (LLM_SIMULADO=1).
 */
export class ClienteGuionado implements ClienteLLM {
  readonly peticiones: PeticionLLM[] = [];
  private indice = 0;

  constructor(private readonly guion: Paso[]) {}

  async completar(p: PeticionLLM): Promise<RespuestaLLM> {
    this.peticiones.push(structuredClone({ ...p, signal: undefined }));
    const paso = this.guion[this.indice++];
    if (paso === undefined) throw new Error(`El guion no tiene paso ${this.indice}`);
    if (paso instanceof Error) throw paso;
    return typeof paso === "function" ? paso(p) : paso;
  }
}

let contador = 0;
export const texto = (t: string): RespuestaLLM => ({ texto: t, llamadas: [] });
export const herramienta = (nombre: string, args: unknown, t: string | null = null): RespuestaLLM => ({
  texto: t,
  llamadas: [{ id: `call_${++contador}`, nombre, argumentos: typeof args === "string" ? args : JSON.stringify(args) }],
});
