# Transcripción — entrevista Trama

Fecha: 2026-10-27T02:29:53.457Z  
Estado: confirmado  
Versiones del requerimiento: 3

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Los pedidos están llegando tarde a los clientes y nos están llegando muchos reclamos

**Agente:** Gracias. Para entender mejor: ¿qué decisión quieren tomar para resolver los pedidos que llegan tarde y los reclamos? Por ejemplo, ¿quieren ajustar la logística, revisar la gestión de pedidos o analizar los reclamos? También me ayudaría saber desde cuándo ocurre este problema o en qué período quieren analizarlo.

**Usuario:** Queremos decidir si contratamos más repartidores o si cambiamos cómo armamos las rutas.

**Agente:** Perfecto, ya tenemos la decisión: contratar más repartidores o cambiar el armado de rutas. Ahora, para acotar el análisis, ¿en qué período quieren revisar la llegada tardía de los pedidos y los reclamos? ¿Por ejemplo, las últimas semanas, meses o un período específico?

**Usuario:** Empezó hace unos 4 meses, desde que abrimos la zona norte. Sospechamos que las rutas de esa zona son demasiado largas.

**Agente:** Gracias por el detalle. Para el análisis propongo incluir las clases Pedido, Reclamo, Repartidor, Ruta y Zona, con datos de los últimos 4 meses y focalizados en la zona norte. Para evaluar si las rutas son demasiado largas, ¿tienen registros de la duración o distancia de cada ruta, o cómo miden la longitud o el tiempo de las rutas?

**Usuario:** En el sistema de pedidos tenemos la hora prometida y la hora real de entrega. Las rutas tienen asignado un repartidor, la zona y el número de paradas, pero no la distancia.

**Agente:** Propuse un modelo basado en tus datos de pedidos con horas prometidas y reales, reclamos, repartidores, rutas y zonas, para analizar si las rutas con muchas paradas en zona norte generan demoras y reclamos, y así apoyar la decisión sobre repartidores o armado de rutas. También dejé abierta la pregunta de cuántas paradas considerarías muchas. Podés revisar el modelo en el panel y confirmarlo o pedir ajustes.

**Usuario:** “¿Qué porcentaje de pedidos crees que llega tarde por la zona norte?”

**Agente:** Esa pregunta la podrá responder el motor una vez que confirmes los datos para analizar. ¿Querés avanzar con la revisión del requerimiento que te proponí para que el motor haga esas verificaciones?

**Usuario:** Quiero ajustar: Quiero ajustar: los reclamos no los tenemos en Excel, salen de una exportación del CRM

**Agente:** Listo, ajusté el requerimiento para que la fuente de reclamos sea una exportación del CRM, no un Excel. Por favor revisá el cambio en el panel y confirmalo o pedime más ajustes.

**Usuario:** Consideremos larga una ruta con más de 15 paradas.

**Agente:** Consideré tu parámetro de más de 15 paradas para definir una ruta larga y ajusté el requerimiento con la fuente de reclamos desde el CRM. Podés revisar todo el modelo en el panel y confirmarlo o pedirme ajustes.

**Agente:** Listo: confirmaste la versión 3 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 3)

```json
{
  "necesidad": "Contrastar si la causa del retraso en los pedidos y el incremento de reclamos es que las rutas en la zona norte son demasiado largas, para decidir sobre contratar más repartidores o cambiar el armado de rutas.",
  "decision_objetivo": "Decidir entre contratar más repartidores o cambiar el armado de rutas",
  "alcance": {
    "periodo": "últimos 4 meses",
    "unidades": [
      "zona norte"
    ]
  },
  "esquema": {
    "clases": [
      "Pedido",
      "Reclamo",
      "Repartidor",
      "Ruta",
      "Zona"
    ],
    "relaciones": [
      {
        "sujeto": "Pedido",
        "predicado": "reportaA",
        "objeto": "Reclamo"
      },
      {
        "sujeto": "Pedido",
        "predicado": "asignadoA",
        "objeto": "Repartidor"
      },
      {
        "sujeto": "Ruta",
        "predicado": "asignadaA",
        "objeto": "Repartidor"
      },
      {
        "sujeto": "Ruta",
        "predicado": "perteneceA",
        "objeto": "Zona"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si un Pedido en la zona norte se entregó después de la hora prometida, se marca entrega tardía."
    },
    {
      "id": "R2",
      "enunciado": "Si un Pedido con entrega tardía tiene un Reclamo asociado, se marca reclamo por entrega tardía."
    },
    {
      "id": "R3",
      "enunciado": "Si una Ruta en la zona norte tiene un número de paradas mayor a 15, se marca como ruta posiblemente demasiado larga."
    },
    {
      "id": "R4",
      "enunciado": "Si un Repartidor tiene asignadas varias Rutas con rutas posiblemente demasiado largas, se marca saturación potencial del repartidor."
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Sistema de Pedidos",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ID Pedido",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "Fecha de Entrega",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "Hora Prometida",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "Hora Real de Entrega",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "ID Reclamo",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "ID Repartidor",
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
      "nombre": "Rutas",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ID Ruta",
          "justifica": [
            "R3",
            "R4"
          ]
        },
        {
          "nombre": "ID Repartidor",
          "justifica": [
            "R4"
          ]
        },
        {
          "nombre": "Zona",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "Número de Paradas",
          "justifica": [
            "R3"
          ]
        }
      ],
      "justifica": [
        "R3",
        "R4"
      ]
    },
    {
      "nombre": "Reclamos CRM Export",
      "tipo": "crm-export",
      "columnas_minimas": [
        {
          "nombre": "ID Reclamo",
          "justifica": [
            "R2"
          ]
        }
      ],
      "justifica": [
        "R2"
      ]
    }
  ],
  "preguntas_abiertas": [],
  "completitud": "suficiente_para_confirmar"
}
```
