// ══════════════════════════════════════════════════════════════
// UTILIDADES BASE
// ══════════════════════════════════════════════════════════════

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mostrarError(campo, mensaje) {
  campo.classList.add('field--error');
  const span = campo.querySelector('.field-error');
  if (span) {
    span.textContent = mensaje;
    span.style.display = 'block';
  }
}

function limpiarError(campo) {
  campo.classList.remove('field--error');
  const span = campo.querySelector('.field-error');
  if (span) {
    span.textContent = '';
    span.style.display = 'none';
  }
}

function mostrarAlerta(el, mensaje, tipo = 'error') {
  el.textContent = mensaje;
  el.className = `alert alert--${tipo}`;
}

// ══════════════════════════════════════════════════════════════
// RETÍCULA DECORATIVA DEL PANEL IZQUIERDO
// ══════════════════════════════════════════════════════════════

function pintarRetícula(contenedorId, divisiones = 16) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const lineas = contenedor.querySelector('.watch-grid__lines');
  if (!lineas) return;

  lineas.innerHTML = '';

  for (let i = 0; i <= divisiones; i++) {
    const v = document.createElement('div');
    v.style.cssText = `
      position: absolute;
      top: 0; bottom: 0;
      left: ${(i / divisiones) * 100}%;
      width: 1px;
      background: rgba(255,255,255,0.06);
    `;
    lineas.appendChild(v);

    const h = document.createElement('div');
    h.style.cssText = `
      position: absolute;
      left: 0; right: 0;
      top: ${(i / divisiones) * 100}%;
      height: 1px;
      background: rgba(255,255,255,0.06);
    `;
    lineas.appendChild(h);
  }
}

// ══════════════════════════════════════════════════════════════
// TOGGLE MOSTRAR / OCULTAR CONTRASEÑA
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.togglePassword;
      const input   = document.getElementById(inputId);
      if (!input) return;

      if (input.type === 'password') {
        input.type      = 'text';
        btn.textContent = 'OCULTAR';
      } else {
        input.type      = 'password';
        btn.textContent = 'MOSTRAR';
      }
    });
  });

  // Validación en tiempo real del correo
  const inputCorreo = document.getElementById('correo');
  if (inputCorreo) {
    inputCorreo.addEventListener('blur', () => {
      verificarFormatoCorreo(inputCorreo.value.trim());
    });

    inputCorreo.addEventListener('input', () => {
      const campo = document.getElementById('campoCorreo');
      if (campo && campo.classList.contains('field--error')) {
        limpiarError(campo);
      }
    });
  }

  // Inicializar retícula y captcha al cargar
  if (document.getElementById('loginGrid'))   pintarRetícula('loginGrid', 16);
  if (document.getElementById('captchaCanvas')) generarCaptchaCanvas();
});

// ══════════════════════════════════════════════════════════════
// 4.2.6 VERIFICACIÓN DE CORREO
// ══════════════════════════════════════════════════════════════

function verificarFormatoCorreo(valor) {
  const campo = document.getElementById('campoCorreo');
  if (!campo) return true;

  if (!valor) {
    mostrarError(campo, 'El correo electrónico es obligatorio.');
    return false;
  }

  if (!REGEX_CORREO.test(valor)) {
    mostrarError(campo, 'Ingresa un correo electrónico válido (ej: usuario@dominio.com).');
    return false;
  }

  const dominiosBloqueados = [
    'mailinator.com', 'tempmail.com', 'guerrillamail.com',
    'trashmail.com',  'yopmail.com'
  ];
  const dominio = valor.split('@')[1]?.toLowerCase();
  if (dominiosBloqueados.includes(dominio)) {
    mostrarError(campo, 'No se permiten correos temporales o desechables.');
    return false;
  }

  limpiarError(campo);
  return true;
}

// ══════════════════════════════════════════════════════════════
// 4.2.7 CAPTCHA CANVAS
// ══════════════════════════════════════════════════════════════

let _captchaValor    = '';
let _intentosCaptcha = 0;
const _MAX_INTENTOS  = 3;
let _bloqueado       = false;
let _timerBloqueo    = null;

