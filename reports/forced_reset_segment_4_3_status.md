# Forced password reset · Segmento 4.3 · Status al 13-nov-2026

**Envío:** 11-nov-2026 09:05 COL (Braze canvas "B2C | Password reset - Segment 4.3 | 11-11-2026") · **Objetivo:** 6.890 workers
**Corte de datos:** login history hasta 12-nov ~20:20 COL (≈ T+35 h); Zendesk/Aura hasta 12-nov ~20:30 COL. **No hay datos del 13-nov todavía.**

## 1. Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Workers alcanzados por Braze (email/push/in-app) | **6.687** (97,1 % de 6.890) |
| Reset completado (salieron de estado 6) | **1.414** (20,5 % de 6.890 · 21,1 % de alcanzados) |
| Intentaron entrar y siguen bloqueados (estado 6 con error 1016 / otro) | 95 (1,4 %) |
| Cuenta bloqueada (estado 4) tras el envío | 5 |
| Sin ningún intento de login desde el envío | **5.171** (77,3 % de alcanzados) |
| Comparación 4.2 a la misma hora (T+35 h) | 4.3: 20,5 % vs 4.2: 20,0 % → **mismo ritmo** |
| Tickets Zendesk de acceso atribuibles al 4.3 | **16 tickets / 15 casos** (0,22 % del segmento) |
| Uplift Zendesk "acceso" vs semana previa | **≈ 0 %** (45/día vs 45,4/día) |
| Uplift Aura FaceMatch (verificación selfie) | **+13 %** volumen/día; handoff 75 % vs 66 % |

**Lectura:** el envío no generó un pico de soporte medible en el agregado; el volumen de acceso se mantiene en el nivel de la semana previa (que ya incluía los envíos 2/3/4.1 y 4.2). El impacto se concentra en **pocos casos muy severos** (bloqueo tras selfie fallida, email rechazado en el reset, botón "Confirmar" en gris) con **SLA vencido** y riesgo de churn. La adopción depende casi por completo de la actividad previa: quien entró en los últimos 90 días completa (33 %); quien no, prácticamente no (0,7 %).

## 2. Resultado del segmento (Onsight)

**Fuente y proxy:** `raw_data.raw_sec_user` (estado de la cuenta; `state_id = 6` = reset forzado pendiente) + `raw_data.raw_sec_user_login_history` (logins reales: `SUCCESS`, `1016` = "debes resetear tu contraseña", `1003` = contraseña incorrecta, `1004` = intentos excedidos). No es un proxy de actividad (wallet/card): es el log de login. "Reset completado" = la cuenta ya no está en estado 6 (1.371 de 1.414 además ya tienen login exitoso posterior al envío).

### 2.1 Embudo

| Etapa | Workers | % de alcanzados |
|---|---:|---:|
| Alcanzados por Braze | 6.687 | 100 % |
| Email enviado / abierto | 6.269 / 2.642 | 94 % / 40 % |
| Push enviado / abierto | 5.231 / 462 | 78 % / 7 % |
| In-app vista / clic | 1.169 / 794 | 17 % / 12 % |
| Intentaron login desde el envío | 1.518 | 22,7 % |
| Reset completado (estado ≠ 6) | 1.414 | 21,1 % |
| — con ≥ 1 "contraseña incorrecta" después del reset | 163 | 2,4 % |
| Intentaron y siguen en estado 6 (atascados) | 95 | 1,4 % |

### 2.2 Por día (hora COL)

| Día | 1er login exitoso post-envío | 1er intento de login | 1er bloqueo 1016 |
|---|---:|---:|---:|
| 11-nov (desde 09:05) | 1.139 | 1.277 | 1.228 |
| 12-nov (hasta ~20:20) | 240 | 241 | 237 |
| 13-nov | sin datos aún | — | — |

El 82 % de los resets ocurrió el mismo día del envío (pico 09:00–10:00 COL: 634 usuarios distintos). El día 2 cae a ~1/5.

### 2.3 Por actividad previa y tipo de cuenta

| Tipo de cuenta | Login < 90 días | Workers | Reset hecho | % |
|---|---|---:|---:|---:|
| Payroll Account | Sí | 3.417 | 1.050 | 30,7 % |
| Global Account | Sí | 834 | 345 | 41,4 % |
| Payroll Account | No | 2.405 | 16 | 0,7 % |
| Global Account | No | 30 | 2 | 6,7 % |
| **Total con login < 90 d** | | **4.252** | **1.396** | **32,8 %** |
| **Total sin login en 90 d** | | **2.435** | **18** | **0,7 %** |

### 2.4 Top 10 países de residencia

| País | Workers | Reset hecho | % |
|---|---:|---:|---:|
| Colombia | 1.925 | 385 | 20,0 % |
| Argentina | 1.250 | 263 | 21,0 % |
| Venezuela | 931 | 273 | 29,3 % |
| Perú | 466 | 66 | 14,2 % |
| México | 398 | 74 | 18,6 % |
| Ecuador | 335 | 75 | 22,4 % |
| Brasil | 169 | 31 | 18,3 % |
| Guatemala | 166 | 17 | 10,2 % |
| Chile | 129 | 32 | 24,8 % |
| Nicaragua | 91 | 14 | 15,4 % |

