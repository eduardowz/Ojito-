
const ADMIN_SEED_DEFAULT = {
  nombre: 'Admin general',
  correo: 'admin@juarezobserva.mx',
  password: 'Admin#2026'
};

const DURACION_SESION_ADMIN_MS = 8 * 60 * 60 * 1000; // 8 horas, igual que crearSesion()

// ── almacén de administradores (mismo patrón que _obtenerUsuarios) ──
function _obtenerAdmins() {
  try {
    return JSON.parse(localStorage.getItem('jo_admins')) || {};
  } catch { return {}; }
}

function _guardarAdmins(admins) {
  localStorage.setItem('jo_admins', JSON.stringify(admins));
}

// ── siembra del primer administrador ────────────────────────
async function sembrarAdminPorDefecto() {
  const admins = _obtenerAdmins();
  if (Object.keys(admins).length > 0) return;

  const correoKey = ADMIN_SEED_DEFAULT.correo.trim().toLowerCase();
  const passwordHash = await hashPassword(ADMIN_SEED_DEFAULT.password);
  admins[correoKey] = {
    nombre: ADMIN_SEED_DEFAULT.nombre,
    correo: correoKey,
    passwordHash,
    rol: 'administrador'
  };
  _guardarAdmins(admins);
}

// ── verificación de credenciales administrador ────────────────
async function verificarCredencialesAdmin(correo, password) {

  const passwordHash = await hashPassword(password);


  const respuesta = await fetch(
    "http://localhost:3000/api/admin/login",
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        correo: correo.trim().toLowerCase(),
        passwordHash
      })

    }
  );


  if (!respuesta.ok) {
    return null;
  }


  const datos = await respuesta.json();


  return datos.admin;

}


// ── sesión (mismo patrón que crearSesion/obtenerSesion/requireSesion) ──
function crearSesionAdmin(correo, nombre = 'Administrador') {
  const sesion = {
    correo, nombre, rol: 'administrador',
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

// Llamar al inicio de administrador_dashboard.html. Si no hay sesión
// válida (o ya expiró), redirige al login y regresa null — igual que
// requireSesion() para ciudadanos.
function requireSesionAdmin(redirectUrl = 'login.html') {
  const sesion = obtenerSesionAdmin();
  if (!sesion) { window.location.href = redirectUrl; return null; }
  return sesion;
}

function cerrarSesionAdmin(redirectUrl = 'login.html') {
  localStorage.removeItem('jo_sesion_admin');
  window.location.href = redirectUrl;
}