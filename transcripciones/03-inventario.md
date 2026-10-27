# Transcripción — entrevista Trama

Fecha: 2026-10-27T05:01:46.149Z  
Estado: confirmado  
Versiones del requerimiento: 2

## Conversación

**Agente:** Hola, soy el agente de entrada de Trama. Te hago unas pocas preguntas sobre un problema de tu negocio y te propongo qué datos habría que cargar para analizarlo: qué archivos, qué columnas y para qué sirve cada una. No analizo datos ni doy resultados; eso lo hace el motor de Trama después, con tus datos reales.

Contame con tus palabras qué está pasando. Por ejemplo: "se nos está yendo gente de operaciones" o "el inventario no cuadra".

**Usuario:** El inventario del sistema no cuadra con lo que contamos físicamente en las bodegas.

**Agente:** Gracias. ¿Querés usar este análisis para decidir cómo corregir las diferencias, para entender por qué pasan o para ambos? ¿Y en qué período te interesa analizar esas diferencias?

**Usuario:** Queremos decidir si cambiamos la forma de registrar las salidas de mercancía o si hacemos conteos físicos más seguido.

**Agente:** Perfecto. ¿Querés analizar todas las bodegas o solo alguna zona, bodega o producto en particular? ¿Y sobre qué período de registros querés basar la comparación?

**Usuario:** Pasa en nuestras 3 bodegas desde hace unos 6 meses. Sospechamos de las devoluciones de clientes, que a veces no se registran en el ERP. Para nosotros una diferencia es relevante si supera 5 unidades de un producto en una bodega.

**Agente:** Propongo analizar los registros de inventarios, conteos físicos y devoluciones en las 3 bodegas durante los últimos 6 meses para marcar diferencias relevantes superiores a 5 unidades. La regla sobre devoluciones la ajustaré para que sea verificable según datos observables, sin suposiciones.

Confirmá o pedime ajustes, y revisá el detalle en el panel.

**Usuario:** Los movimientos de inventario (entradas, salidas y devoluciones) salen del ERP en un solo CSV con bodega, producto, fecha, tipo de movimiento y cantidad. Los conteos físicos los hacemos una vez al mes en Excel con bodega, producto, fecha y cantidad contada. Las devoluciones también quedan en las notas crédito de facturación, que exportamos en CSV con número de nota, bodega, producto, fecha y cantidad devuelta.

**Agente:** Reformulo la regla R2 para que sea clara y verificable: "Si una NotaCredito refiere a una Devolución que no está registrada en el Inventario en el mismo período y bodega, se marca la diferencia." ¿Querés que la registre así o preferís ajustarla?

**Usuario:** dejala asi

**Agente:** Reformulo R2 para cumplir con la verificación: "Si una NotaCredito existe para una bodega y producto en un período sin un movimiento de Devolución correspondiente en Inventario, se marca una diferencia." ¿Está bien así?

**Usuario:** si esta bien

**Agente:** Listo, propuse un análisis con datos de movimientos de inventario, conteos físicos y notas crédito de las 3 bodegas en 6 meses, con dos reglas para marcar diferencias relevantes. Revisalo en el panel y confirmá o pedime ajustes.

**Usuario:** ¿Cuánta plata crees que estamos perdiendo por esto?

**Agente:** Eso lo calcula el motor después de que confirmes el requerimiento y cargues tus datos. Yo solo defino qué datos y reglas se necesitan para encontrar las diferencias relevantes, no puedo estimar pérdidas económicas. ¿Querés que siga ayudándote con el análisis técnico?

**Usuario:** Quiero ajustar: los conteos físicos en realidad los tenemos en PDF, no en Excel.

**Agente:** Ajusté la fuente de los conteos físicos a PDF en lugar de Excel, manteniendo las otras condiciones. Revisá el cambio en el panel y confirmá o pedime ajustes, por favor.

**Agente:** Listo: confirmaste la versión 2 del requerimiento. Con esto el siguiente paso es cargar esas fuentes en Trama para que el motor las cruce. La entrevista queda cerrada.

## Requerimiento resultante (versión 2)

```json
{
  "necesidad": "Diferencias entre inventario registrado y conteos físicos en 3 bodegas, por sospecha de devoluciones no registradas en ERP",
  "decision_objetivo": "decidir entre cambiar la forma de registrar las salidas de mercancía o hacer conteos físicos más seguido",
  "alcance": {
    "periodo": "6 meses",
    "unidades": [
      "3 bodegas"
    ]
  },
  "esquema": {
    "clases": [
      "Inventario",
      "Bodega",
      "Producto",
      "Devolución",
      "NotaCredito"
    ],
    "relaciones": [
      {
        "sujeto": "NotaCredito",
        "predicado": "refiereA",
        "objeto": "Devolución"
      },
      {
        "sujeto": "Inventario",
        "predicado": "perteneceA",
        "objeto": "Bodega"
      },
      {
        "sujeto": "Inventario",
        "predicado": "correspondeA",
        "objeto": "Producto"
      },
      {
        "sujeto": "NotaCredito",
        "predicado": "correspondeA",
        "objeto": "Producto"
      },
      {
        "sujeto": "Devolución",
        "predicado": "correspondeA",
        "objeto": "Producto"
      },
      {
        "sujeto": "Devolución",
        "predicado": "perteneceA",
        "objeto": "Bodega"
      }
    ]
  },
  "reglas_candidatas": [
    {
      "id": "R1",
      "enunciado": "Si en un mismo período y bodega el conteo físico de un Producto difiere del saldo calculado en Inventario para ese Producto y bodega en más de 5 unidades, se marca una diferencia relevante."
    },
    {
      "id": "R2",
      "enunciado": "Si una NotaCredito existe para una Bodega y Producto en un período sin un movimiento de Devolución correspondiente en Inventario, se marca una diferencia."
    }
  ],
  "fuentes_requeridas": [
    {
      "nombre": "MovimientosInventario",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "bodega",
          "justifica": [
            "R1",
            "R2"
          ]
        },
        {
          "nombre": "producto",
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
          "nombre": "tipoMovimiento",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "cantidad",
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
      "nombre": "ConteosFisicos",
      "tipo": "pdf",
      "columnas_minimas": [
        {
          "nombre": "bodega",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "producto",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "fecha",
          "justifica": [
            "R1"
          ]
        },
        {
          "nombre": "cantidadContada",
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
      "nombre": "NotasCredito",
      "tipo": "csv",
      "columnas_minimas": [
        {
          "nombre": "numeroNota",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "bodega",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "producto",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "fecha",
          "justifica": [
            "R2"
          ]
        },
        {
          "nombre": "cantidadDevuelta",
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
  "preguntas_abiertas": [
    "¿Las devoluciones del ERP están detalladas con un tipo de movimiento que permita identificarlas claramente?",
    "¿El campo 'cantidadContada' en los conteos físicos es la cantidad total registrada en el conteo o puede tener otro significado?"
  ],
  "completitud": "suficiente_para_confirmar"
}
```
