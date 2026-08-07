const TIPOS_INSTITUCION = [
  'Policía Municipal',
  'Bomberos',
  'Protección Civil',
  'Obras Públicas',
  'Alumbrado Público',
  'Servicios de Limpia',
  'Tránsito Municipal',
  'Ecología',
  'Parques y Jardines'
];

const TIPO_A_INSTITUCION_FALLBACK = {
  bache: 'Obras Públicas',
  alumbrado: 'Alumbrado Público',
  basura: 'Servicios de Limpia',
  seguridad: 'Policía Municipal',
  incendio: 'Bomberos',
  vandalismo: 'Policía Municipal',
};

function institucionDeReporte(r) {
  return r.institucion || TIPO_A_INSTITUCION_FALLBACK[r.tipo] || null;
}

// Estados reales del enum de Mongo (models/Reporte.js)
const ESTADOS_REPORTE = ['pendiente', 'revision', 'resuelto'];

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  revision: 'En proceso',
  resuelto: 'Resuelto',
};

// Progreso sugerido al cambiar de estado (ajústalo si lo quieres manual)
const PROGRESO_POR_ESTADO = {
  pendiente: 0,
  revision: 50,
  resuelto: 100,
};

async function registrarInstitucion({ nombreInstitucion, tipo, rfc, correo, password }) {

  const nombreInstLimpio = (nombreInstitucion || '').trim();
  const tipoLimpio = (tipo || '').trim();
  const rfcLimpio = (rfc || '').trim().toUpperCase();
  const correoLimpio = correo.trim().toLowerCase();

  if (nombreInstLimpio.length < 3) {
    throw new Error('Ingresa el nombre de la institución (mínimo 3 caracteres).');
  }

  if (!TIPOS_INSTITUCION.includes(tipoLimpio)) {
    throw new Error('Selecciona un tipo de institución válido.');
  }

  if (rfcLimpio.length < 3) {
    throw new Error('Ingresa un RFC válido.');
  }

  const passwordHash = await hashPassword(password);

  const respuesta = await fetch(`${API_BASE}/instituciones/registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nombreInstitucion: nombreInstLimpio,
      tipo: tipoLimpio,
      rfc: rfcLimpio,
      correo: correoLimpio,
      passwordHash
    })
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje);
  }

  return datos;
}

async function verificarCredencialesInstitucion(correo, password) {

  const passwordHash = await hashPassword(password);

  const respuesta = await fetch(`${API_BASE}/instituciones/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correo.trim().toLowerCase(), passwordHash })
  });

  if (!respuesta.ok) {
    return null;
  }

  const datos = await respuesta.json();

  return { institucion: datos.institucion, token: datos.token };
}

// ══════════════════════════════════════════════════════════════
// SESIÓN DE INSTITUCIÓN (localStorage está bien aquí — es sesión
// del cliente, no datos de reportes)
// ══════════════════════════════════════════════════════════════
function crearSesionInstitucion(institucion, token) {
  const sesion = {
    correo: institucion.correo,
    nombreInstitucion: institucion.nombreInstitucion,
    tipo: institucion.tipo,
    rol: 'institucion',
    token,
    expira: Date.now() + (8 * 60 * 60 * 1000)
  };
  localStorage.setItem('jo_sesion_institucion', JSON.stringify(sesion));
}

function obtenerSesionInstitucion() {
  try {
    const datos = localStorage.getItem('jo_sesion_institucion');
    if (!datos) return null;
    const sesion = JSON.parse(datos);
    if (sesion.expira < Date.now()) {
      localStorage.removeItem('jo_sesion_institucion');
      return null;
    }
    return sesion;
  } catch { return null; }
}

function requireSesionInstitucion(redirectUrl = 'institucion_login.html') {
  const sesion = obtenerSesionInstitucion();
  if (!sesion) { window.location.href = redirectUrl; return null; }
  return sesion;
}

function cerrarSesionInstitucion(redirectUrl = 'institucion_login.html') {
  localStorage.removeItem('jo_sesion_institucion');
  window.location.href = redirectUrl;
}

// ══════════════════════════════════════════════════════════════
// REPORTES — contra la API real (mismo origen de datos que
// ciudadano.js), en vez de localStorage.
// ══════════════════════════════════════════════════════════════

