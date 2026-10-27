"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EstadoEntrevista, RequerimientoMotor } from "@/lib/interview/contract";
import { clave, compararVersiones, resumirCambios, type DiffRequerimiento } from "@/lib/interview/diff";
import { cn } from "@/lib/utils";
import { descargarPlantilla, descargarRequerimiento, explicarReferencias, TIPO_LEGIBLE } from "./exportar";

type Props = {
  estado: EstadoEntrevista;
  onConfirmar: () => void;
  onAjustar: () => void;
  className?: string;
};

export function PanelRequerimiento({ estado, onConfirmar, onAjustar, className }: Props) {
  const total = estado.versiones.length;
  const [elegida, setElegida] = useState<number | null>(null);
  // Por defecto se muestra siempre la última versión.
  const indice = elegida !== null && elegida < total ? elegida : total - 1;
  const req = estado.versiones[indice];
  const esUltima = indice === total - 1;
  const diff = req && indice > 0 ? compararVersiones(estado.versiones[indice - 1], req) : null;

  const etiquetaEstado = estado.confirmado
    ? "Confirmado"
    : total === 0
      ? "Sin requerimiento"
      : "Esperando confirmación";

  return (
    <section aria-label="Requerimiento de datos" className={cn("flex min-h-0 flex-col bg-background", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <h2 className="text-sm font-semibold">Requerimiento de datos</h2>
        <Estado confirmado={estado.confirmado} vacio={total === 0}>
          {etiquetaEstado}
        </Estado>
      </div>

      {!req ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Acá va a aparecer tu requerimiento de datos.</p>
            <p className="mt-1">
              Es la lista de lo que habría que cargar en Trama para analizar tu problema: el modelo (clases, relaciones
              y reglas a verificar) y los archivos con las columnas mínimas, cada una justificada. Lo revisás, pedís
              ajustes y lo confirmás.
            </p>
            <p className="mt-1">
              El agente lo propone cuando entiende qué decisión querés tomar, sobre qué entidades y en qué período.
            </p>
          </div>
          <ContextoParcial estado={estado} />
        </div>
      ) : (
        <>
          {total > 1 && (
            <div
              className="flex flex-wrap items-center gap-1.5 border-b px-6 py-2"
              role="tablist"
              aria-label="Versiones"
            >
              <span className="mr-1 text-xs text-muted-foreground">Versión</span>
              {estado.versiones.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === indice}
                  onClick={() => setElegida(i === total - 1 ? null : i)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    i === indice
                      ? "border-foreground/60 bg-foreground/5 font-semibold"
                      : "border-dashed text-muted-foreground",
                  )}
                >
                  v{i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {diff && <ResumenCambios diff={diff} req={req} versionAnterior={indice} />}
            <Detalle req={req} diff={diff} />
          </div>
          <Acciones
            confirmado={estado.confirmado}
            esUltima={esUltima}
            suficiente={req.completitud === "suficiente_para_confirmar"}
            req={req}
            version={indice + 1}
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
        confirmado
          ? "border-2 border-foreground font-semibold"
          : vacio
            ? "border border-dashed text-muted-foreground"
            : "border bg-muted",
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
  req: RequerimientoMotor;
  version: number;
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
          <DialogoConfirmar
            req={props.req}
            version={props.version}
            disabled={!props.suficiente}
            onConfirmar={props.onConfirmar}
          />
        </div>
      </div>
    </div>
  );
}

function DialogoConfirmar(props: {
  req: RequerimientoMotor;
  version: number;
  disabled: boolean;
  onConfirmar: () => void;
}) {
  const { req } = props;
  const columnas = req.fuentes_requeridas.reduce((n, f) => n + f.columnas_minimas.length, 0);
  const pendientes = req.preguntas_abiertas.length;
  const filas: [string, number][] = [
    [req.fuentes_requeridas.length === 1 ? "archivo" : "archivos", req.fuentes_requeridas.length],
    [columnas === 1 ? "columna" : "columnas", columnas],
    [req.reglas_candidatas.length === 1 ? "regla a verificar" : "reglas a verificar", req.reglas_candidatas.length],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={props.disabled}>Confirmar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>¿Confirmar la versión {props.version}?</DialogTitle>
        <DialogDescription>
          Vas a confirmar este requerimiento como la lista de datos a cargar en Trama. Después ya no se puede ajustar y
          la entrevista se cierra.
        </DialogDescription>
        <div className="grid grid-cols-3 gap-2">
          {filas.map(([etiqueta, n]) => (
            <div key={etiqueta} className="rounded-xl p-3 text-center ring-1 ring-foreground/10">
              <p className="text-xl font-semibold">{n}</p>
              <p className="text-xs text-muted-foreground">{etiqueta}</p>
            </div>
          ))}
        </div>
        {pendientes > 0 && (
          <p className="rounded-md border border-dashed p-2 text-sm">
            <span className="font-medium">
              {pendientes === 1 ? "Queda 1 pregunta sin resolver." : `Quedan ${pendientes} preguntas sin resolver.`}
            </span>{" "}
            <span className="text-muted-foreground">Podés confirmar igual y resolverla al cargar los datos.</span>
          </p>
        )}
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Volver</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={props.onConfirmar}>Sí, confirmar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Marca({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1.5 inline-block rounded border border-foreground/60 px-1 align-middle text-[10px] leading-4 font-semibold tracking-wide uppercase">
      {children}
    </span>
  );
}

function ResumenCambios({
  diff,
  req,
  versionAnterior,
}: {
  diff: DiffRequerimiento;
  req: RequerimientoMotor;
  versionAnterior: number;
}) {
  const frases = resumirCambios(diff, req, (t) => TIPO_LEGIBLE[t] ?? t);
  return (
    <div className="rounded-xl border-2 border-foreground/40 p-4">
      <h3 className="text-sm font-semibold">Cambios respecto a la v{versionAnterior}</h3>
      {frases.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Sin cambios en archivos, columnas ni reglas.</p>
      ) : (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm">
          {frases.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
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

/** "trabajaEnTurno" → "trabaja en turno" */
export function humanizar(predicado: string): string {
  return predicado
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

function Detalle({ req, diff }: { req: RequerimientoMotor; diff: DiffRequerimiento | null }) {
  return (
    <>
      <div className="space-y-3">
        <Seccion titulo="Qué querés decidir">{req.decision_objetivo}</Seccion>
        <Seccion titulo="El problema">{req.necesidad}</Seccion>
        <Seccion titulo="Período a analizar">
          {req.alcance.periodo}
          {req.alcance.unidades.length > 0 && (
            <span className="text-muted-foreground"> · {req.alcance.unidades.join(", ")}</span>
          )}
        </Seccion>
      </div>

      <Seccion
        titulo={`Datos que hay que traer (${req.fuentes_requeridas.length} ${
          req.fuentes_requeridas.length === 1 ? "archivo" : "archivos"
        })`}
      >
        {req.fuentes_requeridas.length === 0 ? (
          <span className="text-muted-foreground">Todavía ninguno.</span>
        ) : (
          <div className="space-y-3">
            {req.fuentes_requeridas.map((f, i) => {
              const cambio = diff?.fuentes.get(clave(f.nombre));
              return (
                <Tarjeta
                  key={i}
                  className={cn(
                    "overflow-hidden p-0",
                    cambio && cambio.estado !== "igual" && "ring-2 ring-foreground/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold break-words">{f.nombre}</span>
                      {cambio?.estado === "nueva" && <Marca>nuevo</Marca>}
                      {cambio?.estado === "cambiada" && <Marca>cambió</Marca>}
                      <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                        {TIPO_LEGIBLE[f.tipo] ?? f.tipo}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => descargarPlantilla(f)}
                      title="Descarga un CSV con estas columnas como encabezado"
                    >
                      <Download className="size-3.5" />
                      Plantilla
                    </Button>
                  </div>
                  <table className="w-full table-fixed text-left text-xs">
                    <thead>
                      <tr className="border-y bg-muted/50 text-muted-foreground">
                        <th className="w-2/5 px-4 py-1.5 font-medium">Columna</th>
                        <th className="px-4 py-1.5 font-medium">Para qué se usa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.columnas_minimas.map((c, j) => (
                        <tr key={j} className="border-b last:border-b-0">
                          <td className="px-4 py-1.5 align-top font-mono font-medium break-words">
                            {c.nombre}
                            {cambio?.estado === "cambiada" && cambio.columnasNuevas.has(clave(c.nombre)) && (
                              <Marca>nueva</Marca>
                            )}
                          </td>
                          <td
                            className="px-4 py-1.5 align-top text-muted-foreground"
                            title={explicarReferencias(c.justifica, req)}
                          >
                            {c.justifica.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Tarjeta>
              );
            })}
            <Button variant="outline" size="sm" className="w-full" onClick={() => descargarRequerimiento(req)}>
              <Download />
              Descargar la tabla completa (CSV)
            </Button>
          </div>
        )}
      </Seccion>

      {req.reglas_candidatas.length > 0 && (
        <Seccion titulo="Qué va a verificar el motor con esos datos">
          <ul className="space-y-2">
            {req.reglas_candidatas.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className="shrink-0 rounded-md border px-1.5 font-mono text-xs leading-5 font-semibold">
                  {r.id}
                </span>
                <span>
                  {r.enunciado}
                  {diff?.reglas.get(r.id) === "nueva" && <Marca>nueva</Marca>}
                  {diff?.reglas.get(r.id) === "cambiada" && <Marca>cambió</Marca>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Son hipótesis: el motor las comprueba con tus datos reales. El agente no afirma que se cumplan.
          </p>
        </Seccion>
      )}

      {req.preguntas_abiertas.length > 0 && (
        <Seccion titulo="Falta definir">
          <ul className="list-disc space-y-1 pl-4">
            {req.preguntas_abiertas.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Seccion>
      )}

      <div className="space-y-2 border-t pt-4">
        <Desplegable titulo="Ver el modelo (entidades y relaciones)">
          <Seccion titulo="Entidades">
            <div className="flex flex-wrap gap-1.5">
              {req.esquema.clases.map((c) => (
                <span key={c} className="rounded-md border px-2 py-0.5 text-xs">
                  {c}
                </span>
              ))}
            </div>
          </Seccion>
          {req.esquema.relaciones.length > 0 && (
            <Seccion titulo="Cómo se relacionan">
              <ul className="space-y-1">
                {req.esquema.relaciones.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.sujeto}</span>{" "}
                    <span className="text-muted-foreground">{humanizar(r.predicado)}</span>{" "}
                    <span className="font-medium">{r.objeto}</span>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}
        </Desplegable>
        <Desplegable titulo="Ver el requerimiento en JSON (para el motor)">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(req, null, 2)}
          </pre>
        </Desplegable>
      </div>
    </>
  );
}

function Desplegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-dashed px-4 py-2 open:border-solid">
      <summary className="cursor-pointer text-xs text-muted-foreground select-none group-open:font-medium group-open:text-foreground">
        {titulo}
      </summary>
      <div className="mt-3 space-y-3 pb-2">{children}</div>
    </details>
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
