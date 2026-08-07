// Centro de referencia: Ciudad Juárez, Chihuahua, México
const CDJ_CENTER = [31.6904, -106.4245];
const CDJ_ZOOM = 13;

const API_BASE = 'https://ojito-a9d2.onrender.com/api';

let CATEGORIAS = {};

async function cargarCategorias() {
  try {
    const respuesta = await fetch(`${API_BASE}/categorias`);
    const datos = await respuesta.json();

    const mapa = {};
    datos.forEach(cat => {
      mapa[cat.clave] = {
        label: cat.nombre,
        color: cat.color,
        icono: cat.icono,
        institucion: cat.institucion,
        clave: cat.clave,
      };
    });
    CATEGORIAS = mapa;

  } catch (error) {
    console.error("No se pudieron cargar las categorías:", error);
    CATEGORIAS = {
      bache: { label: 'Bache', color: '#993C1D', icono: 'bache', clave: 'bache' },
    };
  }
}

function categoriaDe(clave) {
  return CATEGORIAS[clave] || { label: clave || 'Reporte', color: '#5b5870', icono: 'generico', clave };
}

function poblarSelectCategorias() {
  const select = $('repTipo');
  if (!select) return;
  select.innerHTML = '<option value="">Selecciona un tipo…</option>';
  Object.values(CATEGORIAS)
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.clave;
      opt.textContent = cat.label;
      select.appendChild(opt);
    });
}

function renderFiltrosYLeyenda() {
  const filterBar = $('filterBar');
  const legend = $('mapLegend');
  if (!filterBar || !legend) return;

  const categorias = Object.values(CATEGORIAS).sort((a, b) => a.label.localeCompare(b.label));

  filterBar.innerHTML =
    `<button class="jo-chip is-active" data-filter="todos">Todos</button>` +
    categorias.map(cat => `<button class="jo-chip" data-filter="${cat.clave}">${cat.label}</button>`).join('');

  legend.innerHTML = categorias
    .map(cat => `<span><i style="background:${cat.color}"></i>${cat.label}</span>`)
    .join('');
}

function iconSvg(type, size = 14) {
  const common = `width="${size}" height="${size}" viewBox="0 0 14 14" fill="none"`;
  switch (type) {
    case 'bache':     return `<svg ${common}><path d="M1 12l3-9h6l3 9H1z" stroke="currentColor" stroke-width="1.2"/><path d="M5 8h4M5.5 10h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`;
    case 'alumbrado': return `<svg ${common}><path d="M7 2a4 4 0 0 1 2.5 7.1V11H4.5V9.1A4 4 0 0 1 7 2z" stroke="currentColor" stroke-width="1.2"/><path d="M5 12h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    case 'basura':    return `<svg ${common}><rect x="2" y="4" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M1 4h12M5 4V3h4v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    case 'seguridad': return `<svg ${common}><path d="M7 1l5 2v4c0 2.5-2 4.5-5 6C4 11.5 2 9.5 2 7V3l5-2z" stroke="currentColor" stroke-width="1.2"/></svg>`;
    case 'incendio':  return `<svg ${common}><path d="M7 1s-1 3 1 5c0 0-2-1-2-3S4 5 4 7a3 3 0 0 0 6 0c0-3-3-6-3-6z" stroke="currentColor" stroke-width="1.2"/></svg>`;
    case 'vandalismo':return `<svg ${common}><path d="M7 2l5.5 9H1.5L7 2z" stroke="currentColor" stroke-width="1.2"/><path d="M7 6v2M7 9.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    default:          return `<svg ${common}><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2"/></svg>`;
  }
}

const STATUS_MAP = {
  pendiente: { label: 'Pendiente',   cls: 'jo-badge--pend', color: '#993C1D' },
  revision:  { label: 'En revisión', cls: 'jo-badge--rev',  color: '#185FA5' },
  resuelto:  { label: 'Resuelto',    cls: 'jo-badge--done', color: '#1d6b35' },
};

let reportes = [];
let historialUsuario = [];

let filtroActual = 'todos';
let map;
let markersLayer = {};
let pickerMap;
let pickerMarker;
let pickerLatLng = null;

const $ = (id) => document.getElementById(id);

