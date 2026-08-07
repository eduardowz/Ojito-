//correo: 'admin@juarezobserva.mx',
//password: 'Admin#2026'

const API_BASE_ADMIN = 'http://localhost:3000/api';

const DURACION_SESION_ADMIN_MS = 8 * 60 * 60 * 1000; // 8 horas

// ── verificación de credenciales administrador ────────────────
async function verificarCredencialesAdmin(correo, password) {

  const passwordHash = await hashPassword(password);

  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correo: correo.trim().toLowerCase(),
      passwordHash
    })
  });

  if (!respuesta.ok) {
    return null;
  }

  const datos = await respuesta.json();

  return { admin: datos.admin, token: datos.token };
}

// ── sesión ──────────────────────────────────────────────────
function crearSesionAdmin(correo, nombre = 'Administrador', token) {
  const sesion = {
    correo, nombre, rol: 'administrador', token,
    expira: Date.now() + DURACION_SESION_ADMIN_MS
  };
  localStorage.setItem('jo_sesion_admin', JSON.stringify(sesion));
}

function obtenerSesionAdmin() {
  try {
    const datos = localStorage.getItem('jo_sesion_admin');
    if (!datos) return null;
    const sesion = JSON.parse(datos);
    if (sesion.expira < Date.now()) { localStorage.removeItem('jo_sesion_admin'); return null; }
    return sesion;
  } catch { return null; }
}

function requireSesionAdmin(redirectUrl = 'login.html') {
  const sesion = obtenerSesionAdmin();
  if (!sesion) { window.location.href = redirectUrl; return null; }
  return sesion;
}

function cerrarSesionAdmin(redirectUrl = 'login.html') {
  localStorage.removeItem('jo_sesion_admin');
  window.location.href = redirectUrl;
}

// ══════════════════════════════════════════════════════════════
// REPORTES — endpoints reales de administrador (sin restricción
// de institución, a diferencia de institucion.js)
// ══════════════════════════════════════════════════════════════

function _headersAdmin() {
  const sesion = obtenerSesionAdmin();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sesion?.token}`
  };
}

async function obtenerTodosLosReportesAdmin() {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/reportes`, {
    headers: _headersAdmin()
  });
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los reportes.');
  }
  const datos = await respuesta.json();

  // Mapeo a la forma que ya usa administrador_dashboard.html
  return datos.map(r => ({
    id: r._id,
    categoria: r.tipo,
    descripcion: r.descripcion,
    direccion: r.direccion,
    lat: r.latitud,
    lng: r.longitud,
    estado: r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'revision' ? 'En proceso' : 'Resuelto',
    institucionAsignada: r.institucion || null,
    ciudadanoCorreo: r.ciudadano ? r.ciudadano.correo : null,
    ciudadanoNombre: r.ciudadano ? r.ciudadano.nombre : null,
    fechaCreacion: new Date(r.createdAt).getTime(),
    fechaActualizacion: new Date(r.updatedAt || r.createdAt).getTime(),
  }));
}

const ESTADO_LABEL_A_VALOR = { 'Pendiente': 'pendiente', 'En proceso': 'revision', 'Resuelto': 'resuelto' };

async function cambiarEstadoReporteAdmin(id, estadoLabel) {
  const estado = ESTADO_LABEL_A_VALOR[estadoLabel];
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/reportes/${id}/estado`, {
    method: 'PUT',
    headers: _headersAdmin(),
    body: JSON.stringify({ estado })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo cambiar el estado.');
  return datos.reporte;
}

async function asignarInstitucionReporteAdmin(id, institucion) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/reportes/${id}/institucion`, {
    method: 'PUT',
    headers: _headersAdmin(),
    body: JSON.stringify({ institucion })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo reasignar la institución.');
  return datos.reporte;
}

async function eliminarReporteAdmin(id) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/reportes/${id}`, {
    method: 'DELETE',
    headers: _headersAdmin()
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo eliminar el reporte.');
  return true;
}

// ══════════════════════════════════════════════════════════════
// USUARIOS — endpoints reales de administrador
// ══════════════════════════════════════════════════════════════

async function obtenerUsuariosAdmin() {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/usuarios`, { headers: _headersAdmin() });
  if (!respuesta.ok) throw new Error('No se pudieron cargar los usuarios.');
  const datos = await respuesta.json();

  return datos.map(u => ({
    id: u._id,
    nombre: u.nombre,
    correo: u.correo,
    telefono: u.telefono,
    estado: u.estado || 'Activo',
    fechaRegistro: new Date(u.createdAt).getTime(),
  }));
}

