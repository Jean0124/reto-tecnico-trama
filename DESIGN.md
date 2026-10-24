# Diseño de la entrevista

El objetivo es llevar al usuario de *"tengo un problema"* a un **requerimiento de datos mínimo, justificado y confirmado**, en la menor cantidad de turnos posible y sin que el agente invente nada.

## Principio: el motor decide la fase, el LLM aporta datos

La fase de la entrevista **no la decide el modelo**. La calcula código determinista (`src/lib/interview/engine.ts`) a partir del estado. El modelo solo:

1. Registra lo que el usuario dijo (`registrar_contexto`).
2. Propone el requerimiento (`registrar_requerimiento`) cuando la fase lo permite.
3. Redacta las preguntas y respuestas en lenguaje natural.

Así el criterio de *cuándo preguntar, cuándo proponer y cuándo detenerse* es verificable con tests y no depende de OpenAI.

## Fases

```
delimitar ──(decisión + entidades + período, o 4 turnos)──▶ proponer y pedir
proponer  ──(requerimiento válido registrado)──────────────▶ revisar
revisar   ──(ajuste del usuario → nueva versión)───────────▶ revisar
revisar   ──(usuario aprieta "Confirmar")──────────────────▶ confirmado
```

| Fase | Qué hace el agente | Herramientas | Condición para avanzar |
|---|---|---|---|
| **Delimitar** | Pregunta lo justo: qué decisión se quiere tomar, sobre qué entidades, en qué período y con qué sospecha inicial. 1–2 preguntas por turno. | `registrar_contexto` | Se conocen **decisión, entidades y período**. La sospecha se pide pero es opcional (si el usuario no sabe, queda como pregunta abierta). |
| **Proponer y pedir** | Propone clases, relaciones y reglas candidatas en el vocabulario del usuario, y lista las fuentes y columnas mínimas, cada una justificada. | `registrar_contexto`, `registrar_requerimiento` | Un requerimiento pasa la validación del servidor. |
| **Revisar** | El usuario ve el requerimiento en el panel. Si pide un cambio, el agente registra una versión nueva completa; si pregunta algo, responde sin registrar. | ambas | El usuario confirma (botón). |
| **Confirmado** | Fin. El chat se cierra y el servidor rechaza nuevos turnos (409). | ninguna | — |

### Cuándo pregunta

- Solo en **Delimitar**, y solo por lo que falta (el prompt recibe la lista de faltantes calculada por el motor).
- Pregunta lo que **cambia el modelo o los datos a pedir**. Si una respuesta no cambia qué clases, relaciones, reglas o columnas se piden, no se pregunta.
- En **Proponer** puede hacer como mucho una pregunta más, si cambia de forma importante qué datos pedir (por ejemplo, si un registro existe o no). Si no, propone y deja la duda en `preguntas_abiertas`.

### Cuándo propone

- Apenas se conocen decisión, entidades y período.
- O al llegar a **4 turnos** del usuario, aunque falte algo: propone con lo que hay y marca `completitud: "faltan_datos"` si corresponde. Esto evita entrevistas infinitas.
- A los **6 turnos** sin propuesta el motor **fuerza** la llamada a `registrar_requerimiento` (`tool_choice`).

### Cuándo se detiene

- Cuando el usuario confirma. El cierre lo hace la UI (no hace falta otra llamada al modelo) y el servidor rechaza turnos posteriores.
- El botón **Confirmar** solo se habilita si `completitud` es `suficiente_para_confirmar`; con `faltan_datos`, el panel pide resolver las preguntas abiertas en el chat.

## Validación del requerimiento (servidor)

Un requerimiento solo se muestra si pasa dos capas (`src/lib/interview/validation.ts`):

1. **Forma (Zod, estricto):** campos obligatorios, tipos, enums (`excel | csv | pdf | crm-export`), ids `R1…`, sin claves extra.
2. **Coherencia:**
   - sujeto y objeto de cada relación son clases declaradas;
   - cada fuente **y cada columna** se justifica con una clase, una regla o una relación existente;
   - sin ids de regla, fuentes ni columnas repetidas;
   - no puede ser `suficiente_para_confirmar` sin fuentes ni reglas;
   - **ninguna cifra que el usuario no haya dicho** (porcentajes y montos).
   - **reglas verificables:** se rechazan reglas con conclusiones o especulación ("podría", "indica", "posible causa", "significativo", "no registrado"). Una regla es "Si <condición observable>, entonces se marca <hecho>".

Si falla, el modelo recibe los errores como resultado de la tool y puede corregir **dos veces** en el mismo turno. Si sigue fallando, no se registra nada y el agente debe pedirle al usuario lo que falta.

## "Ninguna cifra sale del LLM"

- El prompt lo prohíbe de forma explícita.
- La validación rechaza requerimientos con porcentajes o montos que no aparecen en lo que escribió el usuario.
- La respuesta de chat pasa por el mismo control: si trae cifras inventadas se pide una reescritura y, si insiste, se reemplaza por una respuesta segura.
- Los umbrales de reglas en días o meses ("60 días") se permiten: son hipótesis a verificar, no resultados.

## Agnóstico al dominio

No hay listas de clases, fuentes ni preguntas por caso de uso. Lo único fijo es la **estructura** de la entrevista (decisión, entidades, período, sospecha) y del requerimiento. Las clases y relaciones se nombran con las palabras del usuario.
