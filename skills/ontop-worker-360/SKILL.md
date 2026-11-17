---
name: "ontop-worker-360"
description: "Worker/client 'hoja de vida' for Ontop CX agents and for the teams that own tickets in the direct-assignment pilot (Tech Support, Payouts, FinOps, Product Ops, Compliance, Card Ops): given a CR, CA, CL, email, phone or transaction ID, pull a 360° profile from Onsight (account, contract, transactions, logins, duplicates, fraud signals) and draft the reply to the customer in Ontop's tone. Needs the Onsight connector; without it, use ontop-ticket-reply."
---

# Ontop Worker 360 — hoja de vida para agentes de CX

Objetivo: cuando a un agente le llega un ticket, con **un solo dato** (CR, email, teléfono, CA, CL o ID de transacción) le devuelves en una sola respuesta quién es la persona, **qué está pidiendo**, qué le ha pasado y qué debe hacer.

**Quién la usa.** Si quien pregunta es de CX, la salida le dice qué resolver y a qué área escalar. Si es del área dueña del caso (piloto de asignación directa: Tech Support, Payouts, FinOps, Product Ops, Compliance, Card Ops), **el ticket ya es suyo**: no le digas "escala a [su propia área]"; dile qué revisar o decidir en su lado y cómo responder y cerrar. Si no sabes de qué área es, pregúntalo una vez.

Responde **en el idioma del agente** (español o inglés). Las respuestas sugeridas al cliente van en el idioma del cliente; si el agente pide otro idioma, tradúcela tal cual sin cambiar el contenido. Todas las horas en **hora Bogotá (UTC-5)**; los datos vienen en UTC.

## Conexión

- SQL: `mcp__Ontop_Onsight__onsight_execute_sql` (cárgala con ToolSearch si está diferida). `connector_id`: `0ef9e62e-cb8e-4f3f-a3fc-1ba33f25d301` (Redshift). Si falla, corre `onsight_list_connectors` y usa el de tipo redshift.
- Zendesk: `mcp__remote-devices__zendesk__getTicketComments` (y `getTicket` si hace falta). Cárgalas con ToolSearch. Si no tienes conector de Zendesk, pide que peguen la conversación del ticket (o los últimos mensajes del cliente) y sigue con eso.
- Solo SELECT. Si el MCP se desconecta ("connection lost", 502), recarga la herramienta con ToolSearch y reintenta solo la consulta que falló; divide consultas pesadas. Lanza en paralelo las consultas independientes.

## 🔒 Reglas de privacidad (no negociables)

1. **Ontopers:** si `is_ontoper = 1` o los campos vienen enmascarados (`cd_…`, `fln_…`, `em_…`), **detente**. Di que es un empleado de Ontop, que su perfil está protegido y que el caso va a People/HR o Finance. No intentes desenmascarar.
2. Nunca muestres número de documento, fecha de nacimiento, SSN, PAN completo de tarjeta, CLABE/número de cuenta completo (solo los últimos 4) ni direcciones de wallets cripto completas.
3. La hoja de vida es **para el agente, no para el cliente**. Antes de compartir cualquier dato con quien escribe, el agente debe validar identidad (email registrado o CR + otro dato). Si el contacto llega desde un teléfono/email que no coincide con el perfil, dilo en rojo.
4. Fraude: habla de **señales**, nunca acuses. La decisión es de Risk/Fraud.
5. No inventes lo que no está en las tablas (país o entidad de origen de los pagos, comisiones o tiempos de un proveedor): di "no está en los datos" y a quién preguntar.

## Paso 1 — Detectar el tipo de dato

| Patrón | Tipo |
|---|---|
| `CR` + dígitos | Worker (cod_contractor) |
| `CA` + dígitos | Contrato |
| `CL` + dígitos | Cliente → ir a **Modo cliente** |
| contiene `@` | Email. Un email corporativo puede ser de un **worker** o de un admin del cliente: busca en ambos |
| solo dígitos, ≥ 7, con o sin `+` | Teléfono (o ID de transacción si el agente lo dice). Si empieza con código de país (504, 57, 52…), sepáralo en `cod_dial` + `des_phone` |
| 7 dígitos tipo 3xxxxxx | Probable ID de transacción de wallet |

