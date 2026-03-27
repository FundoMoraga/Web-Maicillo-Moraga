import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { CosmosClient } from '@azure/cosmos';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT || 10000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_AI_API_KEY =
  readEnv('Google_API_KEY') ||
  readEnv('GOOGLE_AI_API_KEY') ||
  readEnv('GEMINI_API_KEY') ||
  readEnv('GOOGLE_API_KEY');
const RESEND_API_KEY = readEnv('RESEND_API_KEY');
const RESERVATION_NOTIFY_EMAIL = readEnv('RESERVATION_NOTIFY_EMAIL') || 'contacto@fundomoraga.com';
const RESERVATION_FROM_EMAIL = readEnv('RESERVATION_FROM_EMAIL') || 'reservas@fundomoraga.com';

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const ALLOWED_ORIGINS = [
  'https://fundomoraga.com',
  'https://www.fundomoraga.com',
  'https://web-fundo-moraga.onrender.com',
  'https://maicillomoraga.com',
  'https://www.maicillomoraga.com',
  ...(process.env.CORS_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean),
];

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
  }),
);

const hasOpenAI = Boolean(OPENAI_API_KEY);
const openai = hasOpenAI ? new OpenAI({ apiKey: OPENAI_API_KEY, timeout: 30000 }) : null;
const googleAI = GOOGLE_AI_API_KEY ? new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY }) : null;

const COSMOS_ENDPOINT = readEnv('COSMOS_ENDPOINT');
const COSMOS_KEY = readEnv('COSMOS_KEY');
const COSMOS_CONNECTION_STRING = readEnv('COSMOS_CONNECTION_STRING');
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'chatbot';
const COSMOS_CONTAINER = process.env.COSMOS_CONTAINER || 'conversations';

let cosmosContainer = null;
const reservationState = new Map();

const REQUIRED_RESERVATION_FIELDS = [
  'nombre',
  'contacto',
  'fecha',
  'vehiculos',
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isReservationIntent(text) {
  const normalized = normalizeText(text);
  return /(reserv|agend|cupo|fecha|visita|ir al fundo|quiero ir)/.test(normalized);
}

function isAffirmative(text) {
  const normalized = normalizeText(text);
  return /^(si|sip|sipo|dale|ok|confirmo|de acuerdo|yes|bueno|perfecto)\b/.test(normalized);
}

function isNegative(text) {
  const normalized = normalizeText(text);
  return /^(no|nop|negativo|cancel|mejor no)\b/.test(normalized);
}

function parseReservationFields(text) {
  const parsed = {};
  const trimmed = String(text || '').trim();

  const nameMatch = trimmed.match(/(?:mi nombre es|soy|nombre[:\s]+)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{3,60})/i);
  if (nameMatch?.[1]) {
    parsed.nombre = nameMatch[1].trim().replace(/\s+/g, ' ');
  }

  const phoneMatch = trimmed.match(/(?:\+?56\s?)?(9\d{8})|(?:\+?56\s?)?(2\d{8})/);
  if (phoneMatch?.[0]) {
    parsed.contacto = phoneMatch[0].replace(/\s+/g, '');
  }

  const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch?.[0] && !parsed.contacto) {
    parsed.contacto = emailMatch[0].toLowerCase();
  }

  const dateMatch = trimmed.match(/(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\d{1,2}\s+de\s+[A-Za-záéíóúñ]+(?:\s+de\s+\d{4})?|hoy|mañana|este\s+fin\s+de\s+semana)/i);
  if (dateMatch?.[1]) {
    parsed.fecha = dateMatch[1].trim();
  }

  const vehicleMatch = trimmed.match(/(\d{1,2})\s*(?:vehiculos|vehiculo|autos|auto|camionetas|camioneta|motos|moto)/i);
  if (vehicleMatch?.[1]) {
    parsed.vehiculos = Number(vehicleMatch[1]);
  }

  const serviceMatch = normalizeText(trimmed);
  if (/grupo privado|privado/.test(serviceMatch)) {
    parsed.modalidad = 'grupo_privado_fin_de_semana';
  } else if (/regular|entrada normal|dia normal/.test(serviceMatch)) {
    parsed.modalidad = 'ingreso_regular';
  }

  return parsed;
}