async function cargarReportes() {

  try {

    const sesion = obtenerSesion();

    const respuesta = await fetch(`${API_BASE}/reportes?incluirResueltos=true`);

    const datos = await respuesta.json();

    reportes = datos.map(r => ({

      id: r._id,

      type: r.tipo,

      title: `${categoriaDe(r.tipo).label} · ${r.direccion}`,

      addr: r.direccion || "Sin dirección",
      descripcion: r.descripcion,

      time: tiempoTranscurrido(r.createdAt),
      fecha: r.createdAt,

      status: r.estado,

      progress: r.progreso,

      inst: r.institucion || null,

      bitacora: r.bitacora || [],

      lat: r.latitud,

      lng: r.longitud,

      mine: sesion && r.ciudadano?.correo === sesion.correo

    }));

    renderPins();
    renderReportList();
    renderMisReportes();
    renderPerfilStats();

  } catch (error) {

    console.error(error);

  }

}

// ══════════════════════════════════════════════════════════════
// HISTORIAL DE ACTIVIDAD — persistido en MongoDB (Usuario.historial)
// ══════════════════════════════════════════════════════════════
async function cargarHistorialUsuario() {

  const sesion = obtenerSesion();
  if (!sesion) return;

  try {

    const respuesta = await fetchAutenticado(`${API_BASE}/usuarios/${sesion.correo}/historial`);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo cargar el historial.');
    }

    historialUsuario = datos.historial || [];

  } catch (error) {
    console.error(error);
    historialUsuario = [];
  }
}