Si es ambiguo, prueba ambas interpretaciones.

## Paso 2 — Resolver identidad (siempre, buscando en todas las fuentes)

Worker por CR / email / teléfono:
```sql
SELECT c.cod_contractor, c.id_contractor, c.id_person, c.full_name, c.des_email, c.cod_dial, c.des_phone,
       c.cod_residence_country, c.account_type, c.dat_creation, c.des_wallet_status, c.des_kyc_check_status,
       c.dat_last_kyc_check, c.amt_wallet_balance, c.amt_card_balance, c.has_card, c.des_physical_card_status,
       c.new_has_card_virtual, c.new_has_card_physical, c.dat_wallet_creation, c.dat_wallet_creation_usdc,
       c.dat_wallet_exclusion, c.is_ontoper, c.dat_processing
FROM process_data.contractor c
WHERE c.cod_contractor = '<CR>'
   OR c.des_email ILIKE '<email>'
   OR CAST(c.cod_dial AS VARCHAR)||CAST(c.des_phone AS VARCHAR) = '<solo_digitos>'
   OR CAST(c.des_phone AS VARCHAR) LIKE '%<ultimos_8_a_10_digitos>%';
```

Si no aparece en `contractor`, busca en orden (un teléfono o email viejo puede vivir solo aquí):
- `raw_data.raw_person` (`email`, `phone`; une con `process_data.contractor.id_person = raw_person.id`). Ahí quedan teléfonos antiguos.
- `process_data.contract` (`des_contractor_email`, `des_email_invitation`): invitaciones a contratos. **`des_email_invitation` es una URL de signup con `email=...` adentro**: busca con `ILIKE '%parte_del_email%'`.
- `process_data.wallet_transaction.des_holder_phone` y `process_data.payment_method_contractor.des_holder_phone`.
- `external.zendesk__user` (`email`, `phone`, `name`): contactos que escribieron por chat/WhatsApp sin cuenta. **Si el email solo existe en Zendesk, toma el `name` del usuario y busca en `contractor` por `full_name ILIKE '%APELLIDO%'`**: es común que el worker escriba desde un email distinto al registrado. Lee el ticket: a veces el usuario da ahí su email real o su Ontop tag.
- `external.aura__conversations` (`metavariables_user_phone_number`, `variables_email`).
- Emails corporativos: puede ser un **usuario del cliente** (admin de empresa), no un worker; búscalo también en `process_data.vw_team_users` (no tiene `des_email`: revisa sus columnas con `information_schema.columns` antes de filtrar).

Si aparece solo en Zendesk y no encuentras cuenta por nombre, dilo: "No es worker ni cliente registrado; contacto en Zendesk ticket #…". Sugiere al agente pedir email/CR registrado.

## Paso 3 — Construir la hoja de vida (usa el `cod_contractor` / `id_contractor` resuelto)

**3.0 Qué pide (siempre primero)**
Busca sus tickets (3.8) y lee el más reciente abierto con `getTicketComments`. Resume en una línea qué pide, por qué canal y cuántas horas lleva sin respuesta. Señales que debes reportar:
- El ticket solo tiene el encabezado "Conversation with …": llegó vacío (fallo de sincronización del chat). El agente debe revisar el chat o preguntarle al cliente.
- Nota `❌ Unsuccessful Merge into Another User Identification`: el usuario de WhatsApp no se unió con su usuario de email, y el ticket suele quedar sin dueño.
- Aura pregunta B2B/B2C varias veces, o después de que el usuario pide un humano: loop de Aura. Menciónalo.
- Tickets en `new` o `hold` por más de 24 h: urgencia.

