const API_BASE = 'https://ojito-a9d2.onrender.com/api';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function crearSesion(correo, nombre = 'Usuario', telefono = '', token = '') {

  const sesion = {
    correo,
    nombre,
    telefono,
    token,
    rol: 'ciudadano',
    expira: Date.now() + (8 * 60 * 60 * 1000)
  };

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

async function fetchAutenticado(url, opciones = {}) {
  const sesion = obtenerSesion();
  const headers = {
    ...(opciones.headers || {}),
    ...(sesion?.token ? { "Authorization": `Bearer ${sesion.token}` } : {})
  };
  return fetch(url, { ...opciones, headers });
}

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

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registrarUsuario({ nombre, correo, telefono, password }) {

  const passwordHash = await hashPassword(password);

  const respuesta = await fetch(`${API_BASE}/usuarios/registro`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      nombre,
      correo: correo.trim().toLowerCase(),
      telefono,
      passwordHash
    })

  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje);
  }

  return datos;

}

async function verificarCredenciales(correo, password) {

  const passwordHash = await hashPassword(password);

  const respuesta = await fetch(`${API_BASE}/usuarios/login`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      correo: correo.trim().toLowerCase(),
      passwordHash
    })
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    if (datos.requiereVerificacion) {
      const error = new Error(datos.mensaje);
      error.requiereVerificacion = true;
      throw error;
    }
    return null;
  }

  return { usuario: datos.usuario, token: datos.token };
}

// ══════════════════════════════════════════════════════════════
// RECUPERACIÓN DE CONTRASEÑA — conexión real al backend
//
// El formulario de recuperación es el mismo para ciudadanos e
// instituciones, y no le pedimos al usuario que elija su tipo de
// cuenta. Como el backend responde con el mismo mensaje genérico
// exista o no el correo (por seguridad), aquí probamos AMBOS
// endpoints (usuarios e instituciones) y usamos el que sí
// corresponda a la cuenta real. `_tipoCuentaRecuperacion` recuerda
// cuál de los dos funcionó, para usar el mismo en los pasos
// siguientes (verificar código y restablecer contraseña).
// ══════════════════════════════════════════════════════════════

let _tipoCuentaRecuperacion = null; // 'usuarios' | 'instituciones'

async function solicitarRecuperacion(correo) {
  const correoLimpio = correo.trim().toLowerCase();

  const [resUsuario, resInstitucion] = await Promise.allSettled([
    fetch(`${API_BASE}/usuarios/solicitar-recuperacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: correoLimpio })
    }),
    fetch(`${API_BASE}/instituciones/solicitar-recuperacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: correoLimpio })
    })
  ]);

  const usuarioOk     = resUsuario.status === 'fulfilled' && resUsuario.value.ok;
  const institucionOk = resInstitucion.status === 'fulfilled' && resInstitucion.value.ok;

  if (!usuarioOk && !institucionOk) {
    throw new Error('No se pudo conectar con el servidor. Intenta de nuevo.');
  }

  return { mensaje: 'Si el correo existe, se envió un código de verificación.' };
}

async function verificarCodigoRecuperacion(correo, codigo) {
  const correoLimpio = correo.trim().toLowerCase();
  const body = JSON.stringify({ correo: correoLimpio, codigo });

  const respUsuario = await fetch(`${API_BASE}/usuarios/verificar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  if (respUsuario.ok) {
    _tipoCuentaRecuperacion = 'usuarios';
    return await respUsuario.json();
  }

  const respInstitucion = await fetch(`${API_BASE}/instituciones/verificar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  if (respInstitucion.ok) {
    _tipoCuentaRecuperacion = 'instituciones';
    return await respInstitucion.json();
  }

  const datosError = await respUsuario.json();
  throw new Error(datosError.mensaje || 'El código no es correcto.');
}

async function restablecerPassword(correo, codigo, password) {
  const passwordHash = await hashPassword(password);
  const correoLimpio = correo.trim().toLowerCase();

  const tipo = _tipoCuentaRecuperacion || 'usuarios';

  const respuesta = await fetch(`${API_BASE}/${tipo}/restablecer-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correoLimpio, codigo, passwordHash })
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);

  _tipoCuentaRecuperacion = null;
  return datos;
}

// ══════════════════════════════════════════════════════════════
// VERIFICACIÓN DE CORREO AL REGISTRARSE
// ══════════════════════════════════════════════════════════════

async function verificarRegistro(correo, codigo) {
  const respuesta = await fetch(`${API_BASE}/usuarios/verificar-registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correo.trim().toLowerCase(), codigo })
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos;
}

async function reenviarVerificacionRegistro(correo) {
  const respuesta = await fetch(`${API_BASE}/usuarios/reenviar-verificacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correo.trim().toLowerCase() })
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos;
}

// ══════════════════════════════════════════════════════════════
// PARÁMETROS
// ══════════════════════════════════════════════════════════════
async function consultarParametros() {
  try {
    const respuesta = await fetch(`${API_BASE}/parametros`);
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch {
    return null;
  }
}
