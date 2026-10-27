# Transcripción — entrevista Trama

Fecha: 2026-10-27T02:25:11.426Z  
Estado: confirmado  
Versiones del requerimiento: 2

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Se nos está yendo mucha gente de operaciones y no sabemos por qué.

**Agente:** Gracias por contarme. ¿Querés tomar la decisión de identificar las causas de la rotación en operaciones o prefieren focalizar en algún punto como evaluar jefaturas, condiciones de turnos o salarios? También necesito saber el período en el que notaron esa rotación.

**Usuario:** Queremos decidir si cambiamos el esquema de turnos rotativos o si cambiamos a algunos supervisores.

**Agente:** Perfecto, entonces la decisión es entre cambiar turnos o cambiar supervisores para frenar la rotación en operaciones. ¿Desde cuándo vienen notando esa rotación alta? ¿Podés decirme un período aproximado para analizar?

**Usuario:** mpezó hace unos 8 meses. Sospechamos que la gente renuncia después de que la pasan al turno de noche.

**Agente:** Gracias, ya tengo el contexto: quieren decidir entre cambios en turnos rotativos o en supervisores para frenar la rotación en operaciones de los últimos 8 meses, sospechando que renuncian tras pasar al turno de noche.

Para avanzar, ¿ustedes registran en sus sistemas el cambio de turno de cada colaborador y también registran quién supervisa a cada colaborador en operaciones?

**Usuario:** Tenemos la nómina en Excel con fecha de ingreso, fecha de salida y motivo de salida. Las asignaciones de turno y supervisor están en un CSV con fechas desde y hasta.

**Agente:** Propuse un requerimiento para analizar la rotación por cambios a turno noche y supervisores en operaciones de los últimos 8 meses, con datos de nómina y asignaciones de turno y supervisor. Revisalo en el panel y confirmá o pedí ajustes. ¿Querés definir cuántos días considerar para la renuncia tras cambio a turno noche?

**Usuario:** ¿Entonces la causa son los turnos de noche, cierto?

**Agente:** No afirmo causas; solo propongo que el motor verifique si los colaboradores que cambiaron a turno noche renunciaron dentro de cierto plazo. Vos podés definir ese plazo que el motor usará para buscar esa relación. ¿Querés definir cuánto debería ser ese plazo en días?

**Usuario:** Quiero ajustar: Quiero ajustar: el motivo de salida es texto libre, no tiene categorías. Y agrega también las evaluaciones de desempeño, las tenemos en PDF

**Agente:** Veo que las evaluaciones de desempeño en PDF no tienen columnas mínimas que justifiquen entidades o reglas para este análisis. ¿Querés que prepare el requerimiento sin incluir esas evaluaciones o querés contarme si hay datos en ellas que las vinculen a colaboradores o sus supervisores, para incluirlas mejor?

**Usuario:** si

**Agente:** Veo que las evaluaciones en PDF no tienen campos identificables para este análisis, por lo que no puedo incluirlas como fuente con columnas mínimas. Podemos seguir sin incluirlas por ahora o me decís si tienen datos concretos para vincular a colaboradores o supervisores. ¿Querés que siga sin ellas?

**Usuario:** si

**Agente:** Actualicé el requerimiento para incluir que el motivo de salida es texto libre y mantuve las fuentes actuales descartando las evaluaciones en PDF. Además sigue la pregunta abierta sobre cuántos días considerar renuncia tras cambio a turno noche. Revisalo en el panel y confirmá o pedí ajustes.

**Agente:** Listo: confirmaste la versión 2 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 2)

```json
{
  "necesidad": "Analizar la rotación en operaciones para decidir entre cambiar turnos rotativos o cambiar supervisores, con sospecha de renuncias tras pasar a turno noche.",
  "decision_objetivo": "Decidir si cambiar turnos rotativos o cambiar supervisores para frenar rotación en operaciones.",
  "alcance": {
    "periodo": "últimos 8 meses",
    "unidades": [
      "operaciones"
    ]
  },
  "esquema": {
    "clases": [
      "Colaborador",
      "Turno",
      "Supervisor"
    ],
    "relaciones": [
      {
        "sujeto": "Colaborador",
        "predicado": "asignadoATurno",
        "objeto": "Turno"
      },
      {
        "sujeto": "Colaborador",
        "predicado": "supervisadoPor",
        "objeto": "Supervisor"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si un colaborador cambió de turno al turno noche y renunció dentro de N días, se marca ese hecho."
    },
    {
      "id": "R2",
      "enunciado": "Si un colaborador está asignado a un supervisor con alta rotación en sus colaboradores, se marca ese hecho."
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Nómina de Colaboradores",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "id_colaborador",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "fecha_ingreso",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "fecha_salida",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "motivo_salida",
          "justifica": [
            "R1",
            "R2"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2"
      ]
    },
    {
      "nombre": "Asignaciones de Turno y Supervisor",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "id_colaborador",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "turno",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "fecha_desde",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "fecha_hasta",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "supervisor",
          "justifica": [
            "R2"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2"
      ]
    }
  ],
  "preguntas_abiertas": [
    "¿Cuál sería el valor de N (días para considerar renuncia tras cambio a turno noche)?"
  ],
  "completitud": "suficiente_para_confirmar"
}
```