**3.1 Contratos y cliente**
```sql
SELECT k.cod_contract, k.des_contract_type, k.des_state, k.new_des_state, k.des_role_name, k.dat_contract_start,
       k.dat_contract_end, k.des_periodic_compensation, k.amt_monthly_compensation_usd, k.dat_first_invoice_paid,
       k.dat_last_invoice_paid, k.dat_sign_invitation, k.dat_client_sign, k.dat_contractor_sign, k.des_who_signs,
       k.des_contractor_email, cl.cod_client, cl.des_legal_name, cl.des_trade_name, cl.des_legal_country,
       cl.is_active_client, cl.des_kyb_check_status, cl.des_cs_segment, cl.is_dummy_client
FROM process_data.contract k LEFT JOIN process_data.client cl ON cl.id_client = k.id_client
WHERE k.id_contractor = <id_contractor> ORDER BY k.dat_contract_creation DESC;
```
Estado NEW: revisa quién no ha firmado (`dat_client_sign` / `dat_contractor_sign`) y si existe wallet. En contratos PAY PER TASK/TIME, `amt_monthly_compensation_usd` es la tarifa por hora o tarea, no el salario mensual.

**3.2 Transacciones**
Trae las últimas 20–30 (no solo los últimos 30 días) y un resumen por tipo y estado:
```sql
SELECT id_transaction, dat_transaction, dat_transaction_update, des_transaction_type, des_transfer_type, des_status,
       cod_currency, amt_transaction, amt_recipient_gets, amt_total_cost, cod_provider, des_dest_ent_name,
       des_dest_ent_country, is_dest_acc_holder, des_holder_first_name, des_holder_last_name, commerce_name,
       id_provider_cashout, future_funds_debit_or_credit
FROM process_data.wallet_transaction
WHERE cod_contractor = '<CR>' ORDER BY dat_transaction DESC LIMIT 30;

SELECT des_transaction_type, des_status, COUNT(*) n, SUM(amt_transaction) total, MIN(dat_transaction), MAX(dat_transaction)
FROM process_data.wallet_transaction WHERE cod_contractor = '<CR>' GROUP BY 1,2;
```
Resume, no pegues todo: pagos de nómina, retiros (estado y proveedor), compras con tarjeta destacadas, transacciones atascadas. Comprueba que el saldo cuadra con la suma histórica. Busca patrones:
- Nómina y retiro el mismo día: si este mes no retiró, algo lo está frenando.
- Beneficiarios terceros que se repiten desde hace tiempo: es contexto, no señal de estafa.
- Compensaciones repetidas: ver 3.9.

**3.3 Logins y dispositivos**
```sql
-- user_id: SELECT user_id FROM raw_data.raw_person WHERE id = <id_person>
SELECT mobile_device_id, MAX(device_data) device, COUNT(*) n, MIN(login_date) first_seen, MAX(login_date) last_seen,
       COUNT(DISTINCT ip) ips, SUM(CASE WHEN login_state='FAILED' THEN 1 ELSE 0 END) failed
FROM raw_data.raw_sec_user_login_history WHERE user_id = <user_id>
GROUP BY 1 ORDER BY last_seen DESC;

SELECT login_date, login_state, login_response_message, ip, mobile_device_id, device_data
FROM raw_data.raw_sec_user_login_history WHERE user_id = <user_id> ORDER BY login_date DESC LIMIT 25;
```
Mensajes clave:
- `User is inactive`: Ontop desactivó la cuenta.
- `Login attempts exceeded`: bloqueo por intentos fallidos (ver Procedimientos de CX).
- Un dispositivo con `device_data` NULL y UUID tipo iOS, desde una IP extranjera, es una señal.

**3.4 Direcciones, nacionalidad y documento**
```sql
SELECT des_residence_country, des_residence_state, des_residence_city, des_residence_address, cod_residence_zip,
       des_nationality_country, document_expiration_date, des_validation_provider_name, is_residence_country_restricted
FROM process_data.contractor_eurowallet WHERE cod_contractor = '<CR>';
```
Muestra la dirección solo si el agente la necesita para el caso. Marca:
- Perfiles sin dirección o con país distinto al prefijo del teléfono.
- Documento que vence en menos de 60 días: hay que recordar actualizarlo.
- `is_residence_country_restricted = 1` + wallet EXCLUDED: worker de pago directo (ver 3.10).

**3.5 Ontop tag (handle)**
```sql
SELECT handle FROM raw_data.raw_contractor WHERE id = <id_contractor>;
```