async function guardarEventoHistorial(mensaje) {

  const sesion = obtenerSesion();
  if (!sesion) return;

  try {

    const respuesta = await fetchAutenticado(`${API_BASE}/usuarios/${sesion.correo}/historial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mensaje })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo guardar el evento.');
    }

    historialUsuario = datos.historial || historialUsuario;

  } catch (error) {
    console.error(error);
  }
}

function tiempoTranscurrido(fecha) {

  const ahora = new Date();

  const creado = new Date(fecha);

  const segundos = Math.floor((ahora - creado) / 1000);

  if (segundos < 60) return "Hace unos segundos";

  const minutos = Math.floor(segundos / 60);

  if (minutos < 60)
    return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);

  if (horas < 24)
    return `Hace ${horas} h`;

  const dias = Math.floor(horas / 24);

  return `Hace ${dias} día${dias > 1 ? "s" : ""}`;

}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const sesion = requireSesion('login.html');
  if (!sesion) return;

  aplicarSesionEnUI(sesion);

  await cargarCategorias();
  renderFiltrosYLeyenda();
  poblarSelectCategorias();

  initMapaPrincipal();
  await cargarReportes();
  await cargarHistorialUsuario();
  renderHistorial();
  renderNotificaciones();

  initNav();
  initNotif();
  initFiltros();
  initModalReporte();
  initModalDetalle();
  initPerfil();
  initLocate();
  initAutocompleDireccion();

  const filtro = $('filtroMisReportes');
  if (filtro) filtro.addEventListener('change', () => renderMisReportes(filtro.value));
});

function aplicarSesionEnUI(sesion) {
  const iniciales = inicialesDeNombre(sesion.nombre);
  $('navAvatar').textContent = iniciales;
  $('perfilAvatar').textContent = iniciales;
  $('perfilNombre').textContent = sesion.nombre;
  $('editNombre').value = sesion.nombre;
  $('editCorreo').value = sesion.correo;
}

// ══════════════════════════════════════════════════════════════
// MAPA PRINCIPAL
// ══════════════════════════════════════════════════════════════
function initMapaPrincipal() {
  map = L.map('leafletMap', {
    center: CDJ_CENTER,
    zoom: CDJ_ZOOM,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  map.zoomControl.setPosition('bottomright');

  renderPins();
}

function pinDivIcon(type) {
  const cfg = categoriaDe(type);
  return L.divIcon({
    className: 'jo-pin',
    html: `<div class="jo-pin__dot" style="background:${cfg.color};">${iconSvg(cfg.icono)}</div><div class="jo-pin__label">${cfg.label}</div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

function renderPins() {
  Object.values(markersLayer).forEach(m => map.removeLayer(m));
  markersLayer = {};

  const base = reportes.filter(r => r.status !== 'resuelto');
  const lista = filtroActual === 'todos' ? base : base.filter(r => r.type === filtroActual);

  lista.forEach(r => {
    const marker = L.marker([r.lat, r.lng], { icon: pinDivIcon(r.type) }).addTo(map);

    marker.bindPopup(`
      <div class="jo-popup__title">${r.title}</div>
      <div class="jo-popup__meta">${r.time} · ${r.addr}</div>
      <button class="jo-popup__btn" onclick="abrirDetalle('${r.id}')">Ver detalle</button>
    `);

    markersLayer[r.id] = marker;
  });
}

function centrarEnReporte(id) {
  const r = reportes.find(x => x.id === id);
  if (!r || !map) return;
  map.flyTo([r.lat, r.lng], 16, { duration: 0.6 });
  markersLayer[id]?.openPopup();
}

// ══════════════════════════════════════════════════════════════
// GEOLOCALIZACIÓN
// ══════════════════════════════════════════════════════════════
function initLocate() {
  $('btnLocate').addEventListener('click', () => {
    if (!navigator.geolocation) {
      mostrarToast('Tu navegador no soporta geolocalización.');
      return;
    }
    $('btnLocate').style.opacity = '.5';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { duration: 0.7 });
        L.circleMarker([latitude, longitude], {
          radius: 8, color: '#0F6E56', weight: 2, fillColor: '#0F6E56', fillOpacity: .35,
        }).addTo(map).bindPopup('Tu ubicación aproximada').openPopup();
        $('btnLocate').style.opacity = '1';
      },
      () => {
        mostrarToast('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
        $('btnLocate').style.opacity = '1';
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// ══════════════════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════════════════
function initNav() {
  const links = {
    navMapa: 'sec-mapa',
    navMisReportes: 'sec-mis-reportes',
    navPerfil: 'sec-perfil',
  };
  Object.entries(links).forEach(([btnId, sectionId]) => {
    $(btnId).addEventListener('click', () => irASeccion(btnId, sectionId));
  });
  $('navAvatar').addEventListener('click', () => irASeccion('navPerfil', 'sec-perfil'));
}

function irASeccion(btnId, sectionId) {
  document.querySelectorAll('.jo-nav__link').forEach(b => b.classList.remove('is-active'));
  $(btnId).classList.add('is-active');
  document.querySelectorAll('.jo-section').forEach(s => s.classList.remove('is-active'));
  $(sectionId).classList.add('is-active');
  cerrarNotif();

  if (sectionId === 'sec-mapa' && map) {
    setTimeout(() => map.invalidateSize(), 50);
  }
}

// ══════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ══════════════════════════════════════════════════════════════

function claveNotifLeidas() {
  const sesion = obtenerSesion();
  return sesion ? `jo_notif_leidas_${sesion.correo}` : 'jo_notif_leidas';
}

function obtenerNotifLeidas() {
  try {
    return JSON.parse(localStorage.getItem(claveNotifLeidas())) || [];
  } catch {
    return [];
  }
}

function guardarNotifLeidas(ids) {
  localStorage.setItem(claveNotifLeidas(), JSON.stringify(ids));
}

function generarNotificaciones() {
  const mias = reportes.filter(r => r.mine);
  const notifs = [];

  mias.forEach(r => {
    if (r.status === 'revision') {
      notifs.push({
        id: `rep-${r.id}-revision`,
        msg: `Tu reporte de ${categoriaDe(r.type).label} fue asignado${r.inst ? ' a ' + r.inst : ' a revisión'}.`,
        fecha: r.fecha,
      });
    } else if (r.status === 'resuelto') {
      notifs.push({
        id: `rep-${r.id}-resuelto`,
        msg: `Tu reporte de ${categoriaDe(r.type).label} fue marcado como resuelto.`,
        fecha: r.fecha,
      });
    }

    (r.bitacora || []).forEach((avance) => {
      notifs.push({
        id: `bit-${r.id}-${avance.fecha}`,
        msg: `Nuevo avance: ${avance.texto || 'Se agregó evidencia al reporte.'}`,
        fecha: avance.fecha,
      });
    });
  });

  (historialUsuario || []).forEach((h, i) => {
    notifs.push({
      id: `hist-${i}-${h.fecha}`,
      msg: h.mensaje,
      fecha: h.fecha,
    });
  });

  return notifs
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);
}

function renderNotificaciones() {
  const panel = $('notifPanel');
  const notifs = generarNotificaciones();
  const leidas = obtenerNotifLeidas();
  const noLeidas = notifs.filter(n => !leidas.includes(n.id));

  panel.querySelectorAll('.jo-notif-dynamic').forEach(el => el.remove());

  const referencia = $('btnClearNotif');

  if (!notifs.length) {
    const vacio = document.createElement('div');
    vacio.className = 'jo-notif-dynamic';
    vacio.style.cssText = 'padding:1.2rem;text-align:center;color:var(--jo-muted);font-size:13px;';
    vacio.textContent = 'No tienes notificaciones por ahora.';
    panel.insertBefore(vacio, referencia);
  } else {
    notifs.forEach(n => {
      const esNoLeida = !leidas.includes(n.id);
      const item = document.createElement('div');
      item.className = `jo-notifitem jo-notif-dynamic${esNoLeida ? ' is-unread' : ''}`;
      item.innerHTML = `
        ${esNoLeida ? '<span class="jo-notifdot"></span>' : ''}
        <div>
          <p>${n.msg}</p>
          <span>${tiempoTranscurrido(n.fecha)}</span>
        </div>`;
      panel.insertBefore(item, referencia);
    });
  }

  const badge = $('notifCount');
  if (noLeidas.length) {
    badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function initNotif() {
  $('btnNotif').addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = $('notifPanel');
    const abierto = !panel.hidden;
    panel.hidden = abierto;
    $('btnNotif').setAttribute('aria-expanded', String(!abierto));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notifPanel') && !e.target.closest('#btnNotif')) cerrarNotif();
  });
  $('btnClearNotif').addEventListener('click', () => {
    const notifs = generarNotificaciones();
    guardarNotifLeidas(notifs.map(n => n.id));
    renderNotificaciones();
  });
}

function cerrarNotif() {
  $('notifPanel').hidden = true;
  $('btnNotif').setAttribute('aria-expanded', 'false');
}

// ══════════════════════════════════════════════════════════════
// FILTROS Y LISTA LATERAL
// ══════════════════════════════════════════════════════════════
function initFiltros() {
  $('filterBar').addEventListener('click', (e) => {
    const chip = e.target.closest('.jo-chip');
    if (!chip) return;
    document.querySelectorAll('.jo-chip').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    filtroActual = chip.dataset.filter;
    renderPins();
    renderReportList();
  });

  document.querySelectorAll('.jo-listtab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.jo-listtab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderReportList(tab.dataset.list === 'recientes');
    });
  });
}

function renderReportList(ordenarRecientes = false) {
  const el = $('reportList');

  const base = reportes.filter(r => r.status !== 'resuelto');
  let lista = filtroActual === 'todos' ? base : base.filter(r => r.type === filtroActual);
  if (ordenarRecientes) lista = [...lista].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (!lista.length) {
    el.innerHTML = `<p style="padding:1rem;text-align:center;font-size:13px;color:var(--jo-muted);">Sin reportes en esta categoría.</p>`;
    return;
  }

  el.innerHTML = lista.map(r => {
    const cfg = categoriaDe(r.type);
    const st = STATUS_MAP[r.status];
    return `
      <div class="jo-rcard" data-id="${r.id}">
        <div class="jo-rcard__thumb" style="color:${cfg.color};">${iconSvg(cfg.icono)}</div>
        <div class="jo-rcard__info">
          <div class="jo-rcard__title">${r.title}</div>
          <div class="jo-rcard__meta">${r.time} · ${r.addr}</div>
          <div class="jo-progbar"><div class="jo-progfill" style="width:${r.progress}%; background:${st.color};"></div></div>
          <div class="jo-proglabel">${r.inst ? 'Atendido por ' + r.inst : 'Sin institución asignada'}</div>
        </div>
        <span class="jo-badge ${st.cls}">${st.label}</span>
      </div>`;
  }).join('');

  el.querySelectorAll('.jo-rcard').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      centrarEnReporte(id);
      abrirDetalle(id);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// MIS REPORTES
// ══════════════════════════════════════════════════════════════
function renderMisReportes(filtroEstado = 'todos') {
  const el = $('misReportesList');
  const mias = reportes.filter(r => r.mine && (filtroEstado === 'todos' || r.status === filtroEstado));

  if (!mias.length) {
    el.innerHTML = `<p style="text-align:center;padding:2.5rem;color:var(--jo-muted);font-size:14px;">No tienes reportes con ese estado.</p>`;
    return;
  }

  el.innerHTML = mias.map(r => {
    const cfg = categoriaDe(r.type);
    const st = STATUS_MAP[r.status];
    return `
      <div class="jo-myrcard" data-id="${r.id}">
        <div class="jo-myrcard__thumb" style="color:${cfg.color};">${iconSvg(cfg.icono)}</div>
        <div>
          <div class="jo-myrcard__title">${r.title}</div>
          <div class="jo-myrcard__meta">${r.time} · ${r.addr}</div>
          <div class="jo-progbar" style="width:160px;"><div class="jo-progfill" style="width:${r.progress}%; background:${st.color};"></div></div>
        </div>
        <div class="jo-myrcard__side">
          <span class="jo-badge ${st.cls}">${st.label}</span>
          <span class="jo-myrcard__id">#${r.id}</span>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.jo-myrcard').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      abrirDetalle(id);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// PERFIL
// ══════════════════════════════════════════════════════════════
function renderPerfilStats() {
  const mias = reportes.filter(r => r.mine);
  $('statTotal').textContent = mias.length;
  $('statResueltos').textContent = mias.filter(r => r.status === 'resuelto').length;
  $('statPendientes').textContent = mias.filter(r => r.status === 'pendiente').length;
}

function renderHistorial() {
  const mias = reportes.filter(r => r.mine);

  const eventosReportes = mias.map(r => {
    let msg = `Enviaste el reporte · ${categoriaDe(r.type).label}`;
    if (r.status === 'resuelto') msg = `Tu reporte de ${categoriaDe(r.type).label} fue marcado como resuelto`;
    else if (r.status === 'revision') msg = `Tu reporte de ${categoriaDe(r.type).label} está en revisión`;
    return { msg, fecha: r.fecha || new Date(0) };
  });

  const eventosGuardados = (historialUsuario || []).map(h => ({
    msg: h.mensaje,
    fecha: h.fecha
  }));

  const historial = [...eventosReportes, ...eventosGuardados]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 6)
    .map(h => ({ msg: h.msg, time: tiempoTranscurrido(h.fecha) }));

  if (!historial.length) {
    $('perfilHistory').innerHTML = `<p style="text-align:center;padding:1rem;color:var(--jo-muted);font-size:13px;">Aún no tienes actividad registrada.</p>`;
    return;
  }

  $('perfilHistory').innerHTML = historial.map(h => `
    <div class="jo-history__item">
      <svg viewBox="0 0 14 14" fill="none" width="13" height="13" style="color:var(--jo-muted);flex-shrink:0;"><rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 5h6M4 7h6M4 9h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
      <span>${h.msg}</span>
      <span class="jo-history__time">${h.time}</span>
    </div>`).join('');
}

function initPerfil() {
  $('btnEditarPerfil').addEventListener('click', () => {
    $('formEditarPerfil').hidden = false;
    $('btnEditarPerfil').hidden = true;
  });

  $('btnCancelarEdicion').addEventListener('click', () => {
    $('formEditarPerfil').hidden = true;
    $('btnEditarPerfil').hidden = false;
    $('perfilAlert').textContent = '';
    $('perfilAlert').className = 'alert';
  });

  $('formEditarPerfil').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = $('editNombre').value.trim();
    const correo = $('editCorreo').value.trim();
    let valido = true;

    if (nombre.length < 3) {
      mostrarError($('campoEditNombre'), 'Ingresa tu nombre completo.');
      valido = false;
    } else {
      limpiarError($('campoEditNombre'));
    }

    if (!REGEX_CORREO.test(correo)) {
      mostrarError($('campoEditCorreo'), 'Ingresa un correo electrónico válido.');
      valido = false;
    } else {
      limpiarError($('campoEditCorreo'));
    }

    const nuevaPass = $('editPassword').value;
    if (nuevaPass && nuevaPass.length < 8) {
      mostrarError($('campoEditPassword'), 'La contraseña debe tener al menos 8 caracteres.');
      valido = false;
    } else {
      limpiarError($('campoEditPassword'));
    }

    if (!valido) {
      mostrarAlerta($('perfilAlert'), 'Revisa los campos marcados antes de continuar.', 'error');
      return;
    }

    const sesion = obtenerSesion();
    try {

      let passwordHash = "";

      if ($('editPassword').value.trim() !== "") {
        passwordHash = await hashPassword($('editPassword').value.trim());
      }

      const respuesta = await fetchAutenticado(`${API_BASE}/usuarios/${sesion.correo}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          correo,
          telefono: sesion.telefono,
          passwordHash
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje);
      }

      // 👇 Si el correo cambió, el token viejo queda desincronizado
      // (el backend valida req.usuario.correo === req.params.correo).
      // Forzamos cerrar sesión para que vuelva a loguearse con un token nuevo.
      if (datos.usuario.correo !== sesion.correo) {
        mostrarAlerta($('perfilAlert'), '✅ Correo actualizado. Por seguridad, vuelve a iniciar sesión.', 'success');
        setTimeout(() => cerrarSesion('login.html'), 1500);
        return;
      }

      sesion.nombre = datos.usuario.nombre;
      sesion.correo = datos.usuario.correo;

      localStorage.setItem("jo_sesion", JSON.stringify(sesion));

      aplicarSesionEnUI(sesion);

      mostrarAlerta($('perfilAlert'), '✅ Perfil actualizado correctamente.', 'success');

      $('editPassword').value = "";

    } catch (error) {

      mostrarAlerta($('perfilAlert'), error.message, 'error');

      return;

    }

    setTimeout(() => {
      $('formEditarPerfil').hidden = true;
      $('btnEditarPerfil').hidden = false;
    }, 1100);
  });

  $('btnCerrarSesion').addEventListener('click', () => {
    cerrarSesion('login.html');
  });
}

