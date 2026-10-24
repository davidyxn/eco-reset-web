/* Datos de marca, productos y guía Scan & Care */

export const CONFIG = {
  /* Cambia este número por el WhatsApp real de Eco Reset (código de país + número, sin + ni espacios).
     Ejemplo: '50251234567'. Si lo dejas vacío, el pedido se copia al portapapeles. */
  whatsapp: '',
  email: 'hola@ecoreset.gt',
  instagram: '#'
};

export const PRODUCTS = {
  botella: {
    name: 'Botella 1000 ml',
    meta: '1000 ml + atomizador reutilizable',
    price: 50,
    note: 'Incluye maceta biodegradable de lanzamiento.'
  },
  envase: {
    name: 'Envase de repuesto',
    meta: 'Botella vacía 1000 ml + atomizador',
    price: 15,
    note: 'Para reutilizar y recargar.'
  }
};

/** Rendimiento de la presentación principal. */
export const YIELD = {
  bottleMl: 1000,
  doseMl: 15,
  liters: Math.round(1000 / 15)
};

export const SYMPTOMS = {
  amarillas: {
    title: 'Hojas amarillas',
    tag: 'Riego y nutrición',
    summary: 'Exceso de riego, falta de luz o sustrato agotado.',
    causes: ['Exceso o falta de riego', 'Poca luz disponible', 'Sustrato agotado o compacto', 'Cambio reciente de lugar'],
    checks: ['Humedad del sustrato a 3 cm de profundidad', 'Orificios de drenaje de la maceta', 'Cantidad de luz que recibe al día'],
    tip: 'Deja secar el sustrato entre riegos y revisa el drenaje. Si el amarilleo empieza en las hojas nuevas, revisa la luz; si empieza en las hojas bajas, revisa la nutrición.',
    short: 'Empieza por el riego: deja secar entre tomas y revisa el drenaje.',
    note: 'El amarilleo puede ser natural en hojas muy viejas. Si avanza rápido o afecta hojas nuevas, conviene revisar el conjunto: luz, agua y nutrición.'
  },
  puntas: {
    title: 'Puntas marrones',
    tag: 'Humedad ambiental',
    summary: 'Aire seco, riego irregular o exceso de sales.',
    causes: ['Ambiente muy seco', 'Riego irregular', 'Exceso de fertilizante', 'Agua con muchas sales'],
    checks: ['Humedad del aire alrededor de la planta', 'Frecuencia y cantidad de riego', 'Dosis de fertilizante aplicada'],
    tip: 'Recorta la punta seca dejando un borde vivo. Evita fertilizar de más y revisa la humedad del aire; en interiores suele ayudar agrupar plantas o usar un plato con agua y piedras.',
    short: 'Recorta la punta seca y revisa humedad y dosis de fertilizante.',
    note: 'Si todas las puntas se secan al mismo tiempo, revisa la calidad del agua y el exceso de sales acumuladas en el sustrato.'
  },
  manchas: {
    title: 'Manchas en hojas',
    tag: 'Humedad y hongos',
    summary: 'Hongos por exceso de humedad, sol directo o frío.',
    causes: ['Hojas mojadas por mucho tiempo', 'Poca ventilación', 'Sol directo muy fuerte', 'Daño por frío'],
    checks: ['Si las manchas crecen o se extienden', 'Ventilación del espacio', 'Momento del día en que mojas las hojas'],
    tip: 'Aísla la planta, retira las hojas muy afectadas y evita mojar el follaje al atardecer. Riega el sustrato, no las hojas, y deja circular el aire.',
    short: 'Aísla la planta, retira hojas muy afectadas y mejora la ventilación.',
    note: 'Si las manchas tienen borde definido y crecen rápido, consulta a un especialista: puede requerir un tratamiento específico.'
  },
  enrolladas: {
    title: 'Hojas enrolladas',
    tag: 'Estrés y plagas',
    summary: 'Calor, falta de agua o presencia de plagas.',
    causes: ['Calor o sol intenso', 'Sustrato demasiado seco', 'Plagas en el envés', 'Transplante reciente'],
    checks: ['Temperatura y luz del lugar', 'Peso de la maceta (señal de sequedad)', 'Envés de las hojas con lupa'],
    tip: 'Revisa el envés de las hojas y la humedad del sustrato. Si el aire es muy seco, aleja la planta del sol directo y riega de forma más regular sin encharcar.',
    short: 'Revisa el envés de las hojas y la humedad del sustrato.',
    note: 'Las hojas enrolladas hacia arriba suelen indicar calor o estrés hídrico; hacia abajo, a veces exceso de riego.'
  },
  lento: {
    title: 'Crecimiento lento',
    tag: 'Luz y nutrición',
    summary: 'Poca luz, maceta pequeña o sustrato agotado.',
    causes: ['Luz insuficiente', 'Maceta pequeña para las raíces', 'Sustrato sin nutrientes', 'Temporada fría'],
    checks: ['Horas de luz reales que recibe', 'Si las raíces salen por los orificios', 'Cuándo fue el último cambio de sustrato'],
    tip: 'Revisa la luz y el espacio de las raíces. Fertiliza en temporada de crecimiento y respeta la dilución de 15 ml por litro de agua.',
    short: 'Revisa luz y raíces. Fertiliza en temporada de crecimiento.',
    note: 'En invierno muchas plantas reducen su ritmo de forma natural. Compara su crecimiento con la temporada anterior.'
  },
  plagas: {
    title: 'Plagas visibles',
    tag: 'Prevención',
    summary: 'Ácaros, pulgones o cochinilla en hojas y tallos.',
    causes: ['Ácaros en ambiente seco', 'Pulgones en brotes nuevos', 'Cochinilla algodonosa', 'Mosquita del sustrato'],
    checks: ['Envés de las hojas y uniones del tallo', 'Puntos pegajosos o telarañas finas', 'Sustrato húmedo con insectos pequeños'],
    tip: 'Aísla la planta y limpia con agua y jabón potásico. Revisa el envés con paciencia y repite la revisión cada semana. Si persiste, consulta a un especialista.',
    short: 'Aísla la planta, limpia con agua y jabón potásico y revisa el envés.',
    note: 'No apliques productos sobre hojas mojadas ni al sol directo. Revisa siempre las indicaciones de cada producto.'
  }
};

export const orderStatus = {
  isWhatsAppReady: () => /^\d{8,15}$/.test(String(CONFIG.whatsapp || ''))
};
