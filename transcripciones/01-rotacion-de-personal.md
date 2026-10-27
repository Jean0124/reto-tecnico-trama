# Transcripción — entrevista Trama

Fecha: 2026-10-27T04:50:36.266Z  
Estado: confirmado  
Versiones del requerimiento: 3

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Se nos está yendo mucha gente de operaciones y no sabemos por qué.

**Agente:** ¿Querés decidir sobre algo puntual para retener esa gente o solo quieren entender las causas de la salida? También me ayuda saber si "gente de operaciones" es una unidad, área o tipo de trabajo específico para incluirlo.

**Usuario:** Queremos decidir si cambiamos el esquema de turnos rotativos o si cambiamos a algunos supervisores.

**Agente:** Perfecto. Para enfocarnos: ¿querés que analicemos solo a las personas que se fueron en un período reciente? Si es así, ¿cuál período te interesa? Además, ¿esa “gente de operaciones” corresponde a una unidad o área específica?

**Usuario:** Empezó hace unos 8 meses en el área de operaciones. Sospechamos que la gente renuncia en los 60 días siguientes a que la pasan al turno de noche, y también que hay supervisores a los que se les va más gente que a otros.

**Agente:** Te propuse pedir datos sobre colaboradores, turnos, supervisores y áreas de Operaciones de los últimos 8 meses, con reglas para detectar si la rotación a turno de noche o ciertos supervisores están relacionados con renuncias. Revisalo en el panel y me decís si querés hacer algún ajuste o confirmás para seguir.

**Usuario:** Tenemos la nómina en Excel con id del colaborador, fecha de ingreso, fecha de salida (día, mes y año) y motivo de salida. Las asignaciones están en un CSV con id del colaborador, turno, id del supervisor, fecha desde y fecha hasta.

**Agente:** Gracias por la info. Para el motivo de salida, ¿querés que lo usemos para distinguir renuncias de otras causas y así afinar el análisis? También, ¿el turno en el CSV identifica claramente cuál es el turno de noche?

**Usuario:** ¿Entonces la causa son los turnos de noche, cierto?

**Agente:** El motor podrá verificar si renuncias ocurren tras pasar al turno de noche, según tu sospecha, pero necesita saber qué asignaciones corresponden al turno de noche y cuándo suceden los cambios. ¿Podés confirmar si tu registro de turnos permite identificar eso claramente?

**Usuario:** Pregunta	Respuesta
Cuántas salidas son “muchas” para un supervisor

**Agente:** Esa es una buena pregunta abierta para definir. ¿Tienen algún criterio o número aproximado que consideren un umbral para marcar a un supervisor con muchas renuncias? Si no, lo dejamos abierto para definir más adelante.

**Usuario:** Consideremos que es mucho si a un supervisor se le fueron más de 3 personas en el período.

**Agente:** Definimos entonces que un supervisor tiene muchas renuncias si pierde más de 3 colaboradores en este período. Te propuse un esquema con eso y otros detalles para cargar datos sobre colaboradores, turnos, supervisores y áreas. Revisa el requerimiento en el panel y me decís si querés ajustar o confirmar para avanzar.

**Usuario:** Quiero ajustar: el motivo de salida es texto libre, no tiene categorías. Y agrega también las evaluaciones de desempeño, las tenemos en PDF con id del colaborador, fecha, id del supervisor y un puntaje de 1 a 5.

**Agente:** Agregué la clase y fuente de Evaluaciones de desempeño en PDF, manteniendo las otras fuentes y variables, y aclaré que el motivo de salida es texto libre. Revisá este ajuste en el panel y decime si querés más cambios o lo confirmás para avanzar.

**Agente:** Listo: confirmaste la versión 3 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 3)

```json
{
  "necesidad": "Determinar si la rotación de turnos o la asignación de supervisores están relacionadas con renuncias en el área de operaciones, considerando que motivo de salida es texto libre y añadiendo información de evaluaciones de desempeño.",
  "decision_objetivo": "decidir si cambiamos el esquema de turnos rotativos o si cambiamos a algunos supervisores",
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
      "Área",
      "EvaluaciónDeDesempeño"
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
        "sujeto": "Colaborador",
        "predicado": "perteneceA",
        "objeto": "Área"
      },
      {
        "sujeto": "EvaluaciónDeDesempeño",
        "predicado": "correspondeA",
        "objeto": "Colaborador"
      },
      {
        "sujeto": "EvaluaciónDeDesempeño",
        "predicado": "realizadaPor",
        "objeto": "Supervisor"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si un Colaborador cambia al turno de noche, y renuncia dentro de los 60 días siguientes, se marca el hecho."
    },
    {
      "id": "R2",
      "enunciado": "Si un Supervisor tiene un número de renuncias en su equipo mayor que 3 en el período, se marca ese Supervisor."
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Catálogo de colaboradores",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "colaborador_id",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "fecha_ingreso",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "fecha_baja",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "motivo_baja",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "supervisor_id",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "area_id",
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
      "nombre": "Asignación de turnos",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "colaborador_id",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "turno_id",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "supervisor_id",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "fecha_desde",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "fecha_hasta",
          "justifica": [
            "R1"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2"
      ]
    },
    {
      "nombre": "Turnos",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "turno_id",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "nombre_turno",
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
      "nombre": "Supervisores",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "supervisor_id",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "nombre_supervisor",
          "justifica": [
            "R2"
          ]
        }
      ],
      "justifica": [
        "R2"
      ]
    },
    {
      "nombre": "Áreas",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "area_id",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "nombre_area",
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
      "nombre": "Evaluaciones de desempeño",
      "tipo": "pdf",
      "columnas_minimas": [
        {
          "nombre": "colaborador_id",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "fecha",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "supervisor_id",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "puntaje",
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
    "¿Existen registros que indiquen cambios de turno con fecha?",
    "¿Hay un catálogo que identifique qué turno es 'noche'?",
    "¿Las bajas están registradas con fecha",
    "¿Cómo interpretamos el texto libre en motivo de baja para saber si es renuncia?"
  ],
  "completitud": "suficiente_para_confirmar"
}
```
