# Transcripción — entrevista Trama

Fecha: 2026-10-28T02:20:35.594Z  
Estado: confirmado  
Versiones del requerimiento: 4

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Se nos está yendo mucha gente de operaciones y no sabemos por qué.

**Agente:** Gracias por compartirlo. ¿Qué decisión quieren tomar para abordar la salida de gente? Por ejemplo, ¿quieren decidir sobre ajustes salariales, cambios en turnos, jefaturas, o algo distinto? Además, ¿en qué período les interesa analizar este fenómeno?

**Usuario:** Queremos decidir si cambiamos el esquema de turnos rotativos o si cambiamos a algunos supervisores.

**Agente:** Perfecto, entonces la decisión estará entre ajustar turnos o cambiar supervisores. Para orientar el análisis, ¿en qué período quieren evaluar las salidas o cambios en el equipo de operaciones? ¿Los últimos meses, un año, o un período distinto?

**Usuario:** Empezó hace unos 8 meses en el área de operaciones. Sospechamos que la gente renuncia en los 60 días siguientes a que la pasan al turno de noche, y también que a algunos supervisores se les va más gente que a otros. Para nosotros es mucho si a un supervisor se le van más de 3 personas en el período.

**Agente:** Te propuse un requerimiento para analizar la salida de colaboradores en operaciones, con las reglas que plantean que renuncian tras ir al turno de noche y que algunos supervisores pierden más gente. Incluye datos de colaboradores, turnos, supervisores y salidas, con preguntas abiertas para aclarar detalles sobre los turnos y supervisores. Por favor, revisá todo eso en el panel y confirmá o pedime ajustes.

**Usuario:** Tenemos la nómina en Excel con id del colaborador, fecha de ingreso, fecha de salida y motivo de salida. Las asignaciones están en un CSV con id del colaborador, turno, id del supervisor, fecha desde y fecha hasta.

**Agente:** Incorporé la información de que la nómina está en Excel con las columnas de ID, fecha de ingreso, salida y motivo, y que la asignación de turnos y supervisores está en CSV con esas columnas y períodos. Ahora, ¿los turnos en ese CSV permiten identificar claramente cuál es el turno de noche? ¿Y cómo está registrado el supervisor que tenía cada colaborador en cada período?

**Usuario:** ¿Entonces la causa son los turnos de noche, cierto?

**Agente:** El motor podrá verificar si la salida está relacionada con el paso al turno de noche según la regla que propuse, pero la causa la decidirán ustedes al interpretar esos resultados. Yo solo te ayudo a preparar los datos y las hipótesis para que el motor las analice. ¿Querés que siga registrando esta hipótesis y los datos asociados?

**Usuario:** Quiero ajustar: el motivo de salida es texto libre, no tiene categorías. Y agrega también las evaluaciones de desempeño, las tenemos en PDF con id del colaborador, fecha, id del supervisor y un puntaje de 1 a 5.

**Agente:** Actualicé el requerimiento para reflejar que el motivo de salida es texto libre y agregué las evaluaciones de desempeño en PDF con las columnas que mencionaste. Revisalo en el panel y avisame si querés ajustar algo más o confirmar.

**Usuario:** En la columna turno dice “Día”, “Tarde” o “Noche”, y cada fila del CSV tiene el supervisor que tenía el colaborador en ese período. Para nosotros un puntaje bajo es menor a 3.

**Agente:** Incorporé que en la columna turno el valor “Noche” identifica ese turno, y que el supervisor está asignado por período para cada colaborador. También quedó registrado que el puntaje bajo en desempeño es menor a 3. Revisalo en el panel y confirmá o pedime ajustes.

**Agente:** Listo: confirmaste la versión 4 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 4)

```json
{
  "necesidad": "Analizar la salida de colaboradores en el área de operaciones para decidir entre ajustar turnos rotativos o cambiar algunos supervisores",
  "decision_objetivo": "Decidir entre ajustar el esquema de turnos rotativos o cambiar algunos supervisores para reducir la salida de gente en el área de operaciones",
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
      "Salida",
      "EvaluacionDesempeno"
    ],
    "relaciones": [
      {
        "sujeto": "Colaborador",
        "predicado": "asignadoA",
        "objeto": "Turno"
      },
      {
        "sujeto": "Colaborador",
        "predicado": "reportaA",
        "objeto": "Supervisor"
      },
      {
        "sujeto": "EvaluacionDesempeno",
        "predicado": "de",
        "objeto": "Colaborador"
      },
      {
        "sujeto": "EvaluacionDesempeno",
        "predicado": "realizadaPor",
        "objeto": "Supervisor"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si un Colaborador pasó al Turno de noche y en los 60 días siguientes tiene una Salida, se marca ese hecho"
    },
    {
      "id": "R2",
      "enunciado": "Si un Supervisor tiene más de N Salidas de Colaboradores que reportan a él en el período, se marca ese hecho con N=3"
    },
    {
      "id": "R3",
      "enunciado": "Si una EvaluacionDesempeno tiene un puntaje menor a P en el período de 60 días anteriores a la Salida del Colaborador, se marca ese hecho con P=3"
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Nómina de colaboradores",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ID_Colaborador",
          "justifica": [
            "R1",
            "R2",
            "R3"
          ]
        },
        {
          "nombre": "Fecha_Ingreso",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "Fecha_Salida",
          "justifica": [
            "R1",
            "R2",
            "R3"
          ]
        },
        {
          "nombre": "Motivo_Salida",
          "justifica": [
            "R1",
            "R2",
            "R3"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2",
        "R3"
      ]
    },
    {
      "nombre": "Asignación de turnos y supervisores",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "ID_Colaborador",
          "justifica": [
            "R1",
            "R2",
            "R3"
          ]
        },
        {
          "nombre": "Turno",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "ID_Supervisor",
          "justifica": [
            "R2",
            "R3"
          ]
        },
        {
          "nombre": "Fecha_Desde",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "Fecha_Hasta",
          "justifica": [
            "R1"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2",
        "R3"
      ]
    },
    {
      "nombre": "Evaluaciones de desempeño",
      "tipo": "pdf",
      "columnas_minimas": [
        {
          "nombre": "ID_Colaborador",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "Fecha",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "ID_Supervisor",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "Puntaje",
          "justifica": [
            "R3"
          ]
        }
      ],
      "justifica": [
        "R3"
      ]
    }
  ],
  "preguntas_abiertas": [],
  "completitud": "suficiente_para_confirmar"
}
```
