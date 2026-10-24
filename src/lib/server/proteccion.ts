import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Protección mínima contra abuso para una URL pública con una key de gasto limitado:
 * - Contraseña de acceso opcional (ACCESS_PASSWORD). Si está definida, se exige.
 * - Límite de mensajes por IP en una ventana deslizante (en memoria).
 *
 * Limitación conocida: en Vercel cada instancia serverless tiene su propia
 * memoria, así que el límite es "por instancia". Para producción iría en un
 * store compartido (Upstash/Redis). Para el alcance del reto, alcanza.
 */

export function verificarAcceso(passwordRecibida: string | null, passwordEsperada: string | undefined): boolean {
  if (!passwordEsperada) return true;
  if (!passwordRecibida) return false;
  const a = Buffer.from(passwordRecibida);
  const b = Buffer.from(passwordEsperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class LimitadorDeTasa {
  private readonly registros = new Map<string, number[]>();

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** Devuelve true si la petición se permite (y la cuenta). */
  permitir(clave: string): boolean {
    const t = this.ahora();
    const desde = t - this.ventanaMs;
    const recientes = (this.registros.get(clave) ?? []).filter((x) => x > desde);
    if (recientes.length >= this.maximo) {
      this.registros.set(clave, recientes);
      return false;
    }
    recientes.push(t);
    this.registros.set(clave, recientes);
    if (this.registros.size > 5000) this.limpiar(desde);
    return true;
  }

  private limpiar(desde: number) {
    for (const [k, v] of this.registros) {
      if (v.every((x) => x <= desde)) this.registros.delete(k);
    }
  }
}

export function ipDe(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconocida"
  );
}
