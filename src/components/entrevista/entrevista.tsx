"use client";

import { useRef } from "react";
import { Download, Moon, RotateCcw, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FASES, type Fase } from "@/lib/interview/engine";
import { cn } from "@/lib/utils";
import { Chat } from "./chat";
import { PanelRequerimiento } from "./panel-requerimiento";
import { exportarTranscripcion } from "./exportar";
import { useEntrevista } from "./use-entrevista";

export function Entrevista() {
  const e = useEntrevista();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Trama</span>
          <span className="hidden text-xs tracking-wide text-muted-foreground uppercase sm:inline">Entrevista de datos</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Exportar transcripción"
            aria-label="Exportar transcripción"
            onClick={() => exportarTranscripcion(e.mensajes, e.estado)}
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Nueva entrevista"
            aria-label="Nueva entrevista"
            onClick={() => {
              if (e.mensajes.length <= 1 || window.confirm("¿Empezar una entrevista nueva? Se borra la actual.")) e.reiniciar();
            }}
          >
            <RotateCcw />
          </Button>
          <BotonTema />
        </div>
      </header>

      <IndicadorFases fase={e.fase} />

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] divide-y lg:grid-cols-2 lg:grid-rows-1 lg:divide-x lg:divide-y-0">
        <Chat
          mensajes={e.mensajes}
          enviando={e.enviando}
          error={e.error}
          borrador={e.borrador}
          setBorrador={e.setBorrador}
          onEnviar={e.enviar}
          cerrado={e.estado.confirmado}
          necesitaPassword={e.necesitaPassword}
          onPassword={e.setPassword}
          composerRef={composerRef}
        />
        <PanelRequerimiento
          estado={e.estado}
          onConfirmar={e.confirmar}
          onAjustar={() => {
            if (!e.borrador.trim()) e.setBorrador("Quiero ajustar: ");
            composerRef.current?.focus();
          }}
        />
      </main>
    </div>
  );
}

function IndicadorFases({ fase }: { fase: Fase }) {
  const actual = FASES.findIndex((f) => f.id === fase);
  return (
    <nav aria-label="Fases de la entrevista" className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-6 py-2">
      {FASES.map((f, i) => (
        <div key={f.id} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-xs text-muted-foreground">→</span>}
          <span
            aria-current={i === actual ? "step" : undefined}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap",
              i === actual && "border-2 border-foreground font-semibold",
              i < actual && "border border-foreground/40",
              i > actual && "border border-dashed text-muted-foreground",
            )}
          >
            {i + 1} · {f.etiqueta}
          </span>
        </div>
      ))}
    </nav>
  );
}

function BotonTema() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Cambiar tema"
      aria-label="Cambiar tema claro u oscuro"
      onClick={() => {
        const oscuro = document.documentElement.classList.toggle("dark");
        try {
          localStorage.setItem("trama-tema", oscuro ? "dark" : "light");
        } catch {
          /* sin persistencia */
        }
      }}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