function getMissingReservationField(state) {
  return REQUIRED_RESERVATION_FIELDS.find((key) => !state[key]);
}

function getReservationQuestion(field) {
  switch (field) {
    case 'nombre':
      return 'Buena, partamos con tu nombre completo para dejar la reserva lista.';
    case 'contacto':
      return 'Perfecto. Ahora compárteme tu WhatsApp/teléfono o correo de contacto, porfa.';
    case 'fecha':
      return 'Buenísimo. ¿Para qué fecha quieres venir?';
    case 'vehiculos':
      return '¿Con cuántos vehículos vendrían? Así calculo el total al tiro.';
    default:
      return 'Cuéntame ese dato y seguimos con la reserva.';
  }
}

function buildReservationSummary(state) {
  const vehiculos = Number(state.vehiculos || 0);
  const total = vehiculos > 0 ? vehiculos * 15000 : 0;
  const modalidad = state.modalidad === 'grupo_privado_fin_de_semana'
    ? 'Grupo privado fin de semana (desde $250.000 CLP)'
    : 'Ingreso regular';

  const totalText = state.modalidad === 'grupo_privado_fin_de_semana'
    ? 'Valor referencial para apertura de grupo privado fin de semana: $250.000 CLP.'
    : `Total estimado por ingreso vehicular: $${total.toLocaleString('es-CL')} CLP.`;

  return [
    'Te dejo el resumen de tu solicitud:',
    `- Nombre: ${state.nombre}`,
    `- Contacto: ${state.contacto}`,
    `- Fecha solicitada: ${state.fecha}`,
    `- Vehículos: ${vehiculos}`,
    `- Modalidad: ${modalidad}`,
    totalText,
    'Si está todo OK, responde "confirmo" y la dejo concretada.',
  ].join('\n');
}