**3.6 Cuentas duplicadas**
```sql
SELECT cod_contractor, full_name, des_email, dat_creation, des_wallet_status, des_kyc_check_status, account_type, amt_wallet_balance
FROM process_data.contractor
WHERE cod_contractor <> '<CR>'
  AND ( CAST(des_phone AS VARCHAR) = '<des_phone>'
     OR full_name ILIKE '<full_name>'
     OR SPLIT_PART(des_email,'@',1) ILIKE SPLIT_PART('<email>','@',1) );
```
Para cada duplicado: email, fecha, si tiene wallet/KYC/contrato/saldo y su handle. Indica cuál es la cuenta "viva" (la del contrato activo, el saldo y la tarjeta). Los emails con sufijo `-DELETED` son cuentas ya eliminadas.

**3.7 Future Funds (solo si hay movimientos)**
```sql
SELECT future_funds_debit_or_credit, COUNT(*) n, SUM(amt_transaction) total, MAX(dat_transaction) last_dt
FROM process_data.wallet_transaction
WHERE cod_contractor = '<CR>' AND future_funds_debit_or_credit IS NOT NULL AND des_status = 'COMPLETED'
GROUP BY 1;
```
`Future Funds Debit` = salió de la wallet hacia FF (depósito). `Future Funds Credit` = volvió de FF a la wallet. Saldo estimado = −SUM(debits) − SUM(credits) (sin rendimientos). Dilo siempre como **estimado**: el saldo exacto está en el panel de FF.

**3.8 Historial en Zendesk**
```sql
SELECT DISTINCT t.id, t.created_at, t.status, LEFT(CAST(t.subject AS VARCHAR),140) subject
FROM external.zendesk__ticket t JOIN external.zendesk__user u ON u.id = t.requester_id
WHERE CAST(u.email AS VARCHAR) ILIKE '<email>' OR CAST(u.phone AS VARCHAR) LIKE '%<ultimos_digitos>%'
ORDER BY t.created_at DESC LIMIT 12;
```
(La tabla de Zendesk trae filas repetidas por estado: usa siempre DISTINCT. El `subject` generado por IA suele resumir bien el caso.)

**3.9 Comisiones de retiro**
`amt_transaction - amt_recipient_gets` es la comisión de Ontop (por ejemplo, USD 6 fijos en transferencias a algunos países). Si el worker dice que recibió menos que `amt_recipient_gets`, la diferencia la cobró un banco intermediario o su banco receptor, no Ontop. Si ves `COMPENSATION` por el mismo monto casi todos los meses, probablemente ya le han reembolsado ese mismo reclamo antes. Díselo al agente para que sea coherente y escale la causa raíz.

**3.10 Workers sin wallet / pago directo**
Si `des_wallet_status = 'EXCLUDED'` o el país es restringido, el pago va directo a su banco:
```sql
SELECT des_payment_method, des_status, is_active, des_holder_first_name, des_holder_last_name, is_dest_acc_holder,
       des_dest_ent_name, des_dest_ent_country, cod_dest_acc_currency, dat_creation
FROM process_data.payment_method_contractor WHERE cod_contractor = '<CR>';
```
Úsala también cuando haya problemas de retiro: métodos recién agregados, varias cuentas creadas en poco tiempo, o una cuenta marcada como de tercero aunque tenga su propio nombre.

## Paso 4 — Investigaciones según el motivo

**A. "No me llegó el pago"**: no basta con mirar la wallet.
```sql
SELECT cod_invoice, cod_contract, dat_issue, amt_total, des_invoice_state, dat_client_paid, dat_contractor_payment
FROM process_data.invoice WHERE id_contractor = <id_contractor> ORDER BY dat_issue DESC LIMIT 6;
```
- **No hay factura para el contrato activo**: el cliente no lo ha pagado ni cargado (pasa mucho en PAY PER TASK/TIME cuando no aprueban las horas). El problema es del cliente: pasa a Modo cliente.
- **El cliente pagó la factura pero no hay PAYROLL en la wallet**: el pago está retenido en Ontop. Revisa si el KYC está `UNVERIFIED` sin fecha o si hay un tema de compliance, y escala a Payments/Compliance.
- Compara con los otros workers del mismo cliente: cuántos cobraron este ciclo.

