"use client";

import { useRef, useState } from "react";
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
  // En pantallas chicas se ve una columna a la vez; en lg se ven las dos y las pestañas no se muestran.
  const [vista, setVista] = useState<Vista>("chat");
  // Cuántas versiones había la última vez que el usuario miró el panel o escribió (null = aún no interactuó,
  // así una conversación restaurada no aparece como "nueva").
  const [versionesVistas, setVersionesVistas] = useState<number | null>(null);
  const totalVersiones = e.estado.versiones.length;
  const novedad = vista === "chat" && versionesVistas !== null && totalVersiones > versionesVistas;
  const cambiarVista = (v: Vista) => {
    setVista(v);
    setVersionesVistas(totalVersiones);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Trama</span>
          <span className="hidden text-xs tracking-wide text-muted-foreground uppercase sm:inline">
            Entrevista de datos
          </span>
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
              if (e.mensajes.length <= 1 || window.confirm("¿Empezar una entrevista nueva? Se borra la actual."))
                e.reiniciar();
            }}
          >
            <RotateCcw />
          </Button>
          <BotonTema />
        </div>
      </header>

      <IndicadorFases fase={e.fase} />

      <PestanasMovil vista={vista} onCambiar={cambiarVista} novedad={novedad} version={totalVersiones} />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:divide-x">
        <Chat
          className={cn(vista === "panel" && "hidden lg:flex")}
          mensajes={e.mensajes}
          enviando={e.enviando}
          error={e.error}
          borrador={e.borrador}
          setBorrador={e.setBorrador}
          onEnviar={(texto) => {
            setVersionesVistas(totalVersiones);
            e.enviar(texto);
          }}
          cerrado={e.estado.confirmado}
          necesitaPassword={e.necesitaPassword}
          onPassword={e.setPassword}
          composerRef={composerRef}
        />
        <PanelRequerimiento
          className={cn(vista === "chat" && "hidden lg:flex")}
          estado={e.estado}
          onConfirmar={e.confirmar}
          onAjustar={() => {
            if (!e.borrador.trim()) e.setBorrador("Quiero ajustar: ");
            cambiarVista("chat");
            setTimeout(() => composerRef.current?.focus(), 0);
          }}
        />
      </main>
    </div>
  );
}

type Vista = "chat" | "panel";

function PestanasMovil({
  vista,
  onCambiar,
  novedad,
  version,
}: {
  vista: Vista;
  onCambiar: (v: Vista) => void;
  novedad: boolean;
  version: number;
}) {
  const pestanas: { id: Vista; etiqueta: string }[] = [
    { id: "chat", etiqueta: "Chat" },
    { id: "panel", etiqueta: version > 0 ? `Requerimiento (v${version})` : "Requerimiento" },
  ];
  return (
    <div role="tablist" aria-label="Vista" className="grid shrink-0 grid-cols-2 border-b lg:hidden">
      {pestanas.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={vista === p.id}
          onClick={() => onCambiar(p.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 text-sm",
            vista === p.id ? "border-b-2 border-foreground font-semibold" : "text-muted-foreground",
          )}
        >
          {p.etiqueta}
          {p.id === "panel" && novedad && (
            <span className="rounded border border-foreground/60 px-1 text-[10px] leading-4 font-semibold tracking-wide text-foreground uppercase">
              nueva
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function IndicadorFases({ fase }: { fase: Fase }) {
  const actual = FASES.findIndex((f) => f.id === fase);
  return (
    <nav
      aria-label="Fases de la entrevista"
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-6 py-2"
    >
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