### 2.5 Contexto de segmentos anteriores

| Segmento | Workers | Envío | Avance |
|---|---:|---|---|
| 1 | 1.122 | 28-oct | 49,5 % (tracker al 9-nov) |
| 2 | 1.315 | 2-nov | 16,3 % (tracker al 9-nov) |
| 3 | 2.476 | 2-nov | 41,5 % (tracker al 9-nov) |
| 4.1 | 5.760 | 2-nov | 40,3 % (tracker al 9-nov) |
| 4.2 | 7.357 | 9-nov | 20,0 % a T+35 h · 25,5 % hoy (login history) |
| **4.3** | **6.890** | **11-nov** | **20,5 % a T+35 h** |
| 4.4 (próximo) | 7.014 | 17-nov | — |

Pendientes en el tracker: 4.5 (773), 5 (1.107, 19-nov), 6 (8.266, 23-nov), 7.1–7.3 (6.851 / 8.297 / 9.314; token dinámico sin configurar), 8 (11.347), 9 (2.835).

## 3. Impacto en soporte

### 3.1 Zendesk · grupo Worker Support

Universo: 2.378 tickets creados desde el 4-nov. "Acceso" = categoría `cant_access_to_my_account`, token dinámico, troubleshooting de cuenta, cambio de email, cuenta hackeada, o palabras clave (contraseña, password, confirmar, acceso, login, bloque, token, FaceMatch, selfie) en el asunto/descripción.

| Periodo (COL) | Tickets WS / día | Acceso / día | `cant_access` / día |
|---|---:|---:|---:|
| Baseline 4–10 nov (7 días) | 280 | 45,4 | 20,3 |
| Baseline solo días hábiles (4,5,6,9,10) | 323 | 56,8 | 26,8 |
| 11–12 nov (post 4.3) | 208 | 45,0 | 21,0 |
| **Uplift vs baseline 7 días** | −26 % | **−1 %** | **+3 %** |

**Tickets de acceso desde el envío (11-nov 09:00 → 12-nov) por origen del worker (match por Worker ID / email contra los destinatarios Braze de cada canvas):**

| Origen | Tickets | Abiertos/pendientes |
|---|---:|---:|
| **Segmento 4.3** | **16** (15 casos únicos) | 12 |
| Segmento 4.2 | 7 | 4 |
| Segmentos 1–4.1 | 17 | 14 |
| No están en campañas de reset | 12 | 9 |
| Sin Worker ID ni email | 34 | 14 |
| **Total** | **86** | **53** |

- Workers del 4.3: 15 tickets en los 7 días previos (2,1/día) → 16 en ~1,5 días (≈ 10/día): **≈ 4–5x dentro del segmento**, pero en valor absoluto muy bajo.
- Por día (4.3): 11-nov 11 · 12-nov 5.
- Categoría (4.3): `cant_access_to_my_account` 13 · token dinámico 2 · otra 1.
- Estado (4.3): open 8 · pending 4 · solved 3 · closed 1.

**Problemas típicos (revisión de tickets del 4.3):**

| Ticket | Problema |
|---|---|
| 254645 | Botón "Confirmar" en gris al crear la nueva contraseña; Tech: requiere ≥ 7 caracteres, letra, número y carácter especial; el worker insiste en que cumplía. 2.º día sin acceso. |
| 254508 (+255337 duplicado vía tercero) | El reset rechaza el email; selfie no coincide; 2.º día bloqueado, SLA vencido, amenaza de mover al equipo fuera de Ontop. |
| 254789 | Selfie borrosa en el flujo forzado → la app no deja reintentar → "demasiados intentos"; el enlace Veriff no abre en su navegador. |
| 254496 | Tras la selfie la cuenta queda BLOQUEADA → requiere desbloqueo manual por especialista. |
| 255180 / 255475 | Token dinámico bloqueado al intentar completar el acceso. |

**¿El problema del "botón Confirmar" se repite?** Búsqueda full-text en Zendesk desde el 28-oct: "confirm button" → solo 254645; "botón de confirmar" → 1. Sin embargo, **27 tickets** mencionan "special character" (requisitos de contraseña), concentrados en los días de envío (2-nov, 9-nov, 11-nov). El síntoma exacto es aislado, pero la confusión sobre los requisitos es recurrente.

**Inconsistencia detectada:** en 254789 Aura indicó "mínimo **12** caracteres, un número y un carácter especial", mientras Tech confirma "mínimo **7** caracteres, una letra, un número y un carácter especial". Hay que unificar el mensaje.

**Operación:** varios casos del 4.3 con SLA vencido (`breached_ticket_support`), tickets sin asignar varias horas y el owner del dominio Acceso fuera de oficina hasta el 14-nov (cobertura reasignada dos veces el 12-nov).

