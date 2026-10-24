# Trama — chat de entrada

Chat que entrevista al usuario sobre un problema de negocio, propone un modelo (clases, relaciones y reglas candidatas) y deja especificado, con un objeto tipado y validado en el servidor, qué datos necesita el motor de inferencia. El usuario revisa el requerimiento en un panel y lo confirma o pide ajustes.

- **Demo:** `<URL de Vercel>`
- **Diseño de la entrevista:** [DESIGN.md](./DESIGN.md)
- **Transcripciones de prueba:** [`transcripciones/`](./transcripciones)

## Correr en local

Requiere Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local   # completar OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Sin key: `LLM_SIMULADO=1 npm run dev` usa un modelo simulado para recorrer la UI.

| Script | Qué hace |
|---|---|
| `npm test` | Tests unitarios y de integración (Vitest), **sin red**, con un cliente LLM simulado |
| `npm run e2e` | End-to-end con Playwright en modo simulado: flujo feliz y error de la API sin perder el mensaje (la primera vez: `npx playwright install chromium`) |
| `npm run typecheck` / `npm run lint` | TypeScript y ESLint |

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `OPENAI_API_KEY` | sí | Solo se lee en el servidor (`src/app/api/chat/route.ts`). |
| `OPENAI_MODEL` | no | Por defecto `gpt-4.1-mini`. |
| `OPENAI_BASE_URL` | no | Endpoint compatible con OpenAI (por ejemplo OpenRouter: `https://openrouter.ai/api/v1`, con `OPENAI_MODEL=openai/gpt-4.1-mini`). Vacío = OpenAI. |
| `ACCESS_PASSWORD` | recomendada | Si está definida, la API exige el header `x-access-password` y la UI pide la contraseña. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | no | Mensajes por IP por ventana (30 cada 10 min por defecto). |
| `LLM_TIMEOUT_MS`, `TURNO_TIMEOUT_MS` | no | Tiempo máximo por llamada (20 s) y por turno (55 s). Subirlos solo en local con modelos lentos; en Vercel la ruta corta a los 60 s. |
| `LLM_SIMULADO` | no | `1` = modelo simulado, sin red. |

## Arquitectura

```
src/
  app/
    api/chat/route.ts        ← Route Handler: arma dependencias reales (OpenAI, límites)
    page.tsx, layout.tsx
  components/entrevista/     ← UI (cliente): chat, panel, fases, estado en localStorage
  lib/
    interview/               ← lógica de la entrevista, sin dependencias de OpenAI
      contract.ts            ← RequerimientoMotor (Zod) + JSON Schema de las tools
      engine.ts              ← máquina de fases (determinista)
      prompt.ts              ← system prompt por fase
      validation.ts          ← validación de forma + coherencia + cifras
      orchestrator.ts        ← un turno: modelo ↔ tools ↔ validación
    llm/
      types.ts               ← interfaz ClienteLLM propia
      openai.ts              ← adaptador OpenAI (server-only)
      guionado.ts, demo.ts   ← clientes simulados (tests / demo)
    server/                  ← handler HTTP testeable, contraseña y rate limit
tests/                       ← Vitest
e2e/                         ← Playwright
```

**Límites claros:**

- **Prompt** (`prompt.ts`): estrategia de entrevista y reglas de redacción. No decide fases.
- **Tools** (`orchestrator.ts`): `registrar_contexto` y `registrar_requerimiento`, con JSON Schema generado desde Zod en modo `strict`. Qué tools se ofrecen depende de la fase.
- **Validación** (`validation.ts`): todo lo que viene del modelo se valida en el servidor antes de mostrarse.
- **UI**: solo renderiza el estado y llama a `/api/chat`; nunca ve la key.

**Cambiar de proveedor** = escribir otra clase que implemente `ClienteLLM` y usarla en `route.ts`. La entrevista no se toca.

**Estado:** el servidor es *stateless*. El cliente guarda la conversación y el estado (contexto, versiones del requerimiento, confirmación) en `localStorage` y los envía en cada turno; el servidor los valida con Zod antes de usarlos.

## Robustez

- **Tool call inválida:** el modelo recibe los errores y corrige (2 intentos); si no, no se muestra nada y el agente pide lo que falta.
- **JSON mal formado** en los argumentos: se trata igual que un requerimiento inválido.
- **Tool fuera de fase:** se rechaza y se le avisa al modelo.
- **Timeouts y errores de la API:** 20 s por llamada al modelo (1 reintento), tope de 55 s por turno completo (por debajo del `maxDuration` de 60 s de la ruta) y 150 s en el cliente. Los errores se traducen a mensajes claros (504/502/503) y **el mensaje del usuario vuelve al cuadro de texto** para reintentar.
- **Abuso:** contraseña opcional, límite por IP, máximo de 40 mensajes por conversación y de 4000 caracteres por mensaje, `max_completion_tokens` acotado.
- **La key:** solo en variables de entorno del servidor. `openai.ts` importa `server-only` (si un componente cliente lo importara, el build falla) y un test verifica que ningún componente cliente la toque.

## Decisiones y alternativas descartadas

- **Extensión del contrato:** `columnas_minimas` pasa de `string[]` a `[{ nombre, justifica }]`. Sin esto, la regla "cada columna debe estar justificada" no se puede verificar en el servidor.
- **Fases en código, no en el prompt:** se descartó dejar que el modelo decida cuándo proponer. Es menos predecible y no se puede testear sin red.
- **Function calling con dos tools** en lugar de `response_format`: permite conversar y registrar en el mismo turno, y registrar el contexto parcial por separado.
- **Chat Completions** en lugar de la Responses API: más simple para un servidor stateless que reenvía el historial completo.
- **Sin streaming:** el valor está en el requerimiento validado, que llega completo al final del turno. Se priorizó la robustez.
- **Confirmación en el cliente:** confirmar no requiere al modelo. Es una acción del usuario sobre una versión ya validada.
- **Rate limit en memoria** en lugar de Redis/Upstash: alcanza para el reto (ver limitaciones).

## Qué haría después

1. **Persistir el requerimiento confirmado** en el backend (con id y versión) en vez de `localStorage`.
2. **Carga de datos guiada por el requerimiento:** al subir cada fuente, validar que traiga las columnas mínimas, sugerir el mapeo de columnas reales a las pedidas y marcar lo que falta.
3. **Del requerimiento al motor:** traducir clases y relaciones a la ontología, y reglas candidatas a reglas ejecutables, sin pasar por el LLM para la lógica.
4. Si una regla no se puede formalizar o falta una columna para verificarla, volver a la entrevista con esa pregunta concreta.

## Limitaciones conocidas

- El rate limit es por instancia serverless (en Vercel cada instancia tiene su memoria). En producción iría en un store compartido.
- El estado viaja desde el cliente: un usuario podría editarlo. Se valida la forma, pero no se firma.
- El control de cifras detecta porcentajes y montos, no afirmaciones causales sin números ("la causa son los turnos"). Eso depende del prompt.
- La entrevista puede fallar cuando el usuario plantea **varias necesidades a la vez** (tiende a mezclarlas en un solo modelo) o cuando **no hay una decisión clara** detrás de la pregunta.
- Interfaz y prompt en español.

## Entrega

- [ ] URL de Vercel
- [ ] Repo con commits convencionales
- [x] DESIGN.md
- [ ] Tres transcripciones en `transcripciones/` (botón "Exportar transcripción" en la app)
- [ ] Video o GIF del flujo completo
