# Cierre de cuenta en Aura: por qué la contención es de solo ~37%

**Período:** 6–12 nov 2026 (America/Bogota) · **Bot:** Ada / Aura (Ontop)
**Herramienta:** `Onsight - Account Closure Eligibility v2` (`6ae7e12d621aa57d019cb553`)
**Playbook:** `Worker Account Data Lookup` (`6ae7e33c82651035f6649d73`), rama `CLOSURE`
**Alcance:** solo lectura. Se revisaron las 18 transcripciones completas del período: 11 con handoff y 7 contenidas.

---

## 1. Resumen ejecutivo

- **El handoff es casi siempre por diseño, no por fallas.** En 15 de 18 conversaciones (83%) la herramienta dijo que la cuenta **sí se podía cerrar** (`eligible_to_close = true`). Aun así, el playbook tiene la instrucción literal *"tell them nothing blocks the closure and **a person from the team will help them close it**"*. Además, la pregunta de cierre trae la regla HUMAN *"an account to close with nothing blocking it"*. Así, cada cuenta elegible termina en un agente.
- **Esto contradice la base de conocimiento.** El artículo "Cómo eliminar tu cuenta de Ontop" dice que el worker elimina la cuenta él mismo desde la web, en **Configuración de Cuenta → Eliminación de Cuenta**, con FaceMatch. Las 2 conversaciones que sí se resolvieron bien fueron justo aquellas en las que el agente generativo dio esos pasos desde la KB.
- **Sí existe una herramienta que ejecuta el borrado, pero está apagada.** `Worker Delete Account` (`6ae11826343e49a3c1b1f861`) está con `enabled: false` y `simulation_mode: "mock"`. No está referenciada en ningún paso del playbook y no tiene tráfico en producción (`behavior_profile: null`). Por eso el clasificador marca los handoffs como `tool_unavailable`.
- **La contención de 37% es mejor de lo que fue en la práctica.** 3 de las 7 conversaciones "contenidas" en realidad quedaron abandonadas o en un callejón sin salida, y 2 usuarios volvieron a escribir. La contención real con el caso resuelto es de **~2–3 de 18**.
- **La versión anterior de la herramienta no se usa.** `6abda490ebca58a1797d36c8` está deshabilitada y tuvo 0 conversaciones en el período.

---

## 2. Números (6–12 nov, America/Bogota, filtro ACTIONID = herramienta v2)

| Métrica | Valor |
|---|---|
| Conversaciones abiertas / con interacción del usuario | 18 / 18 |
| Contención (Ada) | **36,8%** (7 sin handoff) |
| Conversaciones con handoff | 11 |
| Tasa de resolución automática (Ada) | 14,3% |
| CSAT | 0% (sin encuestas respondidas; ninguna conversación tiene puntaje) |
| Herramienta anterior `6abda490…36c8` | 0 conversaciones (deshabilitada) |

### Resultado de la herramienta de elegibilidad (18 conversaciones)

| Resultado | N | % |
|---|---|---|
| `eligible_to_close = true` (sin bloqueos) | **15** | 83% |
| No elegible: saldo USD negativo (-14,90) | 1 | 6% |
| No elegible: `active_card_must_be_cancelled` | 1 | 6% |
| `status = error` (`onsight_unavailable`) | 1 | 6% |
| Verificación fallida o FaceMatch rechazado | 0 | 0% |
| `not_found` / `multiple_accounts_found` | 0 | 0% |

En este período no aparecieron bloqueos por contrato activo, saldo USDC, saldo de tarjeta ni transacciones pendientes. La verificación de identidad tampoco causó handoffs: 13 conversaciones entraron con sesión iniciada (`WEB_SESSION`) y 4 aprobaron la selfie de FaceMatch.

### Motivo del handoff según Ada (filtro HANDOFFREASON, 11 handoffs)

| HANDOFFREASON | N |
|---|---|
| `tool_unavailable` ("no permitted tool can execute the closure") | **8** |
| `handoff_configured` (ruta HUMAN del playbook) | 2 |
| `issue_unresolved` | 1 |
| `end_user_requested`, `tool_failed`, `out_of_scope` | 0 |

---

## 3. Clasificación manual de los 11 handoffs