function generarCaptchaCanvas(canvasId = 'captchaCanvas') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  _captchaValor = code;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Fondo
  ctx.fillStyle = '#f4f3f0';
  ctx.fillRect(0, 0, W, H);

  // Ruido de puntos
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
  }

  // Líneas curvas de interferencia
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * W, Math.random() * H);
    ctx.bezierCurveTo(
      Math.random() * W, Math.random() * H,
      Math.random() * W, Math.random() * H,
      Math.random() * W, Math.random() * H
    );
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();
  }

  // Caracteres distorsionados
  const colores = ['#3C3489', '#0F6E56', '#993C1D', '#185FA5'];
  const charW   = W / (code.length + 1);

  code.split('').forEach((ch, i) => {
    const x      = charW * (i + 0.8) + (Math.random() * 6 - 3);
    const y      = H / 2 + (Math.random() * 10 - 5);
    const angulo = (Math.random() - 0.5) * 0.45;
    const size   = 24 + Math.floor(Math.random() * 6);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    ctx.font         = `${Math.random() > 0.5 ? '700' : '500'} ${size}px monospace`;
    ctx.fillStyle    = colores[i % colores.length];
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  const captchaInput = document.getElementById('captchaInput');
  if (captchaInput) captchaInput.value = '';
}

function validarCaptcha(inputId) {
  if (_bloqueado) return false;

  const val      = document.getElementById(inputId).value.trim().toUpperCase();
  const correcto = val === _captchaValor;

  if (!correcto) {
    _intentosCaptcha++;

    if (_intentosCaptcha >= _MAX_INTENTOS) {
      bloquearFormulario();
    } else {
      mostrarError(
        document.getElementById('campoCaptcha'),
        `El código no coincide. Intento ${_intentosCaptcha} de ${_MAX_INTENTOS}.`
      );
      generarCaptchaCanvas();
    }
  } else {
    _intentosCaptcha = 0;
    limpiarError(document.getElementById('campoCaptcha'));
  }

  return correcto;
}

// ══════════════════════════════════════════════════════════════
// 4.2.8 BLOQUEO POR INTENTOS FALLIDOS
// ══════════════════════════════════════════════════════════════

function bloquearFormulario() {
  _bloqueado = true;

  // Deshabilitar todos los campos y botones
  document.getElementById('formLogin')
    .querySelectorAll('input, button')
    .forEach(el => el.disabled = true);

  // Canvas con mensaje de bloqueo
  const canvas = document.getElementById('captchaCanvas');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle    = '#cc0000';
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔒 BLOQUEADO', canvas.width / 2, canvas.height / 2);

  // Alerta principal
  const alerta = document.getElementById('loginAlert');
  mostrarAlerta(
    alerta,
    `⚠️ Has alcanzado el límite de ${_MAX_INTENTOS} intentos fallidos. Espera 60 segundos.`,
    'error'
  );

  // Contador regresivo
  let segundos   = 60;
  let msgBloqueo = document.getElementById('msgBloqueo');
  if (!msgBloqueo) {
    msgBloqueo    = document.createElement('p');
    msgBloqueo.id = 'msgBloqueo';
    msgBloqueo.style.cssText = 'color:#cc0000; font-size:13px; margin-top:6px; font-weight:600;';
    document.getElementById('campoCaptcha').appendChild(msgBloqueo);
  }
  msgBloqueo.textContent = `Podrás intentarlo de nuevo en ${segundos}s.`;

  if (_timerBloqueo) clearInterval(_timerBloqueo);

  _timerBloqueo = setInterval(() => {
    segundos--;
    msgBloqueo.textContent = `Podrás intentarlo de nuevo en ${segundos}s.`;
    if (segundos <= 0) {
      clearInterval(_timerBloqueo);
      desbloquearFormulario();
      msgBloqueo.remove();
    }
  }, 1000);
}

function desbloquearFormulario() {
  _bloqueado       = false;
  _intentosCaptcha = 0;

  document.getElementById('formLogin')
    .querySelectorAll('input, button')
    .forEach(el => el.disabled = false);

  generarCaptchaCanvas();

  const alerta   = document.getElementById('loginAlert');
  alerta.textContent = '';
  alerta.className   = 'alert';

  limpiarError(document.getElementById('campoCaptcha'));
}

// ══════════════════════════════════════════════════════════════
// LÓGICA DEL BOTÓN INICIAR SESIÓN
// ══════════════════════════════════════════════════════════════

function handleLogin() {
  if (_bloqueado) return;

  let valido = true;

  const correo   = document.getElementById('correo');
  const password = document.getElementById('password');
  const alerta   = document.getElementById('loginAlert');

  // 4.2.6 — Verificar correo
  if (!verificarFormatoCorreo(correo.value.trim())) {
    valido = false;
  }

  // Verificar contraseña
  if (password.value.length < 8) {
    mostrarError(
      document.getElementById('campoPassword'),
      'Tu contraseña debe tener al menos 8 caracteres.'
    );
    valido = false;
  } else {
    limpiarError(document.getElementById('campoPassword'));
  }

  // 4.2.7 — Verificar CAPTCHA
  if (!validarCaptcha('captchaInput')) {
    valido = false;
  } else {
    limpiarError(document.getElementById('campoCaptcha'));
  }

  if (!valido) {
    if (!_bloqueado) {
      mostrarAlerta(alerta, 'Revisa los campos marcados antes de continuar.', 'error');
    }
    return;
  }

  // Todo correcto → redirigir al home
  mostrarAlerta(alerta, '✅ Credenciales correctas. Redirigiendo…', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
}

// ══════════════════════════════════════════════════════════════
// JWT SIMULADO — Solo frontend (sin backend)
// ══════════════════════════════════════════════════════════════

function crearSesion(correo) {
  const sesion = {
    correo:  correo,
    expira:  Date.now() + (8 * 60 * 60 * 1000)  // 8 horas
  };
  localStorage.setItem('jo_sesion', JSON.stringify(sesion));
}

function sesionVigente() {
  const datos = localStorage.getItem('jo_sesion');
  if (!datos) return false;

  const sesion = JSON.parse(datos);
  return sesion.expira > Date.now();
}

function cerrarSesion() {
  localStorage.removeItem('jo_sesion');
  window.location.href = 'login.html';
}