async function saveReservation({ userId, conversationId, reservation }) {
  if (!cosmosContainer) return;
  await cosmosContainer.items.create({
    id: `reservation_${conversationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'reservation',
    userId,
    conversationId,
    reservation,
    timestamp: new Date().toISOString(),
  });
}

async function sendReservationEmail({ userId, conversationId, reservation }) {
  if (!RESEND_API_KEY) return;

  const vehiculos = Number(reservation?.vehiculos || 0);
  const totalRegular = vehiculos > 0 ? vehiculos * 15000 : 0;
  const isPrivate = reservation?.modalidad === 'grupo_privado_fin_de_semana';
  const totalText = isPrivate
    ? 'Apertura fin de semana grupo privado: $250.000 CLP'
    : `Total estimado ingreso vehicular: $${totalRegular.toLocaleString('es-CL')} CLP`;

  const text = [
    'Nueva reserva confirmada en Fundo Moraga',
    '',
    `Usuario: ${userId}`,
    `Conversación: ${conversationId}`,
    `Nombre: ${reservation?.nombre || 'No informado'}`,
    `Contacto: ${reservation?.contacto || 'No informado'}`,
    `Fecha solicitada: ${reservation?.fecha || 'No informada'}`,
    `Vehículos: ${vehiculos || 0}`,
    `Modalidad: ${reservation?.modalidad || 'ingreso_regular'}`,
    totalText,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESERVATION_FROM_EMAIL,
        to: [RESERVATION_NOTIFY_EMAIL],
        subject: `Nueva reserva confirmada - ${reservation?.nombre || userId}`,
        text,
      }),
    });

    if (!response.ok) {
      const reason = await response.text();
      console.warn('reservation_email_failed', response.status, reason);
    }
  } catch (error) {
    console.warn('reservation_email_error', error?.message || error);
  }
}

async function handleReservationFlow({ userId, message, conversationId }) {
  const existing = reservationState.get(userId);
  const hasIntent = isReservationIntent(message);

  if (!existing && !hasIntent) return null;

  const state = existing || {
    status: 'collecting',
    nombre: '',
    contacto: '',
    fecha: '',
    vehiculos: null,
    modalidad: 'ingreso_regular',
  };

  const parsed = parseReservationFields(message);
  Object.assign(state, parsed);

  if (state.status === 'awaiting_confirmation') {
    if (isAffirmative(message)) {
      state.status = 'completed';
      reservationState.delete(userId);
      await saveReservation({ userId, conversationId, reservation: state });
      await sendReservationEmail({ userId, conversationId, reservation: state });
      return 'Listo, reserva concretada. Quedó registrada con esos datos y te van a contactar para confirmar disponibilidad final. Si quieres, también te ayudo con recomendaciones de pistas según nivel de manejo.';
    }

    if (isNegative(message)) {
      state.status = 'collecting';
      reservationState.set(userId, state);
      return 'Dale, la ajustamos. Dime qué dato quieres cambiar y lo actualizo al tiro.';
    }

    reservationState.set(userId, state);
    return '¿La confirmamos? Si está todo correcto, respóndeme "confirmo". Si no, dime qué dato cambiamos.';
  }

  const missingField = getMissingReservationField(state);
  if (missingField) {
    reservationState.set(userId, state);
    return getReservationQuestion(missingField);
  }

  state.status = 'awaiting_confirmation';
  reservationState.set(userId, state);
  return buildReservationSummary(state);
}

async function initCosmos() {
  if (!(COSMOS_CONNECTION_STRING || (COSMOS_ENDPOINT && COSMOS_KEY))) return;

  const client = COSMOS_ENDPOINT && COSMOS_KEY
    ? new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
    : new CosmosClient(COSMOS_CONNECTION_STRING);

  const { database } = await client.databases.createIfNotExists({ id: COSMOS_DATABASE });
  const { container } = await database.containers.createIfNotExists({
    id: COSMOS_CONTAINER,
    partitionKey: { paths: ['/userId'] },
  });
  cosmosContainer = container;
}

async function saveMessage({ userId, role, message, conversationId }) {
  if (!cosmosContainer) return;
  const now = new Date().toISOString();
  await cosmosContainer.items.create({
    id: `${conversationId}_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    conversationId,
    role,
    message,
    timestamp: now,
  });
}

async function getRecentMessages({ userId, limit = 12 }) {
  if (!cosmosContainer) return [];
  const querySpec = {
    query: `SELECT TOP @limit c.role, c.message, c.timestamp
            FROM c
            WHERE c.userId = @userId
            ORDER BY c.timestamp DESC`,
    parameters: [
      { name: '@userId', value: userId },
      { name: '@limit', value: limit },
    ],
  };

  const { resources } = await cosmosContainer.items
    .query(querySpec, { partitionKey: userId })
    .fetchAll();
  return resources.reverse();
}

function getConversationId(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `web_${userId}_${today}`;
}

const SYSTEM_PROMPT = `Eres Hernando, anfitrión digital de Fundo Moraga.
Responde en español chileno moderado, cálido y profesional.
Objetivo: ayudar en reservas, rutas, precios, horarios y servicios.

DATOS OFICIALES (siempre vigentes salvo actualización explícita):
1) El ingreso por vehículo es de $15.000 CLP.
2) Horario regular: 9:00 AM a 17:30 horas.
3) Fines de semana: se abre previo aviso de “Fecha Libre”.
4) “Fecha Libre” es un día determinado al azar en que abrimos el fin de semana, ya sea sábado o domingo.
5) Apertura para grupos privados el fin de semana: $250.000 CLP.
6) Valores para producciones o eventos: consultar a contacto@fundomoraga.com.
7) De momento no contamos con actividades de cabalgata, trekking ni hospedaje.
8) Tenemos más de 15 pistas offroad, de todas las dificultades; combinándolas, pueden multiplicarse por cientos.

Reglas de respuesta:
- Nunca contradigas estos datos oficiales.
- No inventes datos adicionales.
- Si algo no está definido, dilo claramente y ofrece contacto por correo cuando corresponda.
- Si preguntan por servicios no disponibles, indícalo con claridad y ofrece alternativas dentro de la experiencia offroad.
- Habla natural chileno: cercano, claro y respetuoso; usa expresiones locales suaves como "bacán", "dale", "al tiro" solo cuando calce.
- Si la persona quiere reservar, guía paso a paso para completar: nombre, contacto, fecha y cantidad de vehículos.
- Antes de cerrar una reserva, entrega un resumen y pide confirmación explícita.`;

