import { RequerimientoMotorSchema, type RequerimientoMotor } from "./contract";

export type ResultadoValidacion =
  | { ok: true; requerimiento: RequerimientoMotor }
  | { ok: false; errores: string[] };

/**
 * Valida un requerimiento en dos capas:
 * 1. Forma (Zod): tipos, campos obligatorios, enums.
 * 2. Coherencia: que cada relación use clases declaradas, que cada fuente y
 *    columna se justifique con algo que exista en el esquema o en las reglas,
 *    y que no aparezcan cifras que el usuario nunca dijo.
 *
 * `textoUsuario` es todo lo que escribió el usuario: las cifras que aparezcan
 * en el requerimiento tienen que salir de ahí.
 */
export function validarRequerimiento(entrada: unknown, textoUsuario: string): ResultadoValidacion {
  const forma = RequerimientoMotorSchema.safeParse(entrada);
  if (!forma.success) {
    return {
      ok: false,
      errores: forma.error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`),
    };
  }
  const req = forma.data;
  const errores = validarCoherencia(req);
  errores.push(...cifrasNoAportadas(textoDelRequerimiento(req), textoUsuario).map(
    (c) => `aparece la cifra "${c}" que el usuario no aportó; el agente no puede afirmar resultados ni cifras`,
  ));
  return errores.length ? { ok: false, errores } : { ok: true, requerimiento: req };
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Palabras que convierten una regla en conclusión o especulación (no verificable por el motor). */
export const REGLA_VAGA =
  /\b(podr[ií]an?|puede[n]? (?:indicar|afectar|ser|estar)|indica(?:r[ií]a)?|posibles?|es (?:la )?causa|probablemente|posiblemente|potencial(?:es|mente)?|quiz[aá]s?|significativ[oa]s?|habr[aá]|recomendad[oa]s?|evidencia para decidir|si (?:aumentar|cambiar|reducir|hacer|mejorar|implementar)\w*)\b/i;

export function validarCoherencia(req: RequerimientoMotor): string[] {
  const errores: string[] = [];
  const clases = new Set(req.esquema.clases.map(norm));

  if (clases.size !== req.esquema.clases.length) errores.push("esquema.clases: hay clases repetidas");

  req.esquema.relaciones.forEach((r, i) => {
    if (!clases.has(norm(r.sujeto)))
      errores.push(`esquema.relaciones[${i}]: el sujeto "${r.sujeto}" no está en esquema.clases`);
    if (!clases.has(norm(r.objeto)))
      errores.push(`esquema.relaciones[${i}]: el objeto "${r.objeto}" no está en esquema.clases`);
  });

  // Una regla es una condición verificable, no una conclusión ni una especulación.
  req.reglas_candidatas.forEach((r) => {
    const vaga = r.enunciado.match(REGLA_VAGA);
    if (vaga)
      errores.push(
        `reglas_candidatas ${r.id}: "${vaga[0]}" no es verificable. Escribila como "Si <condición observable en los datos>, entonces se marca <hecho>", sin conclusiones, especulación ni hipótesis sobre qué pasaría si se cambia algo (la decisión la toma el usuario con la evidencia)`,
      );
  });

  const ids = req.reglas_candidatas.map((r) => r.id);
  if (new Set(ids).size !== ids.length) errores.push("reglas_candidatas: hay ids repetidos");

  // Lo que puede justificar una fuente o columna: una clase, una regla o una relación.
  const justificables = new Set<string>([
    ...clases,
    ...ids.map(norm),
    ...req.esquema.relaciones.flatMap((r) => [
      norm(r.predicado),
      norm(`${r.sujeto} ${r.predicado} ${r.objeto}`),
      norm(`${r.sujeto}.${r.predicado}.${r.objeto}`),
    ]),
  ]);
  const revisar = (refs: string[], donde: string) => {
    for (const ref of refs) {
      if (!justificables.has(norm(ref)))
        errores.push(`${donde}: "${ref}" no es una clase, regla ni relación del requerimiento`);
    }
  };

  const nombresFuente = new Set<string>();
  req.fuentes_requeridas.forEach((f, i) => {
    if (nombresFuente.has(norm(f.nombre))) errores.push(`fuentes_requeridas[${i}]: fuente repetida "${f.nombre}"`);
    nombresFuente.add(norm(f.nombre));
    revisar(f.justifica, `fuentes_requeridas[${i}].justifica`);
    const columnas = new Set<string>();
    f.columnas_minimas.forEach((c, j) => {
      if (columnas.has(norm(c.nombre)))
        errores.push(`fuentes_requeridas[${i}].columnas_minimas[${j}]: columna repetida "${c.nombre}"`);
      columnas.add(norm(c.nombre));
      revisar(c.justifica, `fuentes_requeridas[${i}].columnas_minimas[${j}].justifica`);
    });
  });

  if (req.completitud === "suficiente_para_confirmar") {
    if (req.fuentes_requeridas.length === 0)
      errores.push("completitud: no puede ser suficiente_para_confirmar sin fuentes_requeridas");
    if (req.reglas_candidatas.length === 0)
      errores.push("completitud: no puede ser suficiente_para_confirmar sin reglas_candidatas");
  }
  return errores;
}

function textoDelRequerimiento(req: RequerimientoMotor): string {
  return [
    req.necesidad,
    req.decision_objetivo,
    req.alcance.periodo,
    ...req.reglas_candidatas.map((r) => r.enunciado),
    ...req.preguntas_abiertas,
  ].join("\n");
}

/**
 * Detecta porcentajes y montos de dinero que no aparecen en lo que escribió el
 * usuario. Los umbrales de una regla expresados en días o meses ("60 días") se
 * permiten: son una hipótesis a verificar, no un resultado.
 */
export function cifrasNoAportadas(texto: string, textoUsuario: string): string[] {
  const compacto = (s: string) =>
    norm(s)
      .replace(/por\s?ciento/g, "%")
      .replace(/\s+/g, "");
  const usuario = compacto(textoUsuario);
  const encontradas = new Set<string>();

  // Porcentajes: tienen que aparecer igual en lo que dijo el usuario.
  for (const m of texto.matchAll(/\d+(?:[.,]\d+)?\s?(?:%|por\s?ciento)/gi)) {
    if (!usuario.includes(compacto(m[0]))) encontradas.add(m[0].trim());
  }
  // Montos: basta con que el número exista en lo que dijo el usuario (la moneda puede escribirse distinto).
  const montos = [
    /(?:[$€£]|USD|COP|EUR|ARS|MXN)\s?\d[\d.,]*/gi,
    /\d[\d.,]*\s?(?:USD|COP|EUR|ARS|MXN|d[oó]lares|pesos|euros)\b/gi,
  ];
  for (const p of montos) {
    for (const m of texto.matchAll(p)) {
      const numero = m[0].match(/\d[\d.,]*\d|\d/)?.[0] ?? m[0];
      if (!usuario.includes(compacto(numero))) encontradas.add(m[0].trim());
    }
  }
  return [...encontradas];
}
