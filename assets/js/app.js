// ══════════════════════════════════════════════════════════════
// JUÁREZ OBSERVA · app.js
// Utilidades compartidas por todas las páginas
// ══════════════════════════════════════════════════════════════

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Campos y alertas ─────────────────────────────────────────
function mostrarError(campo, mensaje) {
  campo.classList.add('field--error');
  const span = campo.querySelector('.field-error');
  if (span) { span.textContent = mensaje; span.style.display = 'block'; }
}

function limpiarError(campo) {
  campo.classList.remove('field--error');
  const span = campo.querySelector('.field-error');
  if (span) { span.textContent = ''; span.style.display = 'none'; }
}

function mostrarAlerta(el, mensaje, tipo = 'error') {
  el.textContent = mensaje;
  el.className = `alert alert--${tipo}`;
}

// ── Sesión (ciudadano) ──────────────────────────────────────
function crearSesion(correo, nombre = 'Usuario') {
  const sesion = { correo, nombre, rol: 'ciudadano', expira: Date.now() + (8 * 60 * 60 * 1000) };
  localStorage.setItem('jo_sesion', JSON.stringify(sesion));
}

function obtenerSesion() {
  try {
    const datos = localStorage.getItem('jo_sesion');
    if (!datos) return null;
    const sesion = JSON.parse(datos);
    if (sesion.expira < Date.now()) { localStorage.removeItem('jo_sesion'); return null; }
    return sesion;
  } catch { return null; }
}

function requireSesion(redirectUrl = 'login.html') {
  const sesion = obtenerSesion();
  if (!sesion) { window.location.href = redirectUrl; return null; }
  return sesion;
}

function sesionVigente() { return obtenerSesion() !== null; }

function cerrarSesion(redirectUrl = 'login.html') {
  localStorage.removeItem('jo_sesion');
  window.location.href = redirectUrl;
}

function inicialesDeNombre(nombre = '') {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

// ── Retícula decorativa ───────────────────────────────────────
function pintarRetícula(contenedorId, divisiones = 16) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  const lineas = contenedor.querySelector('.watch-grid__lines');
  if (!lineas) return;
  lineas.innerHTML = '';
  for (let i = 0; i <= divisiones; i++) {
    const v = document.createElement('div');
    v.style.cssText = `position:absolute;top:0;bottom:0;left:${(i/divisiones)*100}%;width:1px;background:rgba(255,255,255,0.06);`;
    lineas.appendChild(v);
    const h = document.createElement('div');
    h.style.cssText = `position:absolute;left:0;right:0;top:${(i/divisiones)*100}%;height:1px;background:rgba(255,255,255,0.06);`;
    lineas.appendChild(h);
  }
}

// ── Toggle contraseña ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? 'MOSTRAR' : 'OCULTAR';
    });
  });
});

// ══════════════════════════════════════════════════════════════
// CIFRADO DE CONTRASEÑA — SHA-256 vía Web Crypto API
// ══════════════════════════════════════════════════════════════
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ══════════════════════════════════════════════════════════════
// ALMACÉN DE USUARIOS (ciudadanos) — simulado con localStorage
// ⚠️ Solo para pruebas/demo. En producción esto vive en un
// backend real con base de datos, nunca en el navegador.
// ══════════════════════════════════════════════════════════════
function _obtenerUsuarios() {
  try {
    return JSON.parse(localStorage.getItem('jo_usuarios')) || {};
  } catch { return {}; }
}

function _guardarUsuarios(usuarios) {
  localStorage.setItem('jo_usuarios', JSON.stringify(usuarios));
}

async function registrarUsuario({ nombre, correo, telefono, password }) {
  const usuarios = _obtenerUsuarios();
  const correoKey = correo.trim().toLowerCase();

  if (usuarios[correoKey]) {
    throw new Error('Ya existe una cuenta registrada con ese correo.');
  }

  // ✅ Evita cuentas cruzadas: un correo ya registrado como institución
  // no puede volver a registrarse como ciudadano.
  const instituciones = JSON.parse(localStorage.getItem('jo_instituciones') || '{}');
  if (instituciones[correoKey]) {
    throw new Error('Ese correo ya está registrado como cuenta institucional.');
  }

  const passwordHash = await hashPassword(password);
  usuarios[correoKey] = { nombre, correo: correoKey, telefono, passwordHash };
  _guardarUsuarios(usuarios);
  return usuarios[correoKey];
}

async function verificarCredenciales(correo, password) {
  const usuarios = _obtenerUsuarios();
  const correoKey = correo.trim().toLowerCase();
  const usuario = usuarios[correoKey];

  if (!usuario) return null;

  const passwordHash = await hashPassword(password);
  if (passwordHash !== usuario.passwordHash) return null;

  return usuario;
}