**B. Retiro demorado**: compara `dat_transaction` con `dat_transaction_update` en sus retiros anteriores al mismo destino para saber cuánto tarda normalmente. Si lleva más de 10 días en SENT o está muy por encima de su histórico, está atascado.

**C. El retiro "da error" y no se crea ninguna transacción**: causas típicas:
- Intenta enviar el saldo completo y no le alcanza para la comisión.
- Restricción en el primer retiro.
- Método de pago mal registrado.
Pide una captura del error y que pruebe con un monto un poco menor.

**D. Crypto**: si `dat_wallet_creation_usdc` es NULL, nunca creó la wallet USDC. Si el error sale al registrar la dirección (por ejemplo, un 404) y otros workers del mismo país sí envían crypto, es una falla técnica: escala a Tech con el video y las capturas.

**E. Saldo de tarjeta negativo**: busca ajustes en `wallet_transaction`. `process_data.card_transaction` puede venir vacía. Si no puedes explicarlo, escala a Cards (Thredd) junto con cualquier caso previo de doble cobro.

## Paso 5 — Señales de riesgo y alertas (evalúa todas)

| Señal | Cómo detectarla | Nivel |
|---|---|---|
| Login exitoso desde un dispositivo nuevo, distinto al habitual, con saldo disponible | 3.3: `first_seen` hoy/ayer y `n = 1`, mientras el dispositivo habitual tiene historia larga | 🔴 Posible toma de cuenta → Risk/Fraud ya |
| **Mismas IPs entrando a varias cuentas** | Cuenta usuarios distintos por IP en esa ventana (query abajo). Una IP que entra a decenas de cuentas en minutos es una ola de toma de cuentas | 🔴 Incidente → Risk con la lista |
| Dinero que sale minutos después de un login sospechoso (un envío crypto pequeño suele ser una prueba) | 3.2 + 3.3 | 🔴 |
| Contacto desde teléfono/email que no coincide con el perfil | Paso 2 | 🔴 Validar identidad antes de compartir datos |
| Cuenta bloqueada o inactiva, con saldo y sin respuesta | 3.3 + 3.0 | 🟠 |
| Login fallido por contraseña desde dispositivo nunca visto | 3.3 `FAILED` | 🟠 |
| Muchos retiros CANCELLED seguidos + uno UNDER_REVIEW | 3.2 | 🟠 Revisión de cumplimiento o fallo del proveedor; si se repite en varios workers el mismo día, es incidente del proveedor |
| Transferencia en SENT / IN_PROGRESS por encima de su tiempo normal | 4.B | 🟠 Escalar a Payments con ID Ontop + `id_provider_cashout` |
| Posible doble cobro con tarjeta | `CARD_PURCHASE` + `CARD_PURCHASE_ADJUSTMENT` por el mismo monto y comercio sin reverso | 🟠 Escalar a Cards (Thredd) |
| KYC UNVERIFIED sin fecha en una cuenta antigua | Paso 2 | 🟠 Compliance |
| Saldo de tarjeta negativo | `amt_card_balance < 0` (4.E) | 🟡 |
| Ciclo de Quick advances (anticipo → retiro → se descuenta casi toda la nómina) | tipos `QUICK` / `QUICK_AUTOMATIC_CHARGE` | 🟡 Explicar el descuento; avisar a Quick/Risk si es crónico |
| Envíos a terceros (`is_dest_acc_holder = false`) | 3.2 (si son recurrentes, es solo contexto) | 🟡 Contexto en disputas |
| Cuentas duplicadas | 3.6 | 🟡 Decirle al agente en qué cuenta está el contrato vivo |
| Contrato NEW después de la fecha de inicio | 3.1 | 🟡 Falta firma (decir de quién) y/o wallet |
| Perfil incompleto o documento por vencer | 3.4 | 🟡 Pedir completar o actualizar |
| Compensaciones repetidas por el mismo motivo | 3.9 | 🟡 Causa raíz |
| Muchos contratos NEW en el mismo cliente | Modo cliente | 🟡 Cuello de botella de onboarding → avisar a CS del cliente |

