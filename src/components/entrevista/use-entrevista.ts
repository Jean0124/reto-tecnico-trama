"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ESTADO_INICIAL, EstadoSchema, MensajeChatSchema, type EstadoEntrevista, type MensajeChat } from "@/lib/interview/contract";
import { calcularFase, type Fase } from "@/lib/interview/engine";

const CLAVE = "trama-entrevista-v1";
const CLAVE_PASSWORD = "trama-acceso";
// Holgado: el servidor corta antes (55 s por defecto) y responde con un error claro.
const TIMEOUT_CLIENTE_MS = 150_000;

export const SALUDO: MensajeChat = {
  rol: "agente",
  contenido:
    "Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.\n\nContame con tus palabras qué está pasando. Por ejemplo: \"se nos está yendo gente de operaciones\" o \"el inventario no cuadra\".",
};

type Guardado = { mensajes: MensajeChat[]; estado: EstadoEntrevista };

function leer(): Guardado | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    const mensajes = MensajeChatSchema.array().safeParse(datos.mensajes);
    const estado = EstadoSchema.safeParse(datos.estado);
    return mensajes.success && estado.success ? { mensajes: mensajes.data, estado: estado.data } : null;
  } catch {
    return null;
  }
}

function leerPassword(): string {
  try {
    return localStorage.getItem(CLAVE_PASSWORD) ?? "";
  } catch {
    return "";
  }
}

export type ErrorEnvio = { mensaje: string; codigo: string };

export function useEntrevista() {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([SALUDO]);
  const [estado, setEstado] = useState<EstadoEntrevista>(ESTADO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorEnvio | null>(null);
  const [borrador, setBorrador] = useState("");
  const [password, setPasswordState] = useState("");
  const [necesitaPassword, setNecesitaPassword] = useState(false);
  const [cargado, setCargado] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Restaurar la sesión guardada (solo en el cliente).
  useEffect(() => {
    const guardado = leer();
    /* eslint-disable react-hooks/set-state-in-effect -- hidratar desde localStorage solo es posible tras montar */
    if (guardado) {
      setMensajes(guardado.mensajes.length ? guardado.mensajes : [SALUDO]);
      setEstado(guardado.estado);
    }
    setPasswordState(leerPassword());
    setCargado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ mensajes, estado }));
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }, [mensajes, estado, cargado]);

  const setPassword = useCallback((valor: string) => {
    setPasswordState(valor);
    setNecesitaPassword(false);
    setError(null);
    try {
      localStorage.setItem(CLAVE_PASSWORD, valor);
    } catch {
      /* sin persistencia */
    }
  }, []);

  const enviar = useCallback(
    async (texto: string) => {
      const contenido = texto.trim();
      if (!contenido || enviando || estado.confirmado) return;

      const historial: MensajeChat[] = [...mensajes, { rol: "usuario", contenido }];
      setMensajes(historial);
      setBorrador("");
      setError(null);
      setEnviando(true);

      const controlador = new AbortController();
      abortRef.current = controlador;
      const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_CLIENTE_MS);

      const revertir = (e: ErrorEnvio) => {
        // El mensaje no se pierde: vuelve al compositor para reintentar.
        setMensajes(mensajes);
        setBorrador(contenido);
        setError(e);
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(password ? { "x-access-password": password } : {}) },
          body: JSON.stringify({ mensajes: historial, estado }),
          signal: controlador.signal,
        });
        const datos = await res.json().catch(() => null);
        if (!res.ok || !datos) {
          if (res.status === 401) setNecesitaPassword(true);
          revertir({
            codigo: datos?.codigo ?? `http_${res.status}`,
            mensaje: datos?.error ?? "No se pudo obtener respuesta. Probá de nuevo.",
          });
          return;
        }
        setMensajes([...historial, { rol: "agente", contenido: datos.respuesta }]);
        setEstado(datos.estado);
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        revertir({
          codigo: abortado ? "timeout_cliente" : "red",
          mensaje: abortado
            ? "La respuesta tardó demasiado. Tu mensaje sigue en el cuadro: probá enviarlo de nuevo."
            : "Sin conexión con el servidor. Tu mensaje sigue en el cuadro: probá de nuevo.",
        });
      } finally {
        clearTimeout(temporizador);
        abortRef.current = null;
        setEnviando(false);
      }
    },
    [enviando, estado, mensajes, password],
  );

  const confirmar = useCallback(() => {
    if (estado.confirmado || estado.versiones.length === 0) return;
    const version = estado.versiones.length;
    setEstado({ ...estado, confirmado: true });
    setMensajes((m) => [
      ...m,
      {
        rol: "agente",
        contenido: `Listo: confirmaste la versión ${version} del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.`,
      },
    ]);
  }, [estado]);

  const reiniciar = useCallback(() => {
    abortRef.current?.abort();
    setMensajes([SALUDO]);
    setEstado(ESTADO_INICIAL);
    setBorrador("");
    setError(null);
  }, []);

  const fase: Fase = calcularFase(estado);

  return {
    mensajes,
    estado,
    fase,
    enviando,
    error,
    borrador,
    setBorrador,
    enviar,
    confirmar,
    reiniciar,
    password,
    setPassword,
    necesitaPassword,
  };
}