// ══════════════════════════════════════════════════════════════
// MODAL — NUEVO REPORTE
// ══════════════════════════════════════════════════════════════
function initModalReporte() {
  $('btnNuevoReporte').addEventListener('click', abrirModalReporte);
  $('btnCerrarModal').addEventListener('click', cerrarModalReporte);
  $('btnCancelarReporte').addEventListener('click', cerrarModalReporte);
  $('modalOverlay').addEventListener('click', (e) => {
    if (e.target === $('modalOverlay')) { e.stopPropagation(); cerrarModalReporte(); }
  });

  $('uploadZone').addEventListener('click', () => $('repFoto').click());
  $('repFoto').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      $('uploadPreview').innerHTML = `<img src="${ev.target.result}" alt="Vista previa de la fotografía">`;
      $('uploadPreview').hidden = false;
      $('uploadPrompt').hidden = true;
    };
    reader.readAsDataURL(file);
  });

  $('formNuevoReporte').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarNuevoReporte();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarModalReporte();
      cerrarModalDetalle();
    }
  });
}

function abrirModalReporte() {
  cerrarModalDetalle();

  $('modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';

  const centroInicial = map ? map.getCenter() : L.latLng(CDJ_CENTER[0], CDJ_CENTER[1]);
  pickerLatLng = centroInicial;

  montarPickerMap(centroInicial);
}

function montarPickerMap(centroInicial) {
  const construir = () => {
    if (!pickerMap) {
      pickerMap = L.map('pickerMap', {
        center: centroInicial,
        zoom: 15,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(pickerMap);

      pickerMarker = L.marker(centroInicial, { draggable: true }).addTo(pickerMap);

      pickerMarker.on('dragend', () => {
        pickerLatLng = pickerMarker.getLatLng();
        actualizarCoordsTexto();
      });

      pickerMap.on('click', (e) => {
        pickerLatLng = e.latlng;
        pickerMarker.setLatLng(e.latlng);
        actualizarCoordsTexto();
      });
    } else {
      pickerMap.setView(centroInicial, 15);
      pickerMarker.setLatLng(centroInicial);
    }

    [50, 150, 350].forEach(ms => {
      setTimeout(() => {
        if (pickerMap) pickerMap.invalidateSize();
      }, ms);
    });

    actualizarCoordsTexto();
  };

  requestAnimationFrame(() => requestAnimationFrame(construir));
}

function actualizarCoordsTexto() {
  if (!pickerLatLng) return;
  $('pickerCoords').textContent =
    `Ubicación seleccionada: ${pickerLatLng.lat.toFixed(5)}, ${pickerLatLng.lng.toFixed(5)}`;
}

function cerrarModalReporte() {
  $('modalOverlay').hidden = true;
  document.body.style.overflow = '';
  $('formNuevoReporte').reset();
  $('uploadPreview').hidden = true;
  $('uploadPrompt').hidden = false;
  document.querySelector('input[name="urgencia"][value="media"]').checked = true;
  ['campoTipo', 'campoDescripcion'].forEach(id => limpiarError($(id)));
  $('reporteAlert').textContent = '';
  $('reporteAlert').className = 'alert';
}

async function enviarNuevoReporte() {
  const tipo = $('repTipo').value;
  const desc = $('repDesc').value.trim();
  let valido = true;

  if (!tipo) {
    mostrarError($('campoTipo'), 'Selecciona el tipo de incidente.');
    valido = false;
  } else {
    limpiarError($('campoTipo'));
  }

  if (desc.length < 10) {
    mostrarError($('campoDescripcion'), 'Describe el problema con al menos 10 caracteres.');
    valido = false;
  } else {
    limpiarError($('campoDescripcion'));
  }

  if (!valido) {
    mostrarAlerta($('reporteAlert'), 'Revisa los campos marcados antes de continuar.', 'error');
    return;
  }

  const btn = $('btnEnviarReporte');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {

    const sesion = obtenerSesion();

    const addr = $('repAddr').value.trim() || 'Dirección no especificada';

    const lat = pickerLatLng ? pickerLatLng.lat : CDJ_CENTER[0];
    const lng = pickerLatLng ? pickerLatLng.lng : CDJ_CENTER[1];

    const urgencia = document.querySelector('input[name="urgencia"]:checked')?.value || 'media';

    const editando = $('formNuevoReporte').dataset.editando;

    const url = editando
      ? `${API_BASE}/reportes/${editando}`
      : `${API_BASE}/reportes`;

    const respuesta = await fetchAutenticado(url, {

      method: editando ? 'PUT' : 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        correo: sesion.correo,
        tipo,
        descripcion: desc,
        direccion: addr,
        latitud: lat,
        longitud: lng,
        urgencia,
        foto: ''
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo registrar el reporte.');
    }

    await cargarReportes();

    $('formNuevoReporte').dataset.editando = '';
    $('btnEnviarReporte').textContent = 'Enviar reporte';
    cerrarModalReporte();
    renderPins();
    renderReportList();
    renderMisReportes();
    renderPerfilStats();
    renderHistorial();
    renderNotificaciones();

    if (map) map.flyTo([lat, lng], 16, { duration: 0.6 });

    mostrarToast('✓ Reporte enviado correctamente');

  } catch (error) {

    console.error(error);

    mostrarAlerta($('reporteAlert'), error.message, 'error');

  } finally {

    btn.disabled = false;
    btn.textContent = 'Enviar reporte';

  }
}

// ══════════════════════════════════════════════════════════════
// AUTOCOMPLETADO DE DIRECCIÓN — Nominatim
// ══════════════════════════════════════════════════════════════

const CDJ_VIEWBOX = '-106.62,31.85,-106.25,31.55';

let addrDebounceTimer = null;

function initAutocompleDireccion() {
  const input = $('repAddr');
  const box = $('addrSuggestions');
  if (!input || !box) return;

  input.addEventListener('input', () => {
    const texto = input.value.trim();
    clearTimeout(addrDebounceTimer);

    if (texto.length < 3) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.innerHTML = `<div class="jo-suggestion-loading">Buscando…</div>`;
    box.hidden = false;

    addrDebounceTimer = setTimeout(() => buscarDirecciones(texto), 400);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#campoDireccion')) {
      box.hidden = true;
    }
  });
}

const _cacheDirecciones = new Map();

async function buscarDirecciones(texto) {
  const box = $('addrSuggestions');
  const claveCache = texto.trim().toLowerCase();

  if (_cacheDirecciones.has(claveCache)) {
    mostrarSugerencias(_cacheDirecciones.get(claveCache));
    return;
  }

  try {
    let resultados = await intentarBusquedaNominatim(texto, true);

    if (!resultados.length) {
      resultados = await intentarBusquedaNominatim(texto, false);
    }

    _cacheDirecciones.set(claveCache, resultados);

    if (!resultados.length) {
      box.innerHTML = `<div class="jo-suggestion-empty">Sin coincidencias en el mapa. Escribe la referencia manualmente y ajusta el punto abajo.</div>`;
      box.hidden = false;
      return;
    }

    mostrarSugerencias(resultados);

  } catch (error) {
    console.error('Error de geocodificación:', error);
    box.innerHTML = `<div class="jo-suggestion-empty">No se pudo buscar. Escribe la dirección manualmente.</div>`;
  }
}

function mostrarSugerencias(resultados) {
  const box = $('addrSuggestions');

  box.innerHTML = resultados.map((r, i) => `
    <div class="jo-suggestion-item" data-index="${i}">${r.display_name}</div>
  `).join('');
  box.hidden = false;

  box.querySelectorAll('.jo-suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const r = resultados[item.dataset.index];
      seleccionarDireccion(r);
    });
  });
}