IPs compartidas entre cuentas:
```sql
SELECT ip, COUNT(DISTINCT user_id) users, COUNT(*) n, SUM(CASE WHEN login_state='SUCCESS' THEN 1 ELSE 0 END) ok,
       MIN(login_date), MAX(login_date)
FROM raw_data.raw_sec_user_login_history WHERE ip IN ('<ip1>','<ip2>') GROUP BY 1 ORDER BY users DESC;
```
Si confirmas una ola, cruza las cuentas afectadas (user_id → raw_person → contractor), suma sus saldos y lista las salidas de dinero posteriores al ataque para Risk. Para patrones de fraude por monto (por ejemplo, muchos envíos crypto idénticos el mismo día), agrupa por `des_transaction_type`, `amt_transaction`, día y estado.

Si no hay señales, dilo explícitamente: "Sin señales de riesgo".

## Procedimientos de CX (aplícalos en la respuesta sugerida)

Donde dice "escala a X": si quien usa la skill **es** X, ese paso es suyo (resolver, decidir o responder), no una escalación.

- **Bloqueo por intentos fallidos (`Login attempts exceeded`)**: primero **verificación con Veriff** (enviar el link), después desbloqueo y reset de contraseña. No te quedes solo en "usa Olvidé mi contraseña".
- **Accesos de terceros confirmados**: nunca digas "nadie entró a tu cuenta". Pide la línea oficial a Risk/Security antes de confirmar el acceso, el cierre de sesiones o los dispositivos vinculados.
- **Cancelar una transferencia aprobada** (APPROVED_RISK / ACTION_NEEDED): di que compliance ya la aprobó y que puede cancelarla en la app desde el detalle de la transacción. Hay que actuar rápido.
- **Cerrar o "borrar" la cuenta**: confirma saldo 0, sin tarjeta, sin contratos activos y sin transacciones pendientes. Aclara que el KYC y el historial se conservan por regulación: no se borran los datos. Escala a Tech con esta plantilla: CR, nombre, email, ticket, validaciones hechas y la solicitud (desactivar, bloquear acceso, conservar registros).
- **Cuentas duplicadas**: solo se permite una cuenta por persona. Recomienda conservar la viva y cerrar la otra. En una misma cuenta puede tener **Payroll Account y Personal Account**.
- **Preguntas que la data no responde** (país o entidad de origen de los pagos, comisiones de un proveedor): manda un acuse al cliente y abre una side conversation con Payouts/Payments con todo el contexto.

## Respuesta al cliente (tono y reglas de Ontop)

La respuesta sugerida sigue las mismas reglas que la skill `ontop-ticket-reply`. Si cambian, se cambian en las dos.

**Voz:** idioma del cliente (español con "tú", inglés o portugués). Cálida, directa y corta. Primero la respuesta, después el contexto. Si esperó o lo rebotaron entre áreas, una disculpa en una frase, sin excusas. Una sola pregunta por mensaje (o una lista corta numerada). Firma: "Equipo de Soporte de Ontop" / "Ontop Support Team" / "Equipe de Suporte Ontop" (opcional en WhatsApp/chat).

**Estructura:** saludo con el nombre → la respuesta o el estado con el dato verificado (fecha, monto, estado) → qué tiene que hacer el cliente, en pasos con los nombres exactos de los botones → qué sigue (sin fechas) → firma. Email 60–150 palabras; WhatsApp/chat 25–80.