async function editarUsuarioAdmin(id, { nombre, correo, telefono }) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/usuarios/${id}`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, correo, telefono })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo actualizar el usuario.');
  return datos.usuario;
}

async function cambiarEstadoUsuarioAdmin(id, estado) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/usuarios/${id}/estado`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify({ estado })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo cambiar el estado.');
  return datos.usuario;
}

async function eliminarUsuarioAdmin(id) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/usuarios/${id}`, {
    method: 'DELETE', headers: _headersAdmin()
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo eliminar el usuario.');
  return true;
}

async function crearUsuarioAdmin({ nombre, correo, telefono, password }) {
  const passwordHash = await hashPassword(password);
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/usuarios`, {
    method: 'POST', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, correo, telefono, passwordHash })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo crear el usuario.');
  return datos.usuario;
}

// ══════════════════════════════════════════════════════════════
// INSTITUCIONES — endpoints reales de administrador
// ══════════════════════════════════════════════════════════════

async function obtenerInstitucionesAdmin() {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/instituciones`, { headers: _headersAdmin() });
  if (!respuesta.ok) throw new Error('No se pudieron cargar las instituciones.');
  const datos = await respuesta.json();

  return datos.map(i => ({
    id: i._id,
    nombre: i.nombre,
    tipo: i.tipo,
    correo: i.correo,
    rfc: i.rfc,
    estado: i.estado || 'Activa',
    fechaRegistro: new Date(i.createdAt).getTime(),
  }));
}

async function editarInstitucionAdmin(id, { nombre, correo, tipo, rfc }) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/instituciones/${id}`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, correo, tipo, rfc })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo actualizar la institución.');
  return datos.institucion;
}

async function cambiarEstadoInstitucionAdmin(id, estado) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/instituciones/${id}/estado`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify({ estado })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo cambiar el estado.');
  return datos.institucion;
}

async function eliminarInstitucionAdmin(id) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/instituciones/${id}`, {
    method: 'DELETE', headers: _headersAdmin()
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo eliminar la institución.');
  return true;
}

async function crearInstitucionAdmin({ nombre, correo, tipo, rfc, password }) {
  const passwordHash = await hashPassword(password);
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/instituciones`, {
    method: 'POST', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, correo, tipo, rfc, passwordHash })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo crear la institución.');
  return datos.institucion;
}

// ══════════════════════════════════════════════════════════════
// CATEGORÍAS — endpoints reales
// ══════════════════════════════════════════════════════════════

async function obtenerCategoriasAdmin() {
  const respuesta = await fetch(`${API_BASE_ADMIN}/categorias`);
  if (!respuesta.ok) throw new Error('No se pudieron cargar las categorías.');
  return await respuesta.json();
}

async function crearCategoriaAdmin({ nombre, color, icono, institucion }) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/categorias`, {
    method: 'POST', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, color, icono, institucion })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo crear la categoría.');
  return datos.categoria;
}

async function editarCategoriaAdmin(id, { nombre, color, icono, institucion }) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/categorias/${id}`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify({ nombre, color, icono, institucion })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo actualizar la categoría.');
  return datos.categoria;
}

async function eliminarCategoriaAdmin(id) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/categorias/${id}`, {
    method: 'DELETE', headers: _headersAdmin()
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo eliminar la categoría.');
  return true;
}

// ══════════════════════════════════════════════════════════════
// PARÁMETROS — endpoints reales
// ══════════════════════════════════════════════════════════════

async function obtenerParametrosAdmin() {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/parametros`);
  if (!respuesta.ok) throw new Error('No se pudieron cargar los parámetros.');
  return await respuesta.json();
}

async function guardarParametrosAdmin(nuevos) {
  const respuesta = await fetch(`${API_BASE_ADMIN}/admin/parametros`, {
    method: 'PUT', headers: _headersAdmin(),
    body: JSON.stringify(nuevos)
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudieron guardar los parámetros.');
  return datos.parametros;
}