const MAICILLO_SYSTEM_PROMPT = `Eres Hernando de Maicillo Moraga.
Responde en español chileno moderado, cálido y profesional.
Tu foco principal es orientar sobre maicillo y su implementación técnica: uso recomendado, cálculo de volumen, espesores, base, compactación, mantenimiento, cobertura logística y coordinación de pedido.

DATOS OFICIALES MAICILLO MORAGA (usar como referencia principal)
1) Productos oficiales:
  - Maicillo Fino (arneado): 0.5 a 8 mm, densidad referencial 1.60 t/m3, espesor sugerido 5-8 cm.
  - Maicillo Grueso: 8 a 20 mm, densidad referencial 1.70 t/m3, espesor sugerido 8-15 cm.
  - Piedras Decorativas de Maicillo: 20 a 60 mm, densidad referencial 1.55 t/m3, espesor sugerido 4-8 cm.
2) Precios oficiales (solo m3 cargado en cantera, sin despacho):
  - Todos los precios son netos y van + IVA (19%).
  - Maicillo Fino (arneado): $7.000 por m3 + IVA.
  - Maicillo Grueso: $5.000 por m3 + IVA.
  - Piedras decorativas: cotización caso a caso.
  - Envíos a otras comunas: caso a caso.
  - Despachos y volúmenes muy grandes (eventuales rebajas): caso a caso al WhatsApp +56 9 9445 5713.
3) Usos principales:
  - Fino: senderos, jardinería, decoración y terminación final de caminos en parcelas.
  - Grueso: base drenante y zonas de mayor tránsito.
  - Decorativas: terminación ornamental.
4) FAQ técnica:
  - Diferencia fino vs grueso: fino = mejor terminación y compactación superficial; grueso = mayor drenaje como subcapa/base.
  - Espesor sendero peatonal: 5-8 cm sobre subbase preparada; con mayor tráfico o terreno blando, subir a 8-10 cm con base estabilizada.
  - Control de polvo: compactación inicial correcta, riego de asentamiento y mantención liviana; en zonas ventosas considerar refuerzo granular o geotextil.
5) Recetas por aplicación:
  - Sendero: Fino, 5-8 cm, subbase compactada, placa vibratoria ligera 2-3 pasadas.
  - Estacionamiento: Grueso + terminación Fino, 10-15 cm (base) + 3-4 cm (terminación), subbase estabilizada con geotextil recomendado.
  - Jardín: Fino, 4-6 cm, terreno nivelado con control de maleza, compactación suave solo en senderos internos.
  - Drenaje: Grueso, 8-12 cm, cama filtrante con pendiente de evacuación, asentamiento sin sellar poros.
  - Decoración: Piedras Decorativas, 4-8 cm, malla anti-maleza y borde de confinamiento, no compactar.
6) Cobertura logística activa (referencial):
  - Lampa: 4-12 horas, mínimo 3 m3.
  - Colina: 6-18 horas, mínimo 3 m3.
  - Quilicura: 6-18 horas, mínimo 3 m3.
  - Pudahuel: 8-24 horas, mínimo 4 m3.
  - Huechuraba: 8-24 horas, mínimo 4 m3.
  - Vitacura, Las Condes, Providencia, Santiago: 12-24 horas, mínimo 4 m3.
  - La Florida: 18-36 horas, mínimo 5 m3.
  - Puente Alto: 24-48 horas, mínimo 6 m3.
  - Otras comunas: cobertura por evaluación especial.
7) Ahorro hídrico en cobertura de maicillo: potencial cercano a 40% versus suelo desnudo (según simulador del sitio).

PROTOCOLO DE RESPUESTA
- Preséntate como "Hernando de Maicillo Moraga" cuando corresponda.
- Responde con foco técnico y práctico, evitando relleno.
- Si piden recomendación, primero valida: uso, superficie (m2), espesor (cm), comuna y fecha estimada.
- Si piden cálculo, aplica este flujo:
  1) volumen teórico m3 = superficie m2 x espesor(m)/100;
  2) volumen recomendado = volumen teórico x 1.12 (merma técnica 12%);
  3) tonelaje estimado = volumen recomendado x densidad del producto.
- Cuando aplique, entrega resultado en pasos y cierra con siguiente acción concreta (ej. validar comuna o coordinar despacho).

RESTRICCIONES CRITICAS
- No inventes precios, stock ni ventanas de despacho fuera de la tabla oficial.
- Indica siempre que el precio oficial es por m3 cargado en cantera, sin despacho y más IVA (19%).
- Si piden despacho, otras comunas, piedras decorativas o rebaja por gran volumen, deriva explícitamente a revisión caso a caso al WhatsApp +56 9 9445 5713.
- Si un dato no está definido, dilo explícitamente y ofrece escalamiento por WhatsApp (+56 9 9445 5713) o correo (contacto@fundomoraga.com).
- Mantén consistencia absoluta con estos datos oficiales.`;