**Nunca en el texto al cliente:**
- Nombres de proveedores, bancos o partners (aunque aparezcan en esta skill o en los datos): "nuestro aliado de pagos", "la red de la tarjeta", "nuestro aliado de verificación".
- ETAs o fechas que no podemos garantizar. Único plazo permitido: revisión de Paycheck Advance "hasta 48 horas hábiles".
- Estados o herramientas internas (APPROVED_RISK, status 5, side conversation, ADMV, Onsight, Nova, Hoop, Sumsub) → palabras simples ("en revisión", "retenido por una validación de seguridad").
- Números completos de cuenta, tarjeta, documento o wallet (máximo los últimos 4).
- Listas de países restringidos, sanciones u OFAC → "Este producto no está disponible para tu país de residencia."
- Future Fund como "seguro", "ahorro" o "interés", ni cálculos de rendimiento → "recompensas", "la tasa y los términos aparecen en la app".
- Cripto como alternativa para Ucrania.
- "Nadie entró a tu cuenta" si hubo acceso de terceros confirmado; acusar de fraude; culpar al cliente; prometer reembolsos, exoneraciones o excepciones que el área dueña no confirmó.

Si para responder hace falta romper una de estas reglas, no escribas alrededor: di qué falta y quién lo decide.

**Canal y estado (dilo en "Qué hacer"):** en WhatsApp/chat la respuesta sale desde Agent Workspace (una respuesta por API no le llega al cliente; pasadas 24 h sin mensaje del cliente, WhatsApp necesita plantilla). Después: *Solved* si no queda nada, *Pending* si le pediste algo, *Open/Internally raised* si tu equipo sigue trabajando. Si la categoría exige campos para resolver (Worker Email, Worker ID, Client ID, Type of Request), llénalos con los datos del perfil.

## Paso 6 — Formato de salida (hoja de vida)

```
## [Nombre] — [CR] · [semáforo 🟢/🟡/🟠/🔴 + una línea: qué pide y qué pasa]

**Identidad:** email · teléfono · país de residencia · Ontop tag · cuenta creada [fecha]
**Cuenta:** tipo · wallet USD/USDC · KYC · tarjeta física/virtual · saldo wallet / tarjeta · Future Funds (si aplica)
**Contrato(s):** tabla (CA · cliente · rol · estado · fechas · pago · último pago)
**Cliente:** nombre · CL · país · segmento CS
**Movimientos clave:** tabla corta (5–10 filas clave, hora Bogotá)
**Logins y dispositivos:** último login, dispositivo habitual, dispositivos nuevos, bloqueos
**Cuentas relacionadas:** duplicados (o "ninguna")
**Soporte:** ticket actual (canal, estado, horas sin respuesta, qué dice) + historial relevante

### ⚠️ Alertas
- …

### Qué hacer
1. Acción concreta para el agente
2. A quién escalar, con qué IDs (si quien usa la skill es del área dueña: qué decidir o hacer en su lado)
3. Respuesta sugerida al cliente, lista para pegar, en su idioma y con las reglas de "Respuesta al cliente"
4. Canal y estado: desde dónde enviarla y en qué estado dejar el ticket
```
Empieza por el veredicto, no por los datos. Sé breve: el agente tiene un ticket abierto. Si el caso muestra un problema sistémico (ola de fraude, cola de WhatsApp sin atender, loop de Aura, tickets que llegan vacíos), agrega al final una línea "Para el líder" con la oportunidad.

## Modo cliente (CL, nombre de empresa o email corporativo)

