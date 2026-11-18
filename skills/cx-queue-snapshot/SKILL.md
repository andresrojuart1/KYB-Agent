---
name: "cx-queue-snapshot"
description: "Foto de la cola de soporte de Ontop en Zendesk usando el conector Zendesk MCP Bridge: cuántos tickets hay abiertos, en pending y en Internally raised en Worker Support y Company Support, cuántos tiene cada persona del equipo de CX, cuántos están asignados a otras áreas (piloto de asignación directa), cuántos no tienen dueño, cuántos entraron por día y cuáles son los más viejos. Úsala cuando pregunten 'cómo está la cola', 'cuántos tickets tiene cada uno', 'cuántos tenemos abiertos', 'cómo vamos con la meta de 50', 'quién tiene más carga', 'cuántos entraron hoy' o pidan el reporte del piloto. Solo lee; no modifica tickets."
---

# CX Queue Snapshot · la cola de soporte en 5 minutos

Responde en el idioma de quien pregunta (normalmente español). **Solo lectura**: esta skill nunca cambia, asigna, responde ni cierra tickets.

## Herramienta: dos caminos, las mismas queries

Todas las recetas de abajo son queries de búsqueda de Zendesk. Funcionan igual por cualquiera de los dos caminos; usa el que tengas disponible.

### Opción A · Zendesk MCP Bridge (conector)

Si el conector está conectado (cárgalo con la búsqueda de herramientas si aparece diferido):

- `list_search_results` (`query`, opcional `sort_by` = `created_at`, `sort_order` = `asc|desc`). **Lee el campo `count`** de la respuesta: es el total exacto, aunque la lista venga paginada. Los resultados traen solo `id`, fechas y descripción (no estado ni dueño): el filtro lo hace la query.
- `getTicketById` (`ticket_id`): estado, asignado, grupo, tags y campos de un ticket puntual.

### Opción B · API de Zendesk (token)

Si no hay conector pero sí un token de API, con `curl` o Python. Las credenciales salen de variables de entorno; **nunca las escribas en archivos, en el chat ni en reportes**:

```bash
# Variables: ZENDESK_EMAIL (tu correo de agente) y ZENDESK_TOKEN (tu API token)
ZD="https://getontop.zendesk.com/api/v2"

# Solo el número (lo más rápido para conteos)
curl -sS -G -u "$ZENDESK_EMAIL/token:$ZENDESK_TOKEN" "$ZD/search/count.json" \
  --data-urlencode "query=type:ticket group:23897889259668 status:new status:open"
# → {"count":5}

# La lista de tickets (con estado, assignee_id y grupo), los más viejos primero
curl -sS -G -u "$ZENDESK_EMAIL/token:$ZENDESK_TOKEN" "$ZD/search.json" \
  --data-urlencode "query=type:ticket group:22616861202452 status:new status:open" \
  --data-urlencode "sort_by=created_at" --data-urlencode "sort_order=asc"

# Un ticket puntual
curl -sS -u "$ZENDESK_EMAIL/token:$ZENDESK_TOKEN" "$ZD/tickets/<ID>.json"
```

Diferencias con el conector: `search.json` sí trae `status`, `assignee_id` y `group_id` de cada ticket (100 por página; sigue `next_page`), así que una sola búsqueda sirve para armar la tabla por persona en Python. Si recibes **429**, espera los segundos de `Retry-After` y reintenta.

En ambos caminos, lanza en paralelo las búsquedas que no dependen entre sí.

## Constantes de Ontop

| Qué | Valor |
| --- | --- |
| Grupo Worker Support (WS) | `22616861202452` |
| Grupo Company Support (CS) | `23897889259668` |
| Estado *Internally raised* | `custom_status_id:31769974642836` |
| Estado *Waiting for requester* (pending) | `status:pending` |
| Estado *Externally raised* | `custom_status_id:26417816117780` |

Equipo de CX (busca por correo con `assignee:<email>`):

| Persona | Correo | Dominio |
| --- | --- | --- |
| Cristian | cecheverria@getontop.com | Onboarding & access |
| Brisa | bcalero@getontop.com | Onboarding & access |
| Justin | jrmejia@getontop.com | Payouts & pay-ins |
| Sudu | skrishnamurthy@getontop.com | Payouts & pay-ins |
| Jaime | jtellez@getontop.com | Financial Services |
| Carolina | cgutierrez@getontop.com | Financial Services |
| Samuel | sforero@getontop.com | B2B · Payroll & paying (cuentas top) |
| Miguel | mcotes@getontop.com | B2B · Acquisition & onboarding (cuentas top) |
| Mike | mrojas@getontop.com | Head of CX |