function isMaicilloRequest(req) {
  const site = String(req.body?.site || '').toLowerCase().trim();
  if (site === 'maicillo') {
    return true;
  }

  const origin = String(req.get('origin') || '').toLowerCase();
  const referer = String(req.get('referer') || '').toLowerCase();
  const host = String(req.get('host') || '').toLowerCase();
  const source = `${origin} ${referer} ${host}`;

  return (
    source.includes('maicillomoraga.com') ||
    source.includes('www.maicillomoraga.com') ||
    source.includes('fundo-moraga-maicillo-static.onrender.com')
  );
}

function getInitGreeting(req, hasHistory) {
  const isMaicillo = isMaicilloRequest(req);

  if (hasHistory) {
    return isMaicillo
      ? '¡Hola de nuevo! Soy Hernando de Maicillo Moraga. ¿En qué te ayudo hoy?'
      : '¡Hola de nuevo! Soy Hernando. ¿En qué te ayudo hoy?';
  }

  return isMaicillo
    ? '¡Hola! Soy Hernando de Maicillo Moraga. Te puedo ayudar con rendimientos por m2, espesores recomendados, instalación y coordinación de pedidos.'
    : '¡Hola! Soy Hernando de Fundo Moraga. Te puedo ayudar con reservas, precios, rutas y dudas de la experiencia off-road.';
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'fundo-moraga-ai-chat-service',
    model: OPENAI_MODEL,
    openaiConfigured: hasOpenAI,
    cosmosConfigured: Boolean(cosmosContainer),
    cosmosEnv: {
      hasEndpoint: Boolean(COSMOS_ENDPOINT),
      hasKey: Boolean(COSMOS_KEY),
      hasConnectionString: Boolean(COSMOS_CONNECTION_STRING),
      database: COSMOS_DATABASE,
      container: COSMOS_CONTAINER,
    },
  });
});

app.post('/chat/init', async (req, res) => {
  const userId = String(req.body?.user_id || '').trim() || 'web_guest';

  try {
    const history = await getRecentMessages({ userId, limit: 1 });
    return res.json({ greeting: getInitGreeting(req, history.length > 0) });
  } catch {
    return res.json({ greeting: getInitGreeting(req, false) });
  }
});

