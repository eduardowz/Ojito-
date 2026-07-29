// ══════════════════════════════════════════════════════════════
// JUÁREZ OBSERVA · ciudadano.js
// Lógica exclusiva de ciudadano.html — ahora con mapa real
// (Leaflet + OpenStreetMap), geolocalización y selector de
// ubicación para nuevos reportes.
//
// Depende de utilidades definidas en app.js:
//   requireSesion(), obtenerSesion(), cerrarSesion(), inicialesDeNombre()
// Depende de la librería global Leaflet (cargada vía CDN en el HTML).
// ══════════════════════════════════════════════════════════════

// Centro de referencia: Ciudad Juárez, Chihuahua, México
const CDJ_CENTER = [31.6904, -106.4245];
const CDJ_ZOOM = 13;

const TIPOS = {
  bache:      { label: 'Bache',      color: '#993C1D' },
  alumbrado:  { label: 'Alumbrado',  color: '#b8860b' },
  basura:     { label: 'Basura',     color: '#185FA5' },
  seguridad:  { label: 'Seguridad',  color: '#3C3489' },
  incendio:   { label: 'Incendio',   color: '#a32d2d' },
  vandalismo: { label: 'Vandalismo', color: '#444444' },
};

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

// Coordenadas reales aproximadas dentro de Ciudad Juárez para cada reporte demo
let reportes = [
  { id: 101, type: 'bache',     title: 'Bache en Av. Tecnológico',  addr: 'Av. Tecnológico, Col. Partido Romero', time: 'Hace 2 h',   status: 'pendiente', progress: 10,  inst: null,                lat: 31.6852, lng: -106.4010, mine: true },
  { id: 102, type: 'alumbrado', title: 'Alumbrado dañado Plutarco', addr: 'Calle Plutarco Elías Calles, Col. Independencia', time: 'Ayer', status: 'revision', progress: 60, inst: 'Alumbrado / JMAS', lat: 31.7105, lng: -106.4495, mine: true },
  { id: 103, type: 'basura',    title: 'Acumulación de basura',     addr: 'Col. Fronteriza',                      time: 'Hace 3 días', status: 'resuelto',  progress: 100, inst: 'Obras Públicas',    lat: 31.6735, lng: -106.4685, mine: false },
  { id: 104, type: 'seguridad', title: 'Situación sospechosa',      addr: 'Col. Aeropuerto',                      time: 'Hace 3 h',    status: 'resuelto',  progress: 100, inst: 'Policía Municipal', lat: 31.6361, lng: -106.4275, mine: false },
  { id: 105, type: 'bache',     title: 'Bache frente a escuela',    addr: 'Col. Altavista',                       time: 'Hace 5 h',    status: 'pendiente', progress: 0,   inst: null,                lat: 31.7245, lng: -106.4870, mine: true },
];

let filtroActual = 'todos';
let map;                 // mapa principal (Leaflet)
let markersLayer = {};   // id -> L.marker, para poder limpiarlos al filtrar
let pickerMap;           // mini-mapa dentro del modal de nuevo reporte
let pickerMarker;        // marcador arrastrable del picker
let pickerLatLng = null; // última posición elegida en el picker

const $ = (id) => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// INIT — exige sesión vigente antes de mostrar nada
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const sesion = requireSesion('login.html');
  if (!sesion) return; // requireSesion ya redirigió

  aplicarSesionEnUI(sesion);

  initMapaPrincipal();
  renderReportList();
  renderMisReportes();
  renderPerfilStats();
  renderHistorial();

  initNav();
  initNotif();
  initFiltros();
  initModalReporte();
  initModalDetalle();
  initPerfil();
  initLocate();

  // Filtro mis reportes — unificado aquí para evitar doble DOMContentLoaded
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
// MAPA PRINCIPAL (Leaflet real, OpenStreetMap)
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

  // mueve el control de zoom para no chocar con los chips de filtro
  map.zoomControl.setPosition('bottomright');

  renderPins();
}