Si alguien nuevo entra al equipo, agrégalo aquí.

## Recetas (queries probadas)

En todas, `GRUPOS` = `group:22616861202452 group:23897889259668` (las dos colas). Para una sola cola, usa un solo `group:`.

### 1. Foto general (la meta del piloto)

| Métrica | Query |
| --- | --- |
| Abiertos WS | `type:ticket group:22616861202452 status:new status:open` |
| Abiertos CS | `type:ticket group:23897889259668 status:new status:open` |
| Internally raised (todas las colas) | `type:ticket custom_status_id:31769974642836` |
| Pending WS | `type:ticket group:22616861202452 status:pending` |
| Sin dueño (WS) | `type:ticket group:22616861202452 status<solved assignee:none` |

**Meta del piloto**: *Abiertos (WS + CS) + Internally raised* ≤ **50**. Muestra siempre el total y la distancia a la meta.

### 2. Carga por persona

Para cada correo del equipo, tres búsquedas (lee solo `count`):

- Abiertos: `type:ticket GRUPOS status:new status:open assignee:<email>`
- Pending: `type:ticket GRUPOS status:pending assignee:<email>`
- Internally raised: `type:ticket custom_status_id:31769974642836 assignee:<email>`

Tabla: Persona · Abiertos · Pending · Internally raised · Total. Ordena por abiertos, de mayor a menor. Si alguien de PTO tiene tickets (por ejemplo, Sudu), márcalo: hay que pasarlos a su backup.

### 3. Tickets asignados a otras áreas (piloto de asignación directa)

Tickets de WS sin resolver cuyo dueño **no** es del equipo de CX ni está vacío:

```
type:ticket group:22616861202452 status<solved -assignee:none -assignee:cecheverria@getontop.com -assignee:bcalero@getontop.com -assignee:jrmejia@getontop.com -assignee:jtellez@getontop.com -assignee:cgutierrez@getontop.com -assignee:skrishnamurthy@getontop.com -assignee:sforero@getontop.com -assignee:mcotes@getontop.com -assignee:mrojas@getontop.com
```

Para ver de quién es cada uno, abre los primeros con `getTicketById` (campo `assignee_id`). Revisa que **ninguno quede asignado solo al grupo** (sin persona): eso es lo que pidió Daniela.

### 4. Volumen que entra

- Creados en un día: `type:ticket group:22616861202452 created>=2026-11-17 created<2026-11-18` (cambia las fechas).
- Compara con los 7 días anteriores para ver si el volumen sube o baja. Un día normal de semana en WS ronda los 200–240; los fines de semana bajan.

### 5. Los más viejos (para priorizar)

- Abiertos más antiguos: `type:ticket GRUPOS status:new status:open` con `sort_by=created_at`, `sort_order=asc`. Los primeros 10 son la prioridad.
- Internally raised más antiguos: `type:ticket custom_status_id:31769974642836` con el mismo orden. Si un caso lleva más de 7 días, conviene que el dueño insista en la side conversation.

### 6. Cuentas estratégicas (Samuel y Miguel)

`type:ticket tags:cuenta_prioritaria status<solved` → cuántos tickets de cuentas top siguen abiertos y de quién son.

## Cómo entregar el resultado

```
📊 Cola CX · <fecha y hora COL>
Abiertos WS: X · CS: Y · Internally raised: Z → Total piloto: N (meta 50, faltan N−50)
Pending: P · Sin dueño: S

Por persona: tabla (Persona · Abiertos · Pending · IR)
Asignados a otras áreas: K (ninguno sin persona ✅ / M solo al grupo ⚠️)
Entraron hoy: E (ayer: E-1)
Más viejos: 3–5 números de ticket con su antigüedad
```

Termina con 1–3 acciones concretas (por ejemplo: "Sudu tiene 3 tickets: pasarlos a Justin", "el #XXXX lleva 12 días en Internally raised: insistir con Payouts").

## Reglas

- **Solo lectura.** Si te piden mover, asignar o cerrar tickets, dilo y no lo hagas con esta skill.
- **Sin datos personales en Slack ni en reportes compartidos**: usa números de ticket, no nombres, correos ni montos de workers. Las descripciones que trae la búsqueda pueden incluir datos personales: no las copies.
- Los conteos de la búsqueda pueden tardar unos minutos en reflejar cambios recientes. Si un número no cuadra, vuelve a correr la query.
- La búsqueda devuelve como máximo 1.000 resultados por query; para conteos usa siempre `count`.
