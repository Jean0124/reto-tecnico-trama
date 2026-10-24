# Transcripción — entrevista Trama

Fecha: 2026-10-24T22:04:21.879Z  
Estado: confirmado  
Versiones del requerimiento: 2

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Se nos está yendo mucha gente de operaciones y no sabemos por qué.

**Agente:** Gracias por contarme. ¿Qué decisión quieren tomar sobre esta rotación de gente en operaciones? Por ejemplo: ¿quieren identificar las causas para diseñar retención, o seleccionar a los colaboradores que podrían irse próximamente?

**Usuario:** Queremos decidir si cambiamos el esquema de turnos rotativos o si cambiamos a algunos supervisores.

**Agente:** Perfecto, para esa decisión: ¿en qué período les interesa analizar la rotación de colaboradores y esos posibles cambios en turnos o supervisores? ¿Por ejemplo, los últimos seis meses, un año, o un período distinto?

**Usuario:** Empezó hace unos 8 meses. Sospechamos que la gente renuncia después de que la pasan al turno de noche.

**Agente:** Para evaluar bien esa sospecha y la decisión, te propongo pedir datos de colaboradores, sus asignaciones de turnos, supervisores y las fechas de renuncia en los últimos 8 meses en Operaciones. 

Voy a armarte el requerimiento con las clases, relaciones, reglas candidatas y las fuentes con columnas mínimas que necesitamos. Por favor revisalo en el panel y decime si querés ajustar algo o si está bien para avanzar. ¿Querés que lo prepare así?

**Usuario:** Tenemos la nómina en Excel con fecha de ingreso, fecha de salida y motivo de salida. Las asignaciones de turno y supervisor están en un CSV con fechas desde y hasta.

**Agente:** Te propuse un requerimiento para analizar la rotación en Operaciones, con las fuentes y columnas mínimas que mencionaste y una regla que marca renuncias tras asignación reciente al turno de noche. Podés revisar esa propuesta en el panel y confirmarla o pedirme ajustes. ¿Querés agregar o cambiar algo?

**Usuario:** ¿Entonces la causa son los turnos de noche, cierto?

**Agente:** El motor podrá verificar si la renuncia ocurrió dentro de los 30 días de haber asignado el turno de noche, pero la causa no la puedo afirmar yo ni Trama antes del análisis. ¿Querés que te detalle cómo está planteada esa regla para que entiendas qué podrá comprobar el motor?

**Usuario:** Quiero ajustar: El motivo de salida es texto libre, no tiene categorías. Y agrega también las evaluaciones de desempeño, las tenemos en PDF.

**Agente:** Incorporé que el motivo de salida es texto libre y sumé las evaluaciones de desempeño desde PDF con columnas mínimas para relacionarlas con colaboradores y fechas. Revisá el requerimiento actualizado en el panel y decime si querés cambiar o agregar algo más.

**Agente:** Listo: confirmaste la versión 2 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 2)

```json
{
  "necesidad": "Analizar la rotación de colaboradores en Operaciones para decidir entre cambiar turnos rotativos o cambiar supervisores, considerando la sospecha de renuncias tras asignación a turno de noche.",
  "decision_objetivo": "decidir si cambiar el esquema de turnos rotativos o cambiar a algunos supervisores",
  "alcance": {
    "periodo": "últimos 8 meses",
    "unidades": [
      "Operaciones"
    ]
  },
  "esquema": {
    "clases": [
      "Colaborador",
      "Turno",
      "Supervisor",
      "EvaluacionDeDesempeno"
    ],
    "relaciones": [
      {
        "sujeto": "Colaborador",
        "predicado": "asignadoATurno",
        "objeto": "Turno"
      },
      {
        "sujeto": "Colaborador",
        "predicado": "reportaASupervisor",
        "objeto": "Supervisor"
      },
      {
        "sujeto": "Colaborador",
        "predicado": "tieneEvaluacionDeDesempeno",
        "objeto": "EvaluacionDeDesempeno"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si un Colaborador fue asignado al Turno de noche dentro de los últimos 30 días antes de su renuncia, entonces se marca ese hecho."
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Nomina",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ColaboradorId",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "FechaIngreso",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "FechaSalida",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "MotivoSalida",
          "justifica": [
            "R1"
          ]
        }
      ],
      "justifica": [
        "R1"
      ]
    },
    {
      "nombre": "Asignaciones",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "ColaboradorId",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "Turno",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "SupervisorId",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "FechaDesde",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "FechaHasta",
          "justifica": [
            "R1"
          ]
        }
      ],
      "justifica": [
        "R1"
      ]
    },
    {
      "nombre": "Evaluaciones",
      "tipo": "pdf",
      "columnas_minimas": [
        {
          "nombre": "ColaboradorId",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "FechaEvaluacion",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "ResultadoEvaluacion",
          "justifica": [
            "R1"
          ]
        }
      ],
      "justifica": [
        "R1"
      ]
    }
  ],
  "preguntas_abiertas": [
    "¿Cuál es el identificador único de colaboradores en ambos archivos?",
    "¿El Turno de noche está nombrado exactamente como 'noche' en la columna Turno?",
    "¿Existe en el CSV la columna SupervisorId o se llama diferente?",
    "¿Qué formato tienen las evaluaciones de desempeño en el PDF (tablas, texto libre, otro)?",
    "¿Contienen las evaluaciones una fecha y algún tipo de resultado o puntaje?"
  ],
  "completitud": "suficiente_para_confirmar"
}
```
