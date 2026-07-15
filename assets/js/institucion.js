// ══════════════════════════════════════════════════════════════
// JUÁREZ OBSERVA · institucion.js
// Lógica específica del rol "Institución Responsable"
// Requiere que assets/js/app.js esté cargado ANTES de este archivo
// (usa hashPassword, mostrarError, limpiarError, mostrarAlerta)
// ══════════════════════════════════════════════════════════════

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

const ESTADOS_REPORTE = ['Pendiente', 'En proceso', 'Resuelto'];

// ══════════════════════════════════════════════════════════════
// ALMACÉN DE INSTITUCIONES (simulado con localStorage)
// ⚠️ Solo para pruebas/demo. En producción esto vive en un
// backend real con base de datos, nunca en el navegador.
// ══════════════════════════════════════════════════════════════
function _obtenerInstituciones() {
  try { return JSON.parse(localStorage.getItem('jo_instituciones')) || {}; }
  catch { return {}; }
}

function _guardarInstituciones(instituciones) {
  localStorage.setItem('jo_instituciones', JSON.stringify(instituciones));
}

async function registrarInstitucion({ nombreInstitucion, tipo, matricula, correo, password }) {
  const instituciones      = _obtenerInstituciones();
  const correoKey          = correo.trim().toLowerCase();
  const nombreInstLimpio   = (nombreInstitucion || '').trim();
  const tipoLimpio         = (tipo || '').trim();
  const matriculaLimpia    = (matricula || '').trim();
  // ✅ FIX: clave normalizada (mayúsculas/espacios) solo para comparar,
  // sin alterar cómo se guarda la matrícula original.
  const matriculaComparar  = matriculaLimpia.toLowerCase();

  // ✅ FIX: el nombre de la institución ahora también se valida aquí,
  // no solo se confía en el "required" del HTML.
  if (nombreInstLimpio.length < 3) {
    throw new Error('Ingresa el nombre de la institución (mínimo 3 caracteres).');
  }

  if (instituciones[correoKey]) {
    throw new Error('Ya existe una cuenta institucional con ese correo.');
  }

  // ✅ Evita cuentas cruzadas: un correo ya registrado como ciudadano
  // no puede volver a registrarse como institución.
  const usuarios = JSON.parse(localStorage.getItem('jo_usuarios') || '{}');
  if (usuarios[correoKey]) {
    throw new Error('Ese correo ya está registrado como cuenta ciudadana.');
  }

  // ✅ FIX: se compara contra la versión ya recortada (tipoLimpio), para
  // que un espacio accidental al inicio/final del <select> no rompa
  // la validación aunque el valor "se vea" correcto.
  if (!TIPOS_INSTITUCION.includes(tipoLimpio)) {
    throw new Error('Selecciona un tipo de institución válido.');
  }
  if (matriculaLimpia.length < 3) {
    throw new Error('Ingresa una matrícula o número de empleado válido.');
  }

  // ✅ FIX: comparación de matrícula insensible a mayúsculas/minúsculas,
  // para que "EMP-2451" y "emp-2451" cuenten como la misma matrícula.
  const yaExiste = Object.values(instituciones).some(
    i => (i.matricula || '').trim().toLowerCase() === matriculaComparar
  );
  if (yaExiste) {
    throw new Error('Ya existe una cuenta registrada con esa matrícula.');
  }

  const passwordHash = await hashPassword(password);
  instituciones[correoKey] = {
    nombreInstitucion: nombreInstLimpio,
    tipo: tipoLimpio,
    matricula: matriculaLimpia,
    correo: correoKey,
    passwordHash
  };
  _guardarInstituciones(instituciones);
  return instituciones[correoKey];
}

async function verificarCredencialesInstitucion(correo, password) {
  const instituciones = _obtenerInstituciones();
  const correoKey = correo.trim().toLowerCase();
  const institucion = instituciones[correoKey];

  if (!institucion) return null;

  const passwordHash = await hashPassword(password);
  if (passwordHash !== institucion.passwordHash) return null;

  return institucion;
}

