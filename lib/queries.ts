export const KYB_ALL_SEGMENTS_SQL = `
-- ============================================================================
-- KYB Re-engagement Agent — ALL SEGMENTS (genera exactamente el CSV all_segments)
-- v2: fixes aplicados sobre la version original
--   1. fl CTE ahora excluye usuarios BORRADO/BLOQUEADO (igual que dashboard query)
--   2. Segmento B usa DATE_TRUNC('year', CURRENT_DATE) en vez de '2026-01-01' hardcoded
--   3. kyb_ttv removido de Segmento B (siempre era NULL por el filtro dat_first_kyb_verified IS NULL)
--   4. Segmento A ahora exige minimo 3 dias desde first_login (evita marcar como "stalled"
--      a alguien que se registro ayer)
--   5. c2.phone IS NOT NULL ahora es phone_available flag en vez de filtro duro,
--      para no perder contactos que solo tienen email
--   6. BRA y PRT ahora van a msg_language='EN' (antes PRT caia en el grupo ES-EU y
--      recibia espanol; no hay plantillas PT aprobadas todavia)
--
-- Cohorte: clientes con primer login 2026 YTD (first_login = MIN(su.creation_date)).
-- Segmento A = nunca enviaron KYB (login últimos 30 días, pero al menos 3 días de antigüedad).
-- Segmento B = enviaron KYB pero tienen doc request pendiente sin responder.
-- Teléfono: '+' || raw_country.phonecode || phone  (NO dial_code_id, que es un ID).
-- Identity: ONTOP_{sec_user_id} = Amplitude user_id.
-- Nota: pesada por las CTEs (fl / docsum). En Redshift corre OK; puede pasar el
--       límite de 30s de algunos conectores — correr directo en el warehouse.
-- ============================================================================
WITH fl AS (  -- primer login real = primer sec_user del team del cliente
  SELECT client.cod_client AS client_code, MIN(su.creation_date) AS first_login
  FROM process_data.client client
  LEFT JOIN raw_data.raw_team t        ON t.client_id = client.id_client
  LEFT JOIN raw_data.raw_team_person tp ON tp.team_id = t.id
  LEFT JOIN raw_data.raw_person p      ON p.id = tp.person_id
  LEFT JOIN raw_data.raw_sec_user su   ON p.user_id = su.id
  LEFT JOIN raw_data.raw_sec_user_state rsus ON su.state_id = rsus.id
  WHERE rsus.name NOT IN ('BORRADO','BLOQUEADO')  -- FIX 1: excluye usuarios borrados/bloqueados
     OR rsus.name IS NULL
  GROUP BY client.cod_client
),
docsum AS (  -- resumen de document requests por entidad (Segmento B)
  SELECT entity_id,
    SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) AS pending_docs,
    LISTAGG(CASE WHEN status='Pending' THEN document_title END, ' | ')
      WITHIN GROUP (ORDER BY created_at) AS pending_docs_list,
    MIN(CASE WHEN status='Pending' THEN created_at END) AS oldest_pending,
    MAX(CASE WHEN last_rn=1 THEN status END) AS last_request_status
  FROM (
    SELECT entity_id, status, document_title, created_at,
           ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY created_at DESC) AS last_rn
    FROM raw_data.raw_onboarding_document_request
  ) z
  GROUP BY entity_id
),
contacts AS (  -- contacto prioritario por cliente (Account Owner + WhatsApp)
  SELECT DISTINCT t.client_id, rsu.id AS user_id, rsu.email, p.first_name, p.last_name,
    COALESCE(wp.wsp_phone, '+' || rc_dial.phonecode || p.phone) AS phone,
    CASE WHEN cp.sec_user_id IS NOT NULL THEN 'Yes' ELSE 'No' END AS wsp_confirmed,
    CASE sur.role_id WHEN 10001 THEN 'Account Owner' WHEN 10002 THEN 'Payroll Manager'
                     WHEN 10003 THEN 'People Manager' ELSE 'Admin' END AS role,
    ROW_NUMBER() OVER (PARTITION BY t.client_id ORDER BY
      CASE sur.role_id WHEN 10001 THEN 1 ELSE 2 END,
      CASE WHEN wp.wsp_phone IS NOT NULL THEN 1 ELSE 2 END) AS priority
  FROM raw_data.raw_team t
  JOIN raw_data.raw_team_person tp ON tp.team_id = t.id
  JOIN raw_data.raw_person p       ON p.id = tp.person_id
  LEFT JOIN raw_data.raw_country rc_dial ON rc_dial.id = p.dial_code_id   -- <-- dial code real
  JOIN raw_data.raw_sec_user rsu   ON rsu.id = p.user_id
  LEFT JOIN raw_data.raw_sec_user_role sur ON sur.user_id = rsu.id
  LEFT JOIN (SELECT DISTINCT sec_user_id FROM raw_data.raw_sec_user_factor WHERE status='ACTIVE') cp
    ON cp.sec_user_id = rsu.id
  LEFT JOIN (
    SELECT user_id::bigint AS user_id, point_of_contact AS wsp_phone
    FROM (SELECT user_id, point_of_contact,
                 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn
          FROM raw_data.raw_notification_channel_config
          WHERE channel_type='WHATSAPP' AND enabled='true') t
    WHERE rn=1
  ) wp ON wp.user_id = rsu.id
  WHERE rsu.email NOT LIKE '%deleted%' AND rsu.email NOT LIKE '%getontop%'
    AND (rsu.state_id = 2 OR rsu.state_id IS NULL)
)
-- ===================== SEGMENTO A — Nunca enviaron KYB =====================
SELECT
  'A' AS segment, cl.acquisition_flow AS flow, cl.cod_client, cl.des_legal_name AS company,
  cl.cod_legal_country AS country_code, cl.des_legal_country AS country,
  CASE WHEN cl.cod_legal_country IN ('COL','VEN','ARG','MEX','PER','CHL','ECU','BOL','PRY','URY','GTM','HND','SLV','NIC','CRI','DOM','PAN','CUB') THEN 'ES'
       WHEN cl.cod_legal_country='ESP' THEN 'ES-EU'
       ELSE 'EN' END AS msg_language,  -- BRA and PRT both go EN until PT templates exist
  fl.first_login::date AS first_login,
  cl.dat_client_admin_last_login::date AS last_login,
  DATEDIFF(day, cl.dat_client_admin_last_login, CURRENT_TIMESTAMP::timestamp) AS days_since_last_login,
  NULL::date AS kyb_submitted, NULL::date AS kyb_check, NULL::int AS kyb_ttv, NULL::int AS days_since_kyb_submit,
  cl.des_kyb_check_status AS kyb_status, NULL::varchar AS last_request_status,
  NULL::int AS pending_docs, NULL::varchar AS pending_docs_list, NULL::int AS days_doc_pending,
  c2.first_name, c2.last_name, c2.email, c2.role, c2.phone, c2.wsp_confirmed,
  CASE WHEN c2.phone IS NOT NULL THEN 'Yes' ELSE 'No' END AS phone_available,  -- FIX 5
  'ONTOP_' || c2.user_id::varchar AS amplitude_user_id
FROM process_data.client cl
LEFT JOIN fl       ON fl.client_code = cl.cod_client
LEFT JOIN contacts c2 ON c2.client_id = cl.id_client AND c2.priority = 1
WHERE cl.dat_first_kyb IS NULL
  AND cl.des_kyb_check_status IS NULL                 -- nunca inició KYB
  AND fl.first_login >= CURRENT_DATE - 30             -- login en los últimos 30 días
  AND fl.first_login <= CURRENT_DATE - 3              -- FIX 4: al menos 3 días de antigüedad
  AND COALESCE(cl.is_dummy_client,0) <> 1
  AND cl.des_legal_name NOT ILIKE '%DELETED%' AND cl.des_legal_name NOT ILIKE '%test%'
  AND cl.cod_client NOT IN ('CL001511','CL000035','CL001703','CL000108','CL004482')
  AND cl.acquisition_flow IN ('Open page','Invitation Link')
  AND (c2.email IS NOT NULL OR c2.phone IS NOT NULL)  -- FIX 5: al menos un canal de contacto

UNION ALL

-- ============ SEGMENTO B — KYB enviado, doc request pendiente sin responder ============
SELECT
  'B' AS segment, cl.acquisition_flow AS flow, cl.cod_client, cl.des_legal_name AS company,
  cl.cod_legal_country AS country_code, cl.des_legal_country AS country,
  CASE WHEN cl.cod_legal_country IN ('COL','VEN','ARG','MEX','PER','CHL','ECU','BOL','PRY','URY','GTM','HND','SLV','NIC','CRI','DOM','PAN','CUB') THEN 'ES'
       WHEN cl.cod_legal_country='ESP' THEN 'ES-EU'
       ELSE 'EN' END AS msg_language,  -- BRA and PRT both go EN until PT templates exist
  fl.first_login::date AS first_login,
  cl.dat_client_admin_last_login::date AS last_login,
  DATEDIFF(day, cl.dat_client_admin_last_login, CURRENT_TIMESTAMP::timestamp) AS days_since_last_login,
  cl.dat_first_kyb::date AS kyb_submitted,
  cl.dat_last_kyb_check::date AS kyb_check,
  NULL::int AS kyb_ttv,  -- FIX 3: removido, siempre era NULL (dat_first_kyb_verified IS NULL por WHERE)
  DATEDIFF(day, cl.dat_first_kyb, CURRENT_TIMESTAMP::timestamp) AS days_since_kyb_submit,
  cl.des_kyb_check_status AS kyb_status,
  ds.last_request_status, ds.pending_docs, ds.pending_docs_list,
  DATEDIFF(day, ds.oldest_pending, CURRENT_TIMESTAMP::timestamp) AS days_doc_pending,
  c2.first_name, c2.last_name, c2.email, c2.role, c2.phone, c2.wsp_confirmed,
  CASE WHEN c2.phone IS NOT NULL THEN 'Yes' ELSE 'No' END AS phone_available,  -- FIX 5
  'ONTOP_' || c2.user_id::varchar AS amplitude_user_id
FROM process_data.client cl
LEFT JOIN fl       ON fl.client_code = cl.cod_client
LEFT JOIN raw_data.raw_entity re ON re.id = cl.id_entity
LEFT JOIN docsum ds ON ds.entity_id = re.id
LEFT JOIN contacts c2 ON c2.client_id = cl.id_client AND c2.priority = 1
WHERE cl.dat_first_kyb >= DATE_TRUNC('year', CURRENT_DATE)   -- FIX 2: dinámico en vez de '2026-01-01'
  AND fl.first_login >= DATE_TRUNC('year', CURRENT_DATE)
  AND cl.dat_first_kyb_verified IS NULL                          -- todavía no verificado
  AND cl.des_kyb_check_status IN ('REVIEW_NEEDED','IN_PROCESS')  -- en revisión
  AND COALESCE(ds.pending_docs,0) > 0                            -- tiene doc pendiente
  AND COALESCE(cl.is_dummy_client,0) <> 1
  AND cl.des_legal_name NOT ILIKE '%DELETED%' AND cl.des_legal_name NOT ILIKE '%test%'
  AND cl.cod_client NOT IN ('CL001511','CL000035','CL001703','CL000108','CL004482')
  AND cl.acquisition_flow IN ('Open page','Invitation Link')
  AND (c2.email IS NOT NULL OR c2.phone IS NOT NULL)  -- FIX 5: al menos un canal de contacto

ORDER BY segment ASC, days_since_last_login ASC
`