app.post('/chat', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: 'OPENAI_API_KEY no configurada en el servicio API.' });
  }

  const userId = String(req.body?.user_id || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!userId || !message) {
    return res.status(400).json({ error: 'user_id y message son obligatorios.' });
  }

  try {
    const isMaicillo = isMaicilloRequest(req);
    const conversationId = getConversationId(userId);
    if (!isMaicillo) {
      const reservationReply = await handleReservationFlow({ userId, message, conversationId });
      if (reservationReply) {
        await saveMessage({ userId, role: 'user', message, conversationId });
        await saveMessage({ userId, role: 'assistant', message: reservationReply, conversationId });
        return res.json({ response: reservationReply, model: `${OPENAI_MODEL}-reservation-flow` });
      }
    }

    const history = await getRecentMessages({ userId, limit: 10 });

    const input = [
      { role: 'system', content: isMaicillo ? MAICILLO_SYSTEM_PROMPT : SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.message })),
      { role: 'user', content: message },
    ];

    const completion = await openai.responses.create({
      model: OPENAI_MODEL,
      input,
      temperature: 0.5,
    });

    const botReply =
      completion.output_text?.trim() ||
      (isMaicillo
        ? 'Gracias por tu mensaje. Si quieres, te ayudo a definir producto, espesor y volumen para tu proyecto.'
        : 'Gracias por tu mensaje. ¿Quieres que te ayude con una reserva?');

    await saveMessage({ userId, role: 'user', message, conversationId });
    await saveMessage({ userId, role: 'assistant', message: botReply, conversationId });

    return res.json({ response: botReply, model: OPENAI_MODEL });
  } catch (error) {
    console.error('chat_error', error?.message || error);
    return res.status(500).json({
      error: 'No pude responder en este momento. Intenta nuevamente en unos segundos.',
    });
  }
});

const LANDSCAPE_ARCHITECT_BASE_PROMPT =
  'Act as a professional exterior landscape architect and photorealistic photo editor. ' +
  'Always improve the provided photograph of a home exterior space (garden, pathway, patio, driveway, courtyard or similar) ' +
  'with a refined landscape-design criterion. ' +
  'When appropriate, generate a dry-garden style proposal that clearly reads as a designed garden intervention while fully respecting the original photo composition and scene structure. ' +
  'Use visual standards from high-end professional landscaping publications and portfolio-style imagery (similar to elite references seen in professional image searches), ' +
  'focusing on premium composition, material harmony, precise geometry, and polished finish quality. ' +
  'Preserve the original composition, perspective, camera angle, architecture and existing structural elements of the photo. ' +
  'Maicillo must always be the protagonist improvement element, clearly visible and intentionally designed: ' +
  'use maicillo with a warm yellow/ochre tone as the principal ground treatment, creating elegant dry gardens, ' +
  'well-leveled and aesthetic paths, clean edge definitions, controlled transitions between surfaces, and coherent high-end exterior finishes. ' +
  'Prioritize realistic construction cues: proper compaction look, consistent granulometry appearance, drainage-friendly layout, and refined landscape zoning. ' +
  'You may draw inspiration from professional references conceptually, but do not replicate any specific copyrighted composition or branded style verbatim. ' +
  'The output must look like a realistic finished photograph, never an illustration. ' +
  'Do not add text, logos, watermarks or graphic overlays.';

const VISUALIZE_PROMPT =
  `${LANDSCAPE_ARCHITECT_BASE_PROMPT} ` +
  'Edit the supplied photo instead of reimagining the scene from scratch. ' +
  'Keep the original architecture, walls, windows, doors, stairs, built structures, framing, lens perspective and spatial layout intact. ' +
  'Only introduce plausible maicillo surfacing, refined edge treatment, cleanup, and subtle landscape improvements that could realistically be built in the same exact space.';

const TEXT_TO_IMAGE_BASE_PROMPT =
  'Act as a premium landscape visualization director and photorealistic image generator for Maicillo Moraga. ' +
  'Create a realistic concept image of an exterior project based on the user brief. ' +
  'The result must depict a buildable outdoor space where maicillo is the protagonist material, with a warm yellow/ochre tone, clean borders, coherent planting, elegant geometry, and high-end finish quality. ' +
  'Interpret the brief as a landscaping concept for a patio, garden, pathway, courtyard, access road, or similar exterior area. ' +
  'If the user asks for something unrelated to exterior landscaping, redirect it into a plausible outdoor maicillo design concept instead of following it literally. ' +
  'The image must look like a finished professional photograph, not an illustration, collage, poster, or UI mockup. ' +
  'Do not add text, logos, watermarks, split screens, labels, or graphic overlays.';

