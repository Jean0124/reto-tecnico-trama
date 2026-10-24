"use client";

import { useEffect, useRef, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MensajeChat } from "@/lib/interview/contract";
import { cn } from "@/lib/utils";
import type { ErrorEnvio } from "./use-entrevista";

type Props = {
  mensajes: MensajeChat[];
  enviando: boolean;
  error: ErrorEnvio | null;
  borrador: string;
  setBorrador: (v: string) => void;
  onEnviar: (texto: string) => void;
  cerrado: boolean;
  necesitaPassword: boolean;
  onPassword: (v: string) => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
};

export function Chat({
  mensajes,
  enviando,
  error,
  borrador,
  setBorrador,
  onEnviar,
  cerrado,
  necesitaPassword,
  onPassword,
  composerRef,
}: Props) {
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length, enviando]);

  return (
    <section aria-label="Chat" className="flex min-h-0 flex-col bg-sidebar">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {mensajes.map((m, i) => (
          <Mensaje key={i} mensaje={m} />
        ))}
        {enviando && (
          <div className="w-full rounded-md border border-dashed p-2 text-sm">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Agente</div>
            <span className="text-muted-foreground">Pensando…</span>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="space-y-2 border-t p-4">
        {error && (
          <div role="alert" className="rounded-md border-2 border-foreground/40 p-2 text-sm">
            <span className="font-medium">No se envió. </span>
            {error.mensaje}
          </div>
        )}
        {necesitaPassword && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const valor = new FormData(e.currentTarget).get("password");
              if (typeof valor === "string" && valor) onPassword(valor);
            }}
          >
            <Input name="password" type="password" placeholder="Contraseña de acceso" aria-label="Contraseña de acceso" />
            <Button type="submit" variant="outline">
              Guardar
            </Button>
          </form>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onEnviar(borrador);
          }}
        >
          <Textarea
            ref={composerRef}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onEnviar(borrador);
              }
            }}
            disabled={cerrado}
            maxLength={4000}
            placeholder={cerrado ? "La entrevista está cerrada." : "Escribí tu mensaje…"}
            aria-label="Mensaje"
            className="max-h-48 min-h-16 rounded-lg bg-background"
          />
          <Button type="submit" disabled={cerrado || enviando || !borrador.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </section>
  );
}

function Mensaje({ mensaje }: { mensaje: MensajeChat }) {
  const agente = mensaje.rol === "agente";
  return (
    <div
      className={cn(
        "w-full rounded-md border p-2 text-sm whitespace-pre-wrap",
        agente ? "bg-muted" : "border-foreground/20 bg-background",
      )}
    >
      <div className="mb-1 text-xs font-medium text-muted-foreground">{agente ? "Agente" : "Vos"}</div>
      {mensaje.contenido}
    </div>
  );
}
