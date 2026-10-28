# Transcripción — entrevista Trama

Fecha: 2026-10-28T02:40:51.528Z  
Estado: confirmado  
Versiones del requerimiento: 3

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** Los pedidos están llegando tarde a los clientes y nos están llegando muchos reclamos.

**Agente:** Gracias por contarme. ¿Qué decisión pretenden tomar para resolver que los pedidos llegan tarde y generan reclamos? ¿Por ejemplo, quieren ajustar procesos, reasignar recursos o mejorar las rutas? Además, ¿a qué período se refiere el problema: últimos meses, semanas o días?

**Usuario:** Queremos decidir si contratamos más repartidores o si cambiamos cómo armamos las rutas.

**Agente:** Perfecto, entonces la decisión es comparar contratar más repartidores versus cambiar la planificación de rutas. ¿Tienen registradas las rutas actuales y los repartidores asignados a cada pedido, así como fechas de entrega y registros de reclamos? ¿En qué período quieren analizarlo?

**Usuario:** Empezó hace unos 4 meses, desde que abrimos la zona norte. Sospechamos que las rutas de esa zona son demasiado largas o que los repartidores están sobrecargados. Para nosotros una ruta es larga si tiene más de 15 paradas, y un repartidor está sobrecargado si hace más de 2 rutas en un mismo día.

**Agente:** Propuse un requerimiento que incluye clases para pedido, repartidor, ruta, reclamo y zona, con reglas para identificar rutas largas, repartidores sobrecargados, retrasos y reclamos relacionados, todo enfocado en la zona norte y últimos 4 meses. Además, pedí los registros de pedidos, rutas y reclamos con las columnas necesarias para verificar esas reglas. Revisalo y si está bien, confirmalo o decime si querés ajustes.

**Usuario:** Los pedidos los exportamos del sistema en CSV con id del pedido, cliente, hora prometida, hora real de entrega e id de la ruta. Las rutas están en Excel con id de la ruta, fecha, id del repartidor, zona (Norte, Sur o Centro) y número de paradas reales, pero no la distancia. Los reclamos los tenemos en Excel con id del pedido, fecha y motivo. El id del pedido es el mismo en todos los archivos y las horas están en hora de Colombia.

**Agente:** Actualicé el requerimiento para que incluya las fuentes y columnas mínimas según tus exportaciones: pedidos en CSV con id, horas y ruta; rutas en Excel con id, fecha, repartidor, zona y número de paradas; reclamos en Excel con id pedido, fecha y motivo. Está listo para que lo revises y confirmes o pidas ajustes.

**Usuario:** ¿Qué porcentaje de pedidos crees que llega tarde por la zona norte?

**Agente:** Esa pregunta la podrá responder el motor una vez tengas los datos cargados y confirmes el requerimiento. Por ahora, seguimos ajustando qué datos y reglas necesita para el análisis; ¿querés que te aclare algo del requerimiento?

**Usuario:** Quiero ajustar: los reclamos no los tenemos en Excel, salen de una exportación del CRM.

**Agente:** Actualicé el requerimiento para que el origen de los reclamos sea una exportación del CRM, con las columnas id del pedido, fecha y motivo. Revisalo en el panel y confirmá o pedime ajustes.

**Agente:** Listo: confirmaste la versión 3 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 3)

```json
{
  "necesidad": "Evitar retrasos en pedidos y muchos reclamos en zona norte, decidiendo si contratar más repartidores o cambiar cómo armar rutas",
  "decision_objetivo": "Decidir entre contratar más repartidores o cambiar cómo armar las rutas para evitar retrasos en los pedidos",
  "alcance": {
    "periodo": "últimos 4 meses",
    "unidades": [
      "zona norte"
    ]
  },
  "esquema": {
    "clases": [
      "Pedido",
      "Repartidor",
      "Ruta",
      "Reclamo",
      "Zona"
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
        "sujeto": "Pedido",
        "predicado": "reportaA",
        "objeto": "Reclamo"
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
      "enunciado": "Si una Ruta tiene más de 15 paradas en un día, se marca como ruta larga"
    },
    {
      "id": "R2",
      "enunciado": "Si un Repartidor hace más de 2 Rutas en un mismo día, se marca como Repartidor sobrecargado"
    },
    {
      "id": "R3",
      "enunciado": "Si un Pedido asignado a una Ruta se entrega con retraso, se marca el hecho"
    },
    {
      "id": "R4",
      "enunciado": "Si un Pedido con retraso registra un Reclamo, se marca el hecho"
    },
    {
      "id": "R5",
      "enunciado": "Si una Ruta pertenece a la Zona Norte, se considera para el análisis"
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "Pedidos",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "idPedido",
          "justifica": [
            "R3",
            "R4"
          ]
        },
        {
          "nombre": "horaPrometida",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "horaRealEntrega",
          "justifica": [
            "R3"
          ]
        },
        {
          "nombre": "idRuta",
          "justifica": [
            "R1",
            "R3"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R3",
        "R4"
      ]
    },
    {
      "nombre": "Rutas",
      "tipo": "excel",
      "columnas_minimas": [
        {
          "nombre": "idRuta",
          "justifica": [
            "R1",
            "R2",
            "R5"
          ]
        },
        {
          "nombre": "fechaRuta",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "numeroParadas",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "idRepartidor",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "zona",
          "justifica": [
            "R5"
          ]
        }
      ],
      "justifica": [
        "R1",
        "R2",
        "R5"
      ]
    },
    {
      "nombre": "Reclamos",
      "tipo": "crm-export",
      "columnas_minimas": [
        {
          "nombre": "idPedido",
          "justifica": [
            "R4"
          ]
        },
        {
          "nombre": "fechaReclamo",
          "justifica": [
            "R4"
          ]
        },
        {
          "nombre": "motivo",
          "justifica": [
            "R4"
          ]
        }
      ],
      "justifica": [
        "R4"
      ]
    }
  ],
  "preguntas_abiertas": [],
  "completitud": "suficiente_para_confirmar"
}
```