// ══════════════════════════════════════════════════════════════
// SESIÓN DE INSTITUCIÓN (separada de la sesión de ciudadano)
// ══════════════════════════════════════════════════════════════
function crearSesionInstitucion(institucion) {
  const sesion = {
    correo: institucion.correo,
    nombre: institucion.nombreInstitucion,
    tipo: institucion.tipo,
    rol: 'institucion',
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
// ALMACÉN DE REPORTES
// Estructura de un reporte:
// {
//   id, categoria, descripcion, direccion, lat, lng,
//   fotos: [dataURL, ...],
//   estado: 'Pendiente' | 'En proceso' | 'Resuelto',
//   institucionAsignada: uno de TIPOS_INSTITUCION,
//   observaciones: [{ texto, autor, fecha }],
//   ciudadanoCorreo, fechaCreacion, fechaActualizacion
// }
// ══════════════════════════════════════════════════════════════
function _obtenerReportes() {
  try { return JSON.parse(localStorage.getItem('jo_reportes')) || []; }
  catch { return []; }
}

function _guardarReportes(reportes) {
  localStorage.setItem('jo_reportes', JSON.stringify(reportes));
}

function obtenerReportesPorInstitucion(tipo) {
  return _obtenerReportes()
    .filter(r => r.institucionAsignada === tipo)
    .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
}

function obtenerReportePorId(id) {
  return _obtenerReportes().find(r => r.id === id) || null;
}

function cambiarEstadoReporte(id, nuevoEstado) {
  if (!ESTADOS_REPORTE.includes(nuevoEstado)) {
    throw new Error('Estado de reporte no válido.');
  }
  const reportes = _obtenerReportes();
  const reporte = reportes.find(r => r.id === id);
  if (!reporte) throw new Error('Reporte no encontrado.');

  reporte.estado = nuevoEstado;
  reporte.fechaActualizacion = Date.now();
  _guardarReportes(reportes);
  return reporte;
}

function agregarObservacion(id, texto, autor = 'Institución') {
  const reportes = _obtenerReportes();
  const reporte = reportes.find(r => r.id === id);
  if (!reporte) throw new Error('Reporte no encontrado.');

  reporte.observaciones = reporte.observaciones || [];
  reporte.observaciones.push({ texto, autor, fecha: Date.now() });
  reporte.fechaActualizacion = Date.now();
  _guardarReportes(reportes);
  return reporte;
}

function agregarFotoEvidencia(id, dataUrl) {
  const reportes = _obtenerReportes();
  const reporte = reportes.find(r => r.id === id);
  if (!reporte) throw new Error('Reporte no encontrado.');

  reporte.fotos = reporte.fotos || [];
  reporte.fotos.push(dataUrl);
  reporte.fechaActualizacion = Date.now();
  _guardarReportes(reportes);
  return reporte;
}

function marcarResuelto(id) {
  return cambiarEstadoReporte(id, 'Resuelto');
}

function obtenerHistorialInstitucion(tipo) {
  return obtenerReportesPorInstitucion(tipo)
    .filter(r => r.estado === 'Resuelto');
}

// ══════════════════════════════════════════════════════════════
// MÉTRICAS DE DESEMPEÑO
// ══════════════════════════════════════════════════════════════
function calcularMetricas(tipo) {
  const reportes = obtenerReportesPorInstitucion(tipo);
  const total      = reportes.length;
  const pendientes = reportes.filter(r => r.estado === 'Pendiente').length;
  const enProceso  = reportes.filter(r => r.estado === 'En proceso').length;
  const resueltos  = reportes.filter(r => r.estado === 'Resuelto').length;

  const tiemposResolucion = reportes
    .filter(r => r.estado === 'Resuelto')
    .map(r => r.fechaActualizacion - r.fechaCreacion);

  const promedioMs = tiemposResolucion.length
    ? tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length
    : 0;

  const promedioHoras = (promedioMs / (1000 * 60 * 60)).toFixed(1);

  return { total, pendientes, enProceso, resueltos, promedioHoras };
}

// ══════════════════════════════════════════════════════════════
// DATOS DE PRUEBA — ⚠️ SOLO PARA DESARROLLO
// Genera reportes ficticios para poder probar el dashboard antes
// de tener el flujo real de creación de reportes por ciudadanos.
// Bórralo cuando ese flujo esté listo.
// ══════════════════════════════════════════════════════════════
function _sembrarReportesDemo(tipo) {
  const categorias = {
    'Policía Municipal': ['Robo a transeúnte', 'Riña vecinal', 'Vehículo abandonado'],
    'Bomberos': ['Conato de incendio', 'Fuga de gas', 'Poste caído'],
    'Protección Civil': ['Árbol a punto de caer', 'Inundación en calle', 'Cableado expuesto'],
    'Obras Públicas': ['Bache profundo', 'Banqueta rota', 'Coladera sin tapa'],
    'Alumbrado Público': ['Luminaria apagada', 'Poste dañado', 'Cableado suelto'],
    'Servicios de Limpia': ['Basura acumulada', 'Tiradero clandestino', 'Contenedor dañado'],
    'Tránsito Municipal': ['Semáforo descompuesto', 'Señalamiento dañado', 'Bache en cruce'],
    'Ecología': ['Tala no autorizada', 'Contaminación de canal', 'Quema a cielo abierto'],
    'Parques y Jardines': ['Juego infantil roto', 'Pasto sin mantenimiento', 'Árbol caído']
  };

  const lista = categorias[tipo] || ['Reporte general'];
  const reportes = _obtenerReportes();

  lista.forEach((categoria, i) => {
    const creado = Date.now() - (i + 1) * 3 * 60 * 60 * 1000;
    reportes.push({
      id: 'demo_' + tipo.replace(/\s/g, '') + '_' + Date.now() + '_' + i,
      categoria,
      descripcion: `Reporte de prueba: ${categoria.toLowerCase()} reportado por un vecino de la zona.`,
      direccion: 'Col. Centro, Cd. Juárez, Chih.',
      lat: 31.6904 + (Math.random() - 0.5) * 0.05,
      lng: -106.4245 + (Math.random() - 0.5) * 0.05,
      fotos: [],
      estado: i === 0 ? 'Resuelto' : (i === 1 ? 'En proceso' : 'Pendiente'),
      institucionAsignada: tipo,
      observaciones: [],
      ciudadanoCorreo: 'vecino.demo@correo.com',
      fechaCreacion: creado,
      fechaActualizacion: i === 0 ? creado + 2 * 60 * 60 * 1000 : creado
    });
  });

  _guardarReportes(reportes);
}