app.post('/api/visualize', async (req, res) => {
  if (!googleAI) {
    return res.status(500).json({
      error: 'Servicio de visualización no configurado. Falta GOOGLE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY.',
    });
  }

  const { imageBase64, mimeType, prompt } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'Se requiere imageBase64.' });
  }

  const safePrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 500) : '';

  const safeMime = ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
    ? mimeType
    : 'image/jpeg';

  // Validate rough size (base64 of 10MB image ≈ 13.6M chars)
  if (imageBase64.length > 14_000_000) {
    return res.status(413).json({ error: 'La imagen es demasiado grande. Usa una imagen de hasta 10 MB.' });
  }

  const modelName = 'gemini-3.1-flash-image-preview';

  try {
    const response = await googleAI.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: safePrompt
                ? `${VISUALIZE_PROMPT} Additional user design guidance: ${safePrompt}`
                : VISUALIZE_PROMPT,
            },
            { inlineData: { mimeType: safeMime, data: imageBase64 } },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = [...parts].reverse().find((part) => (
      part?.inlineData?.data &&
      String(part.inlineData.mimeType || '').startsWith('image/')
    ));

    if (!imagePart?.inlineData?.data) {
      const reason = response?.candidates?.[0]?.finishReason || response?.promptFeedback?.blockReason || 'sin imagen';
      return res.status(502).json({
        error: `No se pudo generar la imagen con ${modelName} (${reason}). Intenta con otra foto.`,
      });
    }

    return res.json({
      resultBase64: imagePart.inlineData.data,
      resultMime: imagePart.inlineData.mimeType || 'image/png',
    });
  } catch (error) {
    const msg = error?.message || String(error || 'unknown_error');
    console.error(`gemini_visualize_error model=${modelName}`, msg);
    const status = /429|quota|rate/i.test(msg) ? 429 : 502;
    return res.status(status).json({
      error: status === 429
        ? 'Límite de la API alcanzado. Intenta en unos minutos.'
        : `Error al generar la imagen con ${modelName}. ${msg}`,
    });
  }
});

app.post('/api/generar-imagen', async (req, res) => {
  if (!googleAI) {
    return res.status(500).json({
      error: 'Servicio no configurado. Falta GEMINI_API_KEY, GOOGLE_AI_API_KEY o GOOGLE_API_KEY.',
    });
  }

  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Debes enviar un prompt.' });
  }

  const enforcedPrompt = `${TEXT_TO_IMAGE_BASE_PROMPT}\n\nProject brief from user: ${prompt}`;

  const modelName = 'gemini-3.1-flash-image-preview';

  try {
    const response = await googleAI.models.generateContent({
      model: modelName,
      contents: enforcedPrompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = [...parts].reverse().find((part) => (
      part?.inlineData?.data &&
      String(part.inlineData.mimeType || '').startsWith('image/')
    ));

    if (!imagePart?.inlineData?.data) {
      const reason = response?.candidates?.[0]?.finishReason || response?.promptFeedback?.blockReason || 'sin imagen';
      return res.status(502).json({
        error: `El modelo ${modelName} respondió sin imagen (${reason}).`,
      });
    }

    return res.json({
      imagen: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/jpeg',
    });
  } catch (error) {
    const lastError = error?.message || String(error);
    console.error(`generar_imagen_error model=${modelName}`, lastError);
    return res.status(502).json({
      error: `Hubo un problema al generar la imagen con ${modelName}. ${lastError || 'Intenta de nuevo en unos segundos.'}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI chat service running on :${PORT}`);
  console.log(`Model: ${OPENAI_MODEL}`);
  console.log('Cosmos init: starting in background');

  initCosmos()
    .then(() => {
      console.log(`Cosmos enabled: ${Boolean(cosmosContainer)}`);
    })
    .catch((e) => {
      console.warn('Cosmos init failed, running without memory:', e?.message || e);
    });
});