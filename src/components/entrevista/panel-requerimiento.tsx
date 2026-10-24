"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { EstadoEntrevista, RequerimientoMotor } from "@/lib/interview/contract";
import { cn } from "@/lib/utils";

type Props = {
  estado: EstadoEntrevista;
  onConfirmar: () => void;
  onAjustar: () => void;
};

export function PanelRequerimiento({ estado, onConfirmar, onAjustar }: Props) {
  const total = estado.versiones.length;
  const [elegida, setElegida] = useState<number | null>(null);
  // Por defecto se muestra siempre la última versión.
  const indice = elegida !== null && elegida < total ? elegida : total - 1;
  const req = estado.versiones[indice];
  const esUltima = indice === total - 1;

  const etiquetaEstado = estado.confirmado
    ? "Confirmado"
    : total === 0
      ? "Sin requerimiento"
      : "Esperando confirmación";

  return (
    <section aria-label="Requerimiento de datos" className="flex min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <h2 className="text-sm font-semibold">Requerimiento de datos</h2>
        <Estado confirmado={estado.confirmado} vacio={total === 0}>
          {etiquetaEstado}
        </Estado>
      </div>

      {!req ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Todavía no hay requerimiento. El agente lo propone acá cuando entiende la necesidad: qué decisión querés
            tomar, sobre qué entidades y en qué período.
          </div>
          <ContextoParcial estado={estado} />
        </div>
      ) : (
        <>
          {total > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b px-6 py-2" role="tablist" aria-label="Versiones">
              <span className="mr-1 text-xs text-muted-foreground">Versión</span>
              {estado.versiones.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === indice}
                  onClick={() => setElegida(i === total - 1 ? null : i)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    i === indice ? "border-foreground/60 bg-foreground/5 font-semibold" : "border-dashed text-muted-foreground",
                  )}
                >
                  v{i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <Detalle req={req} />
          </div>
          <Acciones
            confirmado={estado.confirmado}
            esUltima={esUltima}
            suficiente={req.completitud === "suficiente_para_confirmar"}
            onConfirmar={onConfirmar}
            onAjustar={onAjustar}
            verUltima={() => setElegida(null)}
          />
        </>
      )}
    </section>
  );
}

function Estado({ children, confirmado, vacio }: { children: ReactNode; confirmado: boolean; vacio: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs",
        confirmado ? "border-2 border-foreground font-semibold" : vacio ? "border border-dashed text-muted-foreground" : "border bg-muted",
      )}
    >
      {children}
    </span>
  );
}

function Acciones(props: {
  confirmado: boolean;
  esUltima: boolean;
  suficiente: boolean;
  onConfirmar: () => void;
  onAjustar: () => void;
  verUltima: () => void;
}) {
  if (props.confirmado) {
    return (
      <div className="border-t p-4">
        <div className="rounded-xl border-2 border-foreground p-3 text-sm font-medium">
          Requerimiento confirmado. Es la entrada para cargar los datos en el motor.
        </div>
      </div>
    );
  }
  if (!props.esUltima) {
    return (
      <div className="border-t p-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm">
          <span className="text-muted-foreground">Estás viendo una versión anterior.</span>
          <Button size="sm" variant="outline" onClick={props.verUltima}>
            Ver la última
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="border-t p-4">
      <div className="space-y-3 rounded-xl border border-dashed p-3">
        <p className="text-center text-sm font-medium">
          {props.suficiente
            ? "Confirmá el esquema antes de cargar datos"
            : "Faltan datos: respondé las preguntas abiertas en el chat"}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={props.onAjustar}>
            Ajustar
          </Button>
          <Button onClick={props.onConfirmar} disabled={!props.suficiente}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs text-muted-foreground">{titulo}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl p-4 ring-1 ring-foreground/10", className)}>{children}</div>;
}

function Detalle({ req }: { req: RequerimientoMotor }) {
  return (
    <>
      <Seccion titulo="Necesidad">{req.necesidad}</Seccion>
      <Seccion titulo="Decisión objetivo">{req.decision_objetivo}</Seccion>
      <Seccion titulo="Alcance">
        {req.alcance.periodo}
        {req.alcance.unidades.length > 0 && (
          <span className="text-muted-foreground"> · {req.alcance.unidades.join(", ")}</span>
        )}
      </Seccion>
      <Seccion titulo="Clases">
        <span className="font-mono">{req.esquema.clases.join(" · ")}</span>
      </Seccion>
      {req.esquema.relaciones.length > 0 && (
        <Seccion titulo="Relaciones">
          <ul className="space-y-1 font-mono text-xs">
            {req.esquema.relaciones.map((r, i) => (
              <li key={i}>
                {r.sujeto} <span className="text-muted-foreground">—{r.predicado}→</span> {r.objeto}
              </li>
            ))}
          </ul>
        </Seccion>
      )}
      {req.reglas_candidatas.length > 0 && (
        <Seccion titulo="Reglas candidatas">
          <ul className="space-y-2">
            {req.reglas_candidatas.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className="font-mono text-xs font-semibold">{r.id}</span>
                <span>{r.enunciado}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
      <Seccion titulo="Fuentes requeridas">
        {req.fuentes_requeridas.length === 0 ? (
          <span className="text-muted-foreground">Ninguna todavía.</span>
        ) : (
          <div className="space-y-2">
            {req.fuentes_requeridas.map((f, i) => (
              <Tarjeta key={i}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{f.nombre}</span>
                  <span className="font-mono text-xs text-muted-foreground">{f.tipo}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {f.columnas_minimas.map((c, j) => (
                    <li key={j} className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs">
                      <span>{c.nombre}</span>
                      <span className="text-muted-foreground">← {c.justifica.join(", ")}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-muted-foreground">Justifica: {f.justifica.join(", ")}</div>
              </Tarjeta>
            ))}
          </div>
        )}
      </Seccion>
      {req.preguntas_abiertas.length > 0 && (
        <Seccion titulo="Preguntas abiertas">
          <ul className="list-disc space-y-1 pl-4">
            {req.preguntas_abiertas.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Seccion>
      )}
      <Seccion titulo="Completitud">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs",
            req.completitud === "suficiente_para_confirmar" ? "border font-semibold" : "border border-dashed",
          )}
        >
          {req.completitud === "suficiente_para_confirmar" ? "Suficiente para confirmar" : "Faltan datos"}
        </span>
      </Seccion>
    </>
  );
}

function ContextoParcial({ estado }: { estado: EstadoEntrevista }) {
  const c = estado.contexto;
  const filas: [string, string | null][] = [
    ["Decisión", c.decision],
    ["Entidades", c.entidades.join(", ") || null],
    ["Período", c.periodo],
    ["Sospecha inicial", c.sospecha],
  ];
  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-xs text-muted-foreground">Lo que el agente ya entendió</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={cn(!v && "text-muted-foreground")}>{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