| # | Conversación | Elegibilidad | Causa raíz | Tipo |
|---|---|---|---|---|
| 1 | `6af0972ae24ba877373685b6` | Elegible | El bot dijo "una persona te ayudará". El usuario escribió "Proceed with the cancellation" y eso se clasificó como RESOLVED, se salió del playbook y el agente generativo hizo handoff porque no hay herramienta de borrado. | Por diseño (sin herramienta) |
| 2 | `6aef8acbd137e8f856dcd882` | Elegible | Lo mismo. Es el mismo usuario de #1, que volvió el 12-nov (`6af5c352…`): son 3 contactos para un solo cierre. | Por diseño |
| 3 | `6af4d1bf777a9c5580ba7c87` | Elegible | Con "Solo quiero eso" se clasificó RESOLVED y luego hubo handoff `tool_unavailable`. El agente humano volvió a pedir verificación por Veriff. | Por diseño, con verificación duplicada |
| 4 | `6af0081d45b99aa9b2eaf163` | Elegible | El usuario preguntó "¿Cómo cierro mi cuenta?" y el playbook no dio los pasos de autoservicio. Se repitió "¿algo más?" y terminó en handoff. | **Corregible** (la KB tiene la respuesta) |
| 5 | `6af480f00ca020da4d5eb6cc` | Elegible | Con "No." se clasificó RESOLVED y la conversación se cerró **sin handoff**, aunque se había prometido "una persona te ayudará". El usuario volvió molesto ("where's the person…?!") y se registró `issue_unresolved`. | **Bug del playbook** |
| 6 | `6af31fc01ba6241eb181b0f3` | Elegible (FaceMatch aprobado) | El agente generativo dio los pasos web, pero el usuario respondió "No sale opción eliminación de cuenta". Es el mismo usuario que en `6af31f5d…`, una hora antes. | Brecha del producto (no ve la opción) |
| 7 | `6af1fb34e0d1c53e9356087d` | Elegible (FaceMatch aprobado) | Usuario con residencia en Venezuela, que se va porque la Personal Account no está disponible en su país. El bot dijo **por error** que "tu solicitud queda registrada" y el usuario siguió preguntando si ya se había eliminado. | Por diseño, con un mensaje engañoso |
| 8 | `6af1e90695dadc87e38fd6cd` | Elegible | Preguntó cuánto tarda el cierre y si podía hablar con la persona que lo haría. Se registró `handoff_configured`. | El usuario pidió un humano / por diseño |
| 9 | `6af1dc61cdec38f7227ca629` | Elegible | Confusión de onboarding: tenía un contrato por firmar y un formulario de datos de empresa. Después pidió eliminar la cuenta y hubo handoff `tool_unavailable`. | Confusión de onboarding / B2B |
| 10 | `6af4ed292352577b80e18c08` | Elegible según Onsight | **Discrepancia de datos:** la app le decía que tenía contrato activo y saldo, pero Onsight no mostraba ninguno de los dos. Ruta HUMAN. El agente borró la cuenta al día siguiente. | Discrepancia entre la app y el warehouse |
| 11 | `6aee13ab0b2a5b2f39962972` | **No elegible:** USD -14,90 | Saldo negativo. El bot respondió "no puedo darte los pasos para resolver un saldo negativo" y el usuario repitió la solicitud hasta el handoff. | **Corregible** (falta guía para este bloqueo) |

**Agrupación de las causas:**