async function intentarBusquedaNominatim(texto, sesgadoAJuarez) {
  const base = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=mx';

  const url = sesgadoAJuarez
    ? `${base}&viewbox=${CDJ_VIEWBOX}&q=${encodeURIComponent(texto + ', Ciudad Juárez, Chihuahua')}`
    : `${base}&q=${encodeURIComponent(texto + ', Juárez, Chihuahua, México')}`;

  const respuesta = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if (!respuesta.ok) return [];
  return await respuesta.json();
}

function seleccionarDireccion(resultado) {
  const lat = parseFloat(resultado.lat);
  const lng = parseFloat(resultado.lon);

  const nombreCorto = resultado.display_name.split(',').slice(0, 2).join(',').trim();
  $('repAddr').value = nombreCorto;
  $('addrSuggestions').hidden = true;

  pickerLatLng = L.latLng(lat, lng);
  if (pickerMarker && pickerMap) {
    pickerMarker.setLatLng(pickerLatLng);
    pickerMap.setView(pickerLatLng, 16);
  }
  actualizarCoordsTexto();
}

// ══════════════════════════════════════════════════════════════
// MODAL — DETALLE DE REPORTE
// ══════════════════════════════════════════════════════════════
function initModalDetalle() {
  const btnCerrar = $('btnCerrarDetalle');
  const overlay   = $('detailOverlay');

  if (btnCerrar) {
    btnCerrar.addEventListener('click', cerrarModalDetalle);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { e.stopPropagation(); cerrarModalDetalle(); }
    });
  }
}