async function _fetchTodosLosReportes() {
  // La institución necesita ver TODOS los estados (incluido resuelto),
  // a diferencia del mapa público del ciudadano que los oculta por default.
  const respuesta = await fetch(`${API_BASE}/reportes?incluirResueltos=true`);
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los reportes del servidor.');
  }
  return await respuesta.json();
}

function _mapearReporte(r) {
  return {
    id: r._id,
    categoria: r.tipo,
    descripcion: r.descripcion,
    direccion: r.direccion,
    lat: r.latitud,
    lng: r.longitud,
    foto: r.foto || '',
    estado: r.estado,
    institucionAsignada: institucionDeReporte(r),
    // Bitácora de avances: cada entrada puede traer texto, foto, o ambos
    bitacora: (r.bitacora || []).map(b => ({
      texto: b.texto || '',
      foto: b.foto || '',
      autor: b.autor || 'Institución',
      fecha: new Date(b.fecha).getTime(),
    })),
    ciudadanoCorreo: r.ciudadano ? r.ciudadano.correo : null,
    ciudadanoNombre: r.ciudadano ? r.ciudadano.nombre : null,
    fechaCreacion: new Date(r.createdAt).getTime(),
    fechaActualizacion: new Date(r.updatedAt || r.createdAt).getTime(),
  };
}

async function obtenerReportesPorInstitucion(tipo) {
  const reportes = await _fetchTodosLosReportes();

  return reportes
    .filter(r => institucionDeReporte(r) === tipo)
    .map(_mapearReporte)
    .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
}

async function obtenerReportePorId(id) {
  const respuesta = await fetch(`${API_BASE}/reportes/${id}`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) {
    throw new Error('No se pudo obtener el reporte.');
  }
  const r = await respuesta.json();
  return _mapearReporte(r);
}

async function cambiarEstadoReporte(id, nuevoEstado) {
  if (!ESTADOS_REPORTE.includes(nuevoEstado)) {
    throw new Error('Estado de reporte no válido.');
  }

  const sesion = obtenerSesionInstitucion();

  const respuesta = await fetch(`${API_BASE}/reportes/${id}/estado`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sesion?.token}`
    },
    body: JSON.stringify({
      estado: nuevoEstado,
      progreso: PROGRESO_POR_ESTADO[nuevoEstado],
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo actualizar el estado del reporte.');
  }

  return datos.reporte;
}

function marcarResuelto(id) {
  return cambiarEstadoReporte(id, 'resuelto');
}

// ══════════════════════════════════════════════════════════════
// BITÁCORA DE AVANCES — texto y/o foto de evidencia.
// Esto es lo que le da transparencia al ciudadano: institución deja
// constancia de qué hizo y cuándo, con foto si aplica, en vez de
// solo cambiar el estado sin sustento.
// ══════════════════════════════════════════════════════════════
async function agregarAvance(id, { texto = '', foto = '' } = {}, autor = 'Institución') {
  if (!texto && !foto) {
    throw new Error('Agrega un texto o una foto de evidencia.');
  }

  const sesion = obtenerSesionInstitucion();

  const respuesta = await fetch(`${API_BASE}/reportes/${id}/bitacora`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sesion?.token}`
    },
    body: JSON.stringify({ texto, foto, autor }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo registrar el avance.');
  }

  return datos.reporte;
}

async function obtenerHistorialInstitucion(tipo) {
  const reportes = await obtenerReportesPorInstitucion(tipo);
  return reportes.filter(r => r.estado === 'resuelto');
}

// ══════════════════════════════════════════════════════════════
// MÉTRICAS DE DESEMPEÑO
// ══════════════════════════════════════════════════════════════
async function calcularMetricas(tipo) {
  const reportes = await obtenerReportesPorInstitucion(tipo);
  const total      = reportes.length;
  const pendientes = reportes.filter(r => r.estado === 'pendiente').length;
  const enProceso  = reportes.filter(r => r.estado === 'revision').length;
  const resueltos  = reportes.filter(r => r.estado === 'resuelto').length;

  const tiemposResolucion = reportes
    .filter(r => r.estado === 'resuelto')
    .map(r => r.fechaActualizacion - r.fechaCreacion);

  const promedioMs = tiemposResolucion.length
    ? tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length
    : 0;

  const promedioHoras = (promedioMs / (1000 * 60 * 60)).toFixed(1);

  return { total, pendientes, enProceso, resueltos, promedioHoras };
}