| Causa | N | Por diseño / corregible |
|---|---|---|
| Cuenta elegible y el playbook promete que lo cierra un humano; no hay herramienta de borrado | 6 (#1, 2, 3, 7, 8, 9) | Por diseño (corregible cambiando el diseño) |
| Cuenta elegible, pero el playbook no da los pasos de autoservicio o clasifica mal la respuesta de cierre | 2 (#4, 5) | Corregible |
| Discrepancia: la app muestra un bloqueo que los datos no confirman | 1 (#10) | Requiere un humano o ingeniería |
| La opción de eliminar no aparece en la web | 1 (#6) | Producto / UX |
| Bloqueo real: saldo negativo, sin guía para resolverlo | 1 (#11) | Corregible (conocimiento) |
| Falla de la herramienta, `not_found` o FaceMatch fallido | 0 | — |

## 4. Revisión de las 7 conversaciones contenidas

| Conversación | Qué pasó | ¿Contención real? |
|---|---|---|
| `6af57d83f4b157190adf9e14` | Elegible. El agente generativo dio los pasos web desde la KB. | Sí |
| `6af37486a06bc4cb1e6ce5d0` | Elegible. Pasos web y FaceMatch. Ada lo marcó Resolved. | Sí |
| `6af5e5ab7cd7a21b047d0d51` | La herramienta devolvió `error` (`onsight_unavailable`). Después se dieron los pasos generales desde la KB. | Parcial |
| `6af5f70f565bb8b1e7e26fa8` | Bloqueo `active_card_must_be_cancelled`. El usuario canceló la tarjeta en ese momento y el bot le pidió esperar al refresh diario de los datos. | Contenida, pero el usuario va a volver (frescura de los datos) |
| `6af31f5df116fff387c6412f` | Elegible. El bot preguntó "¿algo más?" en bucle y el usuario abandonó. Volvió por WhatsApp (`6af31fc0…`) y terminó en handoff. | **No** (contención falsa) |
| `6aefe2757a68f50317dd8edd` | Elegible. La conversación terminó en "Estoy verificando el siguiente paso…" y nada más. | **No** (callejón sin salida) |
| `6af5c352a8b0a5228a88e98e` | Tercer contacto del mismo usuario de #1/#2. Terminó en "¿algo más?" sin respuesta. | **No** |

---

## 5. Inspección de la herramienta (v2) y de la herramienta de borrado

**Entradas:** `fm_email`, `fm_result`, `verified_at`, `session_email`, `user_type`, `sunshine_channel`, `chat_channel`.

**Identidad:** se acepta una sesión web o de chat como `worker`, o un FaceMatch `APPROVED` de hace 3.600 s o menos. Si no se cumple, devuelve `verification_required`.

**Consulta:** usa el MCP de Onsight sobre `process_data.contractor` y `process_data.wallet_transaction`.

**Salidas:** `status`, `reason`, `eligible_to_close`, `blockers`, `active_contracts`, `wallet_balance_usd`, `wallet_balance_usdc`, `card_balance`, `pending_count`, `pending_transactions` y `data_note`.

**Bloqueos que calcula:**
1. `active_contracts` > 0 (`num_active_contracts`).
2. `wallet_balance_usd` ≠ 0. **Incluye saldos negativos**, que el usuario no puede resolver retirando dinero.
3. `wallet_balance_usdc` ≠ 0.
4. `card_balance` ≠ 0.
5. `active_card_must_be_cancelled` cuando `new_has_card_virtual` > 0 o `new_has_card_physical` > 0. La consulta trae `des_physical_card_status`, pero **no lo usa** para decidir. Es probable que el flag "tiene tarjeta" siga en 1 después de cancelarla; es una hipótesis que conviene validar con `6af5f70f…`.
6. `pending_transactions`: estados `SENT`, `IN_PROGRESS`, `UNDER_REVIEW`, `ACTION_NEEDED`, `APPROVED_RISK` o `PENDING` en los últimos 60 días.

**Otros comportamientos:**
- Devuelve `not_found` si no hay cuenta, y `error` si encuentra más de una cuenta o si Onsight falla.
- Los datos se refrescan una vez al día, alrededor de las 00:00 hora de Colombia.

**Posibles brechas (sin verificar):** la herramienta no revisa saldo en Future Fund, adelantos de nómina (Paycheck Advance) pendientes, suscripción Reserve activa ni bloqueos de compliance o KYC. Si el backend de borrado sí los revisa, Aura puede decir "nada bloquea" y luego la web rechazar el borrado.

**`Worker Delete Account` (`6ae11826343e49a3c1b1f861`):**
- Es una herramienta de API con `enabled: false`, `simulation_mode: "mock"`, sin perfil de comportamiento y sin referencia en ningún playbook.
- Su descripción exige tres condiciones antes de llamarla: (1) que el worker lo pida explícitamente, (2) un **FaceMatch de menos de 5 minutos** y (3) una confirmación explícita después de explicarle las consecuencias (pierde el acceso de inmediato).
- **Conclusión:** hoy Aura no puede ejecutar el borrado. El flujo está diseñado para terminar en handoff o en autoservicio web, aunque el playbook solo ofrece el handoff.

---

## 6. Qué es por diseño y qué se puede corregir

| Situación | Clasificación |
|---|---|
| Aura no ejecuta el borrado: la herramienta está apagada y en modo mock | Decisión de diseño (requiere aprobación de Producto, Compliance e Ingeniería) |
| El playbook manda a un humano a los elegibles, cuando la KB dice que es autoservicio | **Corregible ya** (cambio de texto en el playbook) |
| "No", "Solo quiero eso" o "Proceed" se clasifican como RESOLVED y se pierde el handoff prometido | **Corregible** (bug en la pregunta de cierre) |
| No hay guía para el saldo negativo, y la frescura de los datos afecta a quien acaba de cancelar la tarjeta | **Corregible** (conocimiento + lógica de la herramienta) |
| Discrepancia entre la app y Onsight, y opción de eliminar que no aparece en la web | Requiere un humano, más un ticket de producto |
| El agente humano pide Veriff aunque Aura ya aprobó FaceMatch | Corregible en el proceso (pasar el resultado de FaceMatch en el ticket) |

---

## 7. Cambios recomendados, ordenados por impacto

1. **Rama CLOSURE elegible: dar autoservicio en vez de mandar a un humano** (playbook, paso `ad1a0000000000000000003e`, y regla HUMAN (2) del paso `ad1a00000000000000000050`).
   - Si `eligible_to_close = true`, dar los pasos de la KB: web → Configuración de Cuenta → Eliminación de Cuenta → FaceMatch, con aviso de que es irreversible.
   - Quitar "an account to close with nothing blocking it" de las reglas HUMAN.
   - Hacer handoff solo si el usuario dice que no ve la opción, que la app le muestra un bloqueo que los datos no confirman, o si no tiene acceso a la web.
   - *Impacto estimado:* convierte en contenidas 6–8 de los 11 handoffs (#1–5, 7, 8). La contención podría pasar de ~37% a ~70–80%.

2. **Arreglar la pregunta de cierre después de una respuesta de cierre** (paso `ad1a00000000000000000050`).
   - Agregar un valor como `PROCEED_CLOSURE`. Respuestas como "proceed", "close my account", "cómo lo hago", "solo quiero eso" o "no" justo después del resultado de elegibilidad deben llevar a los pasos de autoservicio, o al handoff si no hay alternativa. Hoy van a RESOLVED o a `did_not_answer`, y la conversación entra en bucle.
   - Prohibir que el agente diga que la solicitud "queda registrada" si no se creó un ticket (`6af1fb34…`).
   - *Impacto:* elimina las contenciones falsas (`6af31f5d…`, `6aefe275…`, `6af5c352…`) y los regresos de usuarios molestos (`6af480f0…`), y reduce los contactos repetidos.

3. **Mediano plazo: activar `Worker Delete Account` dentro de la rama CLOSURE** (herramienta + playbook).
   - Antes de llamarla: una confirmación explícita con las consecuencias y un FaceMatch fresco de menos de 5 minutos. El gate actual del playbook acepta 60 minutos o una sesión web, así que hace falta un FaceMatch nuevo antes del borrado.
   - Primero probarla en modo mock y después pasarla a live.
   - *Impacto:* contención real también en WhatsApp y en usuarios que no ven la opción web (#6, #9). Requiere la aprobación de Compliance.

4. **Guía de bloqueos y precisión de la herramienta** (código y conocimiento).
   - **Saldo USD negativo:** agregar un mensaje y un artículo que expliquen el origen (por ejemplo, un cargo de Reserve de USD 14,90) y cómo regularizarlo, o hacer un handoff directo con el monto.
   - **Tarjeta activa:** decidir con `des_physical_card_status` y el estado de la tarjeta virtual en lugar de los flags `new_has_card_*`.
   - **Frescura de los datos:** si el usuario dice que canceló la tarjeta o movió el saldo hoy, ofrecer volver mañana o hacer handoff, sin repetir el mismo bloqueo.
   - Evaluar si conviene agregar Future Fund, adelantos pendientes y Reserve activa como bloqueos.
   - *Impacto:* bajo en volumen (2 de 18 en este período), pero evita las respuestas sin salida.

5. **Handoff de mejor calidad cuando no se puede evitar.**
   - En los casos de discrepancia (`6af4ed29…`) y de opción web que no aparece (`6af31fc0…`): incluir en el ticket el resultado de la herramienta (`account_lookup_result`) y el FaceMatch aprobado, para que el agente no vuelva a pedir Veriff (`6af4d1bf…`, `6af31fc0…`).
   - Etiquetar el ticket como "cierre – discrepancia" para medir cuántas veces la app bloquea sin una razón real, y llevar esos casos a Producto.
   - *Impacto:* menor tiempo de atención humana y mejor CSAT; no cambia la contención.

---

**Nota sobre la muestra:** son 18 conversaciones en 7 días. Las proporciones son orientativas, pero el patrón dominante (elegible → "una persona te ayudará" → handoff) aparece en todas las conversaciones elegibles que se revisaron.