function abrirDetalle(id) {
  const r = reportes.find(x => x.id === id);
  if (!r) return;
  const cfg = categoriaDe(r.type);
  const st = STATUS_MAP[r.status];

  $('detailTitle').textContent = `${cfg.label} · ${r.addr}`;
  $('detailBody').innerHTML = `
    <div style="height:110px;background:var(--jo-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;color:${cfg.color};margin-bottom:1rem;">
      <span style="display:flex;">${iconSvg(cfg.icono, 40)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px;">
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--jo-muted);">Tipo</span><strong>${cfg.label}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--jo-muted);">Dirección</span><strong>${r.addr}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--jo-muted);">Coordenadas</span><strong>${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--jo-muted);">Enviado</span><strong>${r.time}</strong></div>
      <div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:var(--jo-muted);">Estado</span><span class="jo-badge ${st.cls}">${st.label}</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--jo-muted);">Institución</span><strong>${r.inst || 'Sin asignar'}</strong></div>
    </div>
    <div style="margin-top:1.1rem;">
      <div style="font-size:11.5px;color:var(--jo-muted);margin-bottom:5px;">Progreso de atención</div>
      <div style="height:7px;background:var(--jo-border);border-radius:4px;overflow:hidden;">
        <div style="width:${r.progress}%;height:100%;background:${st.color};border-radius:4px;"></div>
      </div>
      <div style="font-size:11px;color:var(--jo-muted);margin-top:5px;">${r.progress}% completado</div>

      ${r.mine ? `
      <button 
        class="btn btn--primary"
        style="margin-top:1rem;width:100%;"
        onclick="editarReporte('${r.id}')">
        Editar reporte
      </button>
    ` : ''}

      ${r.mine && r.status === 'pendiente' ? `
      <button 
        class="btn btn--danger-outline"
        style="margin-top:0.6rem;width:100%;"
        onclick="eliminarReporte('${r.id}')">
        Eliminar reporte
      </button>
      ` : ''}

    </div>`;

  $('detailOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function editarReporte(id) {

  const r = reportes.find(x => x.id === id);

  if (!r) {
    mostrarToast("No se encontró el reporte");
    return;
  }

  cerrarModalDetalle();

  $('modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';

  $('repTipo').value = r.type;
  $('repDesc').value = r.descripcion || '';
  $('repAddr').value = r.addr;

  pickerLatLng = { lat: r.lat, lng: r.lng };

  montarPickerMap(pickerLatLng);

  $('formNuevoReporte').dataset.editando = r.id;

  $('btnEnviarReporte').textContent = "Guardar cambios";
}

async function eliminarReporte(id) {

  const confirmar = confirm("¿Seguro que quieres eliminar este reporte? Esta acción no se puede deshacer.");
  if (!confirmar) return;

  try {

    const r = reportes.find(x => x.id === id);
    const etiquetaTipo = r ? categoriaDe(r.type).label : 'reporte';

    const respuesta = await fetchAutenticado(`${API_BASE}/reportes/${id}`, {
      method: "DELETE"
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo eliminar el reporte.");
    }

    await guardarEventoHistorial(`Eliminaste tu reporte de ${etiquetaTipo}`);

    cerrarModalDetalle();
    await cargarReportes();
    renderPins();
    renderReportList();
    renderMisReportes();
    renderPerfilStats();
    renderHistorial();
    renderNotificaciones();

    mostrarToast("✓ Reporte eliminado correctamente");

  } catch (error) {
    console.error(error);
    mostrarToast(error.message);
  }
}

function cerrarModalDetalle() {
  const overlay = $('detailOverlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function mostrarToast(mensaje, ms = 3000) {
  const t = $('toast');
  t.textContent = mensaje;
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, ms);
}