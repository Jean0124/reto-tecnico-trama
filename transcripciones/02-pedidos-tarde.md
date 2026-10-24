# Transcripción — entrevista Trama

Fecha: 2026-10-24T22:07:33.032Z  
Estado: confirmado  
Versiones del requerimiento: 2

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** eres jefe de logística de una distribuidora de alimentos con 3 zonas de reparto. La zona norte se abrió hace 4 meses.

**Agente:** Entiendo que estás en logística y mencionás tres zonas de reparto, con la zona norte hace poco. Para que te ayude mejor, ¿qué decisión querés tomar o qué problema específico querés investigar respecto a esas zonas?

**Usuario:** Los pedidos están llegando tarde a los clientes y nos están llegando muchos reclamos.

**Agente:** Gracias. Para este problema, ¿querés enfocar el análisis en las zonas de reparto, los pedidos, los repartidores u otro elemento del proceso? ¿Y en qué período te interesa evaluar la puntualidad y los reclamos?

**Usuario:** Queremos decidir si contratamos más repartidores o si cambiamos cómo armamos las rutas.

**Agente:** Perfecto; entonces el foco es en repartidores, rutas y pedidos. Para ajustar el período, ¿querés analizar los datos de los últimos meses completos o desde la apertura de la zona norte hace 4 meses?

**Usuario:** si

**Agente:** Para confirmar: ¿querés analizar desde hace 4 meses a la fecha, incluyendo toda la información de pedidos, repartidores y rutas en ese tiempo?

**Usuario:** esto e slo que tenemos en el sistema En el sistema de pedidos tenemos la hora prometida y la hora real de entrega. Las rutas tienen asignado un repartidor y el número de paradas, pero no la distancia.

**Agente:** Gracias por el detalle. Para armar el modelo y analizar la puntualidad, voy a necesitar los datos de pedidos con hora prometida y hora real, además de las rutas con asignación a repartidor y número de paradas. ¿Cuentan con registros de los repartidores, como identificadores y asignación a zonas o rutas?

**Usuario:** si

**Agente:** Propuse un modelo para analizar la puntualidad de entregas en las tres zonas, considerando pedidos, rutas y repartidores durante los últimos 4 meses desde la apertura de la zona norte. Incluye reglas para marcar pedidos retrasados y evaluar si la cantidad de paradas o la asignación de repartidores afecta la puntualidad. También pregunté por umbrales para definir retrasos y límite de paradas. Por favor, revisalo en el panel y confirmame o pedime ajustes.

**Usuario:** ¿Qué porcentaje de pedidos crees que llega tarde por la zona norte?

**Agente:** No puedo calcular porcentajes ni analizar datos; eso lo hará el motor una vez cargados los datos completos que acordamos. ¿Querés confirmar el requerimiento actual para que avancemos con la carga y el análisis?

**Usuario:** Quiero ajustar: Los reclamos no los tenemos en Excel, salen del CRM.

**Agente:** Actualicé el requerimiento para que los reclamos se tomen desde el CRM, no Excel, conservando lo demás igual. Por favor, revisalo en el panel y confirmá o pedime que haga ajustes.

**Agente:** Listo: confirmaste la versión 2 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 2)

```json
{
  "necesidad": "Analizar retrasos en entregas y evaluar si contratar más repartidores o cambiar armado de rutas, incluyendo reclamos desde CRM.",
  "decision_objetivo": "Decidir entre ampliar staff de repartidores o modificar rutas para mejorar puntualidad y reducir reclamos.",
  "alcance": {
    "periodo": "últimos 4 meses",
    "unidades": [
      "zona norte",
      "zona este",
      "zona sur"
    ]
  },
  "esquema": {
    "clases": [
      "Pedido",
      "Ruta",
      "Repartidor",
      "Zona",
      "Reclamo"
    ],
    "relaciones": [
      {
        "sujeto": "Pedido",
        "predicado": "asignadoA",
        "objeto": "Ruta"
      },
      {
        "sujeto": "Ruta",
        "predicado": "asignadoA",
        "objeto": "Repartidor"
      },
      {
        "sujeto": "Ruta",
        "predicado": "perteneceA",
        "objeto": "Zona"
      },
      {
        "sujeto": "Reclamo",
        "predicado": "relacionadoCon",
        "objeto": "Pedido"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si la diferencia entre la hora prometida y la hora real de entrega es mayor que un umbral parametrizable, el pedido está retrasado."
    },
    {
      "id": "R2",
      "enunciado": "Si una ruta tiene más de un número parametrizable de paradas, podría estar afectando la puntualidad."
    },
    {
      "id": "R3",
      "enunciado": "Si un repartidor atiende rutas con retrasos frecuentes, podría ser causa de demoras."
    },
    {
      "id": "R4",
      "enunciado": "Si un pedido tiene un reclamo registrado asociado, indica insatisfacción del cliente."
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
            "Pedido"
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
          "nombre": "ID Ruta",
          "justifica": [
            "Pedido asignadoA Ruta"
          ]
        }
      ],
      "justifica": [
        "Pedido",
        "R1",
        "Pedido asignadoA Ruta"
      ]
    },
    {
      "nombre": "Sistema de Rutas",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ID Ruta",
          "justifica": [
            "Ruta"
          ]
        },
        {
          "nombre": "ID Repartidor",
          "justifica": [
            "Ruta asignadoA Repartidor"
          ]
        },
        {
          "nombre": "Número de Paradas",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "ID Zona",
          "justifica": [
            "Ruta perteneceA Zona"
          ]
        }
      ],
      "justifica": [
        "Ruta",
        "R2",
        "Ruta asignadoA Repartidor",
        "Ruta perteneceA Zona"
      ]
    },
    {
      "nombre": "Sistema de Repartidores",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "ID Repartidor",
          "justifica": [
            "Repartidor"
          ]
        }
      ],
      "justifica": [
        "Repartidor"
      ]
    },
    {
      "nombre": "CRM de Reclamos",
      "tipo": "crm-export",
      "columnas_minimas": [
        {
          "nombre": "ID Reclamo",
          "justifica": [
            "Reclamo"
          ]
        },
        {
          "nombre": "ID Pedido",
          "justifica": [
            "Reclamo relacionadoCon Pedido"
          ]
        },
        {
          "nombre": "Fecha Reclamo",
          "justifica": [
            "R4"
          ]
        }
      ],
      "justifica": [
        "Reclamo",
        "R4"
      ]
    }
  ],
  "preguntas_abiertas": [
    "¿Cuál es el valor umbral para considerar un pedido retrasado? (por ejemplo, más de N minutos)",
    "¿Cuál es el número máximo de paradas razonable por ruta sin afectar la puntualidad?"
  ],
  "completitud": "suficiente_para_confirmar"
}
```