### 3.2 Aura (Ada)

| Métrica (COL) | Baseline 4–10 nov | 11–12 nov | Cambio |
|---|---:|---:|---:|
| Conversaciones engaged / día (total) | 479 | 392 | −18 % |
| Topic "Account Management" / día | 104,6 | 110,0 | +5 % |
| ↳ handoff (1 − containment) | 73,1 % | 70,5 % | −2,6 pp |
| Tool "FaceMatch Initial" / día | 62,6 | 71,0 | **+13 %** |
| ↳ handoff (1 − containment) | 65,8 % | 75,4 %* | **+9,6 pp** |
| Tool "Password Reset" | 25 usos (4–6 nov) | 0 | sin uso desde el 7-nov |

\* Containment de las últimas 72 h es provisional en Ada.

- El tool "Password Reset" no se usa desde el 7-nov: el flujo actual de Aura para acceso es *selfie (FaceMatch) → confirmar bloqueo → handoff a especialista*, por eso el handoff es alto por diseño.
- En una muestra de 60 conversaciones con FaceMatch del 11–12-nov, ~1/3 eran de acceso ("no puedo resetear", "cuenta bloqueada tras selfie/intentos", "la app pide cambiar contraseña"); el resto usa FaceMatch para otras verificaciones (transferencias, cambio de email/teléfono), así que el tool no es un proxy puro de acceso.

## 4. Caveats de datos

1. **Lista del segmento:** el archivo de Drive es un .xlsx de 32 MB; las herramientas disponibles no permiten descargarlo (> 10 MB) y la lectura de texto se corta a ~1 M caracteres (sin filas del 4.3 en la pestaña Send_list). **Se usó como población a los destinatarios del canvas de Braze del 4.3** (6.687 = 97,1 % de 6.890). Faltan 203 workers que Braze no alcanzó o que no están identificados; si se agregan como "sin reset", la tasa queda en 20,5 %.
2. **user_id:** en el archivo, `user_id` = `raw_sec_user.id` (verificado: p. ej. el user_id de la fila de muestra del archivo coincide con el `sec_user` del mismo email), y el `external_id` de Braze es `ONTOP_<user_id>`. Match de los 6.687 contra `raw_sec_user` y `process_data.contractor`: **100 %**.
3. **Proxy:** se usó el log real de login (`raw_sec_user_login_history`) + estado de la cuenta (`state_id`), no actividad de wallet/card. Horas en UTC convertidas a COL (UTC−5); verificado con el pico de 1016 a las 14:00 UTC.
4. Los datos del 13-nov aún no existen (corte ≈ 12-nov 20:20 COL).
5. Atribución Zendesk: match por Worker ID o email; 34 tickets de acceso post-envío sin identificador no se pueden atribuir (el número del 4.3 es un mínimo). El baseline 4–10 nov ya incluye los efectos de 2/3/4.1 (2-nov) y 4.2 (9-nov).
6. Estado 2 sin login posterior (43 casos) puede ser reset por email sin login todavía o desfase entre tablas.

## 5. Recomendaciones para el segmento 4.4 (17-nov, 7.014 workers)

1. **Pre-aviso a soporte (T−1 día):** volumen esperado (≈ 1.400 resets, 15–20 tickets de acceso del segmento en 48 h), macro y checklist de desbloqueo; asegurar owner del dominio Acceso y cobertura en turno (09:00–12:00 COL concentra el pico).
2. **Respuesta canónica en Aura con las reglas reales de contraseña** (≥ 7 caracteres, ≥ 1 letra, ≥ 1 número, ≥ 1 carácter especial, p. ej. `! # $`) y corregir la respuesta que hoy dice "12 caracteres". Incluir: "si el botón Confirmar sigue en gris, la contraseña no cumple alguno de los requisitos".
3. **Producto/app:** mostrar los requisitos en la pantalla de nueva contraseña con validación en vivo (check por requisito) en lugar de solo deshabilitar "Confirmar"; permitir reintentar la selfie cuando sale borrosa sin bloquear la cuenta; revisar el caso "email no válido" en el reset.
4. **Envío escalonado:** partir el 4.4 en 2–3 olas (p. ej. workers con login < 90 d primero, que son quienes convierten; los inactivos casi no convierten y conviene un toque distinto) y evitar coincidir con días de payroll.
5. **Ruta rápida de desbloqueo:** casos "selfie fallida / intentos excedidos" con SLA corto y desbloqueo + reset por enlace seguro; macro para pedir captura de pantalla.
6. **Monitoreo:** tablero diario con (a) % estado 6 → 2, (b) usuarios con 1016 repetido sin completar (atascados), (c) 1004/estado 4 (bloqueados), (d) tickets `cant_access` y FaceMatch handoff vs baseline; alerta si los atascados superan el 2 % o los tickets de acceso > 2x baseline.
7. **Recordatorio a T+48 h** solo para quienes siguen en estado 6 y tuvieron login < 90 d (≈ 2.850 en el 4.3), y seguimiento a los 95 atascados del 4.3.