```sql
SELECT cod_client, des_legal_name, des_trade_name, des_legal_country, des_industry_type, des_onboarding_status,
       des_kyb_check_status, is_active_client, des_cs_segment, des_type_of_membership, is_premium, is_auto_charge,
       dat_creation, dat_client_admin_last_login, is_dummy_client
FROM process_data.client WHERE cod_client = '<CL>' OR des_legal_name ILIKE '%<nombre>%' OR des_trade_name ILIKE '%<nombre>%';

SELECT k.des_state, COUNT(*) n FROM process_data.contract k JOIN process_data.client cl ON cl.id_client = k.id_client
WHERE cl.cod_client = '<CL>' GROUP BY 1 ORDER BY 2 DESC;

-- Facturas recientes del cliente
SELECT i.des_invoice_state, COUNT(*) n, COUNT(DISTINCT i.cod_contract) contracts, SUM(i.amt_total) total, MAX(i.dat_client_paid) last_paid
FROM process_data.invoice i JOIN process_data.client cl ON cl.id_client = i.id_client
WHERE cl.cod_client = '<CL>' AND i.dat_issue >= DATEADD(day, -21, GETDATE()) GROUP BY 1;

-- Contratos activos recientes sin factura (sin subconsultas correlacionadas)
WITH k AS (SELECT k.cod_contract, k.dat_contract_start FROM process_data.contract k JOIN process_data.client cl ON cl.id_client = k.id_client
           WHERE cl.cod_client = '<CL>' AND k.des_state = 'ACTIVE' AND k.dat_contract_start >= '<fecha>'),
     inv AS (SELECT DISTINCT cod_contract FROM process_data.invoice)
SELECT k.dat_contract_start, COUNT(*) contracts, SUM(CASE WHEN inv.cod_contract IS NOT NULL THEN 1 ELSE 0 END) with_invoice
FROM k LEFT JOIN inv ON inv.cod_contract = k.cod_contract GROUP BY 1 ORDER BY 1;

-- Pagos del cliente (payment_transaction no tiene cod_contract: une por id_client)
SELECT p.id_payment, p.des_status, p.des_type, p.amt_total, p.dat_creation FROM process_data.payment_transaction p
JOIN process_data.client cl ON cl.id_client = p.id_client WHERE cl.cod_client = '<CL>' ORDER BY p.dat_creation DESC LIMIT 10;
```
Excluye clientes dummy (`is_dummy_client = 1`) y CL001511 (Ontop interno). Si el nombre no da resultados, reintenta con la primera palabra. `is_auto_charge = FALSE` significa que el cliente lanza cada pago a mano.

## Modo transacción (ID)

Busca en `process_data.wallet_transaction.id_transaction` (IDs ~7 dígitos), y si no aparece, en `id_provider_cashout`, `provider_id`, `id_original_wallet_transaction`, `associated_wallet_transaction_id`; luego en `process_data.card_transaction.id_transaction` y en `process_data.payment_transaction.id_payment`. Un número de 8 o más dígitos casi siempre es una referencia del banco o proveedor: pide al agente el CR o la captura del comprobante.

## Trampas conocidas del esquema

- `contractor` no tiene `des_state`; el estado del contrato está en `contract.des_state`.
- `cod_dial` es numérico: haz CAST antes de concatenar. `des_phone` no lleva el prefijo del país (en México y Argentina puede incluir el 9 o 1 de móvil).
- Montos: en `wallet_transaction`, salidas negativas y entradas positivas.
- `PROCESS_WITHDRAWAL` es un retiro normal (hay cientos al día), no una acción de Ontop. `REFUND_SENT_TO_BANK` es la devolución de un retiro FAILED. `COMPENSATION` es un abono manual de Ontop.
- Estados de retiro: COMPLETED, SENT (enviado, falta confirmación), IN_PROGRESS, UNDER_REVIEW (retenido por cumplimiento/riesgo), ACTION_NEEDED, APPROVED_RISK (aprobado por compliance y todavía cancelable), CANCELLED (no se debitó), FAILED.
- La tarjeta física sigue funcionando aunque la app esté bloqueada.
- `contractor_eurowallet` trae dirección, nacionalidad y vencimiento del documento; a veces el email aparece con prefijo `TEMP-` (cuenta en proceso de cambio de email → avisar a Onboarding).
- `contract.des_email_invitation` es una URL de signup con el email adentro.
- Las facturas `ONTF…` con `cod_contract` NULL son fees del cliente, no pagos a workers.
- `process_data.card_transaction` puede no tener registros de un worker aunque use la tarjeta.
- `vw_team_users` no tiene `des_email`; `payment_transaction` no tiene `cod_contract`; `invoice` usa `id_contractor` y `cod_contract`.
- Redshift no soporta algunas subconsultas correlacionadas (por ejemplo, EXISTS dentro de un CASE): usa CTE + LEFT JOIN.
- El ID de `raw_contractor` es el número del CR sin ceros (CR087305 → 87305).
- Si la consulta devuelve más de ~80 mil caracteres, se guarda en archivo: no hagas búsquedas con comodines en dominios grandes (ej. `%empresa.com`) sin LIMIT.