function pinDivIcon(type) {
  const cfg = TIPOS[type] || TIPOS.bache;
  return L.divIcon({
    className: 'jo-pin',
    html: `<div class="jo-pin__dot" style="background:${cfg.color};">${iconSvg(type)}</div><div class="jo-pin__label">${cfg.label}</div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

function renderPins() {
  // limpia marcadores existentes
  Object.values(markersLayer).forEach(m => map.removeLayer(m));
  markersLayer = {};

  const lista = filtroActual === 'todos' ? reportes : reportes.filter(r => r.type === filtroActual);

  lista.forEach(r => {
    const marker = L.marker([r.lat, r.lng], { icon: pinDivIcon(r.type) }).addTo(map);

    marker.bindPopup(`
      <div class="jo-popup__title">${r.title}</div>
      <div class="jo-popup__meta">${r.time} · ${r.addr}</div>
      <button class="jo-popup__btn" onclick="abrirDetalle(${r.id})">Ver detalle</button>
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
// GEOLOCALIZACIÓN — botón "usar mi ubicación"
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

  // Leaflet necesita recalcular su tamaño si estuvo oculto (display:none)
  if (sectionId === 'sec-mapa' && map) {
    setTimeout(() => map.invalidateSize(), 50);
  }
}

// ══════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ══════════════════════════════════════════════════════════════
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
    $('notifCount').style.display = 'none';
    document.querySelectorAll('.jo-notifitem.is-unread').forEach(i => {
      i.classList.remove('is-unread');
      i.querySelector('.jo-notifdot')?.remove();
    });
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
  let lista = filtroActual === 'todos' ? reportes : reportes.filter(r => r.type === filtroActual);
  if (ordenarRecientes) lista = [...lista].sort((a, b) => b.id - a.id);

  if (!lista.length) {
    el.innerHTML = `<p style="padding:1rem;text-align:center;font-size:13px;color:var(--jo-muted);">Sin reportes en esta categoría.</p>`;
    return;
  }

  el.innerHTML = lista.map(r => {
    const cfg = TIPOS[r.type];
    const st = STATUS_MAP[r.status];
    return `
      <div class="jo-rcard" data-id="${r.id}">
        <div class="jo-rcard__thumb" style="color:${cfg.color};">${iconSvg(r.type)}</div>
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
      const id = Number(card.dataset.id);
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
    const cfg = TIPOS[r.type];
    const st = STATUS_MAP[r.status];
    return `
      <div class="jo-myrcard" data-id="${r.id}">
        <div class="jo-myrcard__thumb" style="color:${cfg.color};">${iconSvg(r.type)}</div>
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
      const id = Number(card.dataset.id);
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
  const historial = [
    { msg: 'Enviaste el reporte #105 · Bache frente a escuela', time: 'Hace 5 h' },
    { msg: 'Reporte #102 asignado a Alumbrado / JMAS',          time: 'Ayer' },
    { msg: 'Reporte #101 en revisión por Obras Públicas',        time: 'Hace 3 días' },
    { msg: 'Creaste tu cuenta',                                  time: '10 jun' },
  ];
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

  $('formEditarPerfil').addEventListener('submit', (e) => {
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
    if (sesion) {
      sesion.nombre = nombre;
      sesion.correo = correo;
      localStorage.setItem('jo_sesion', JSON.stringify(sesion));
      aplicarSesionEnUI(sesion);
    }

    mostrarAlerta($('perfilAlert'), '✅ Perfil actualizado correctamente.', 'success');
    $('editPassword').value = '';
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
// MODAL — NUEVO REPORTE (con mini-mapa selector de ubicación)
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
  // Cierra el detalle si estuviera abierto por accidente
  cerrarModalDetalle();

  $('modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';

  const centroInicial = map ? map.getCenter() : L.latLng(CDJ_CENTER[0], CDJ_CENTER[1]);
  pickerLatLng = centroInicial;

  setTimeout(() => {
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
    pickerMap.invalidateSize();
    actualizarCoordsTexto();
  }, 60);
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

function enviarNuevoReporte() {
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

  setTimeout(() => {
    const addr = $('repAddr').value.trim() || 'Dirección no especificada';
    const nuevoId = Math.max(...reportes.map(r => r.id)) + 1;

    const lat = pickerLatLng ? pickerLatLng.lat : CDJ_CENTER[0];
    const lng = pickerLatLng ? pickerLatLng.lng : CDJ_CENTER[1];

    reportes.unshift({
      id: nuevoId, type: tipo,
      title: `${TIPOS[tipo].label} · ${addr}`,
      addr, time: 'Ahora', status: 'pendiente', progress: 0, inst: null,
      lat, lng, mine: true,
    });

    cerrarModalReporte();
    renderPins();
    renderReportList();
    renderMisReportes();
    renderPerfilStats();

    if (map) map.flyTo([lat, lng], 16, { duration: 0.6 });

    btn.disabled = false;
    btn.textContent = 'Enviar reporte';

    mostrarToast(`✓ Reporte #${nuevoId} enviado correctamente`);

    const badge = $('notifCount');
    const actual = parseInt(badge.textContent, 10) || 0;
    badge.textContent = actual + 1;
    badge.style.display = 'flex';
  }, 900);
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
  const cfg = TIPOS[r.type];
  const st = STATUS_MAP[r.status];

  $('detailTitle').textContent = `Reporte #${r.id} · ${cfg.label}`;
  $('detailBody').innerHTML = `
    <div style="height:110px;background:var(--jo-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;color:${cfg.color};margin-bottom:1rem;">
      <span style="display:flex;">${iconSvg(r.type, 40)}</span>
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
    </div>`;

  $('detailOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
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