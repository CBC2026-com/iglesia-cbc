// ══════════════════════════════════════════════════════════════════════════
// TRANSMISIÓN EN VIVO — Contenido de YouTube en tiempo real vía Firebase
// CBC Araure, Portuguesa, Venezuela
//
// Este archivo es INDEPENDIENTE de firebase.js (no lo modifica). Usa la
// misma configuración de proyecto para conectarse a Firestore.
//
// Estructura en Firestore — colección "transmision", documentos:
//   transmision/live      → { activo: bool, playlistId: string, actualizadoEn }
//   transmision/sermon    → { playlistId: string, actualizadoEn }
//   transmision/alabanza  → { playlistId: string, actualizadoEn }
//   transmision/ninos     → { playlistId: string, actualizadoEn }
//
// Estos documentos se editan desde transmision-admin.html (página aparte,
// no incluida en lideres.html). Esta página solo LEE en tiempo real con
// onSnapshot: cualquier cambio hecho desde el panel de administración se
// refleja al instante en index.html, sin recargar.
//
// IMPORTANTE — Reglas de seguridad de Firestore:
// La colección "transmision" debe permitir lectura pública (para que esta
// página funcione) pero idealmente restringir la escritura (para que solo
// el equipo de medios pueda cambiar los videos). Ejemplo de regla:
//
//   match /transmision/{doc} {
//     allow read: if true;
//     allow write: if true; // ⚠️ Considera agregar autenticación para esto
//   }
// ══════════════════════════════════════════════════════════════════════════

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCvanvEBZC8Pr9S2Vp3GhMx7uIHz4aZnxo",
  authDomain:        "iglesia-cbc.firebaseapp.com",
  projectId:         "iglesia-cbc",
  storageBucket:     "iglesia-cbc.firebasestorage.app",
  messagingSenderId: "365457083043",
  appId:             "1:365457083043:web:b12ecdd14e17fa2a864d16"
};

// Reutiliza la app de Firebase si firebase.js ya la inicializó.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Caché local de lo que Firestore reporta para cada pestaña
const TABS = ['live', 'sermon', 'alabanza', 'ninos'];
const transmisionData = {
  live:     { activo: false, playlistId: '' },
  sermon:   { playlistId: '' },
  alabanza: { playlistId: '' },
  ninos:    { playlistId: '' }
};

// Pestaña actualmente visible (sincronizada con setTab() de main.js)
let currentTab = 'live';

const LABELS = {
  live:     { icon:'fa-circle-play', text:'Ver Transmisión en Vivo', note:'Domingos 10:00 AM', emptyTitle:'No hay transmisión en vivo en este momento', emptyNote:'Vuelve el domingo a las 10:00 AM' },
  sermon:   { icon:'fa-book-open',   text:'Ver Sermones y Predicaciones', note:'Archivo de mensajes', emptyTitle:'Aún no hay sermones cargados', emptyNote:'Pronto agregaremos contenido aquí' },
  alabanza: { icon:'fa-music',       text:'Ver Videos de Alabanza', note:'Playlist de adoración', emptyTitle:'Aún no hay videos de alabanza', emptyNote:'Pronto agregaremos contenido aquí' },
  ninos:    { icon:'fa-child',       text:'Contenido para Niños', note:'Escuela dominical virtual', emptyTitle:'Aún no hay contenido para niños', emptyNote:'Pronto agregaremos contenido aquí' }
};

// ── Renderiza el reproductor según la pestaña activa y los datos disponibles ──
function renderPlayer(){
  const player = document.getElementById('liveFrame');
  if (!player) return;

  const data = transmisionData[currentTab];
  const playlistId = data && data.playlistId;
  const l = LABELS[currentTab];

  // "En Vivo" requiere además que esté marcado como activo
  const disponible = currentTab === 'live'
    ? (data.activo && playlistId)
    : !!playlistId;

  if (disponible) {
    player.outerHTML = `
      <div id="liveFrame" style="position:relative;">
        <iframe src="https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0"
          allowfullscreen allow="autoplay; encrypted-media" loading="lazy"
          title="${escapeHTML(l.text)} - Comunidad Bíblica Cristiana"
          style="width:100%;aspect-ratio:16/9;border:0;display:block;border-radius:inherit;"></iframe>
      </div>`;
  } else {
    player.innerHTML = `
      <i class="fa-solid ${l.icon}" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
      <p>${escapeHTML(l.emptyTitle)}</p>
      <small style="color:rgba(255,255,255,.5)">${escapeHTML(l.emptyNote)}</small>
    `;
  }

  removeFallbackLink();
  return disponible;
}

function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function removeFallbackLink(){
  const old = document.getElementById('liveFallback');
  if (old) old.remove();
}

// ── API expuesta para que main.js (setTab) consulte y delegue el render ──
// main.js puede llamar a window._transmision.render(tab) dentro de setTab().
// Si Firestore tiene playlist para esa pestaña, esta función dibuja el
// reproductor y devuelve true. Si no hay datos (o aún no llegó el primer
// snapshot), devuelve false y main.js puede mostrar su placeholder normal.
window._transmision = {
  render: (tab) => {
    currentTab = tab;
    return renderPlayer();
  },
  // Permite a main.js saber si ya llegó información de Firestore para "live"
  // (útil para decidir si loadLive() debe intentar la detección por proxy
  // o dejarle el control a esta playlist).
  hasData: (tab) => {
    const d = transmisionData[tab];
    return tab === 'live' ? !!(d.activo && d.playlistId) : !!d.playlistId;
  }
};

// ── Suscripciones en tiempo real a los 4 documentos ──
TABS.forEach(tab=>{
  const ref = doc(db, 'transmision', tab);
  onSnapshot(ref, (snap)=>{
    if (snap.exists()) {
      const d = snap.data();
      transmisionData[tab] = {
        activo: !!d.activo,
        playlistId: (d.playlistId || '').trim()
      };
    } else {
      transmisionData[tab] = tab === 'live' ? { activo:false, playlistId:'' } : { playlistId:'' };
    }

    if (tab !== currentTab) return;

    const data = transmisionData[tab];
    const hayDatos = tab === 'live'
      ? (data.activo && data.playlistId)
      : !!data.playlistId;

    // Para "live": si Firestore no reporta transmisión activa, dejamos el
    // contenido tal cual está (placeholder original con loadLive(), o un
    // video cargado manualmente) — no lo sobrescribimos con un mensaje
    // vacío. Para las demás pestañas, si tampoco hay playlist, dejamos el
    // placeholder estático que ya dibujó setTab() en main.js.
    if (!hayDatos) return;

    renderPlayer();
  }, (err)=>{
    console.warn(`transmision-live: error escuchando "${tab}":`, err.message);
  });
});

document.addEventListener('DOMContentLoaded', ()=>{
  // No forzamos un render inicial: la página ya muestra el placeholder
  // estático de index.html ("Haz clic para ver la transmisión en vivo").
  // Si Firestore ya tiene un directo activo, el primer onSnapshot (arriba)
  // llegará casi de inmediato y reemplazará ese placeholder automáticamente.
});

// ══════════════════════════════════════════════════════════════════════════
// setTab / _cbcPlayLive — expuestas globalmente para los onclick de index.html
// ══════════════════════════════════════════════════════════════════════════

// ── setTab: cambia de pestaña usando SOLO la caché ya recibida por onSnapshot.
// Nunca hace una petición nueva ni entra en bucle: solo lee transmisionData.
window.setTab = function (btnEl, tab) {
  document.querySelectorAll('.video-tab').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const disponible = window._transmision.render(tab);
  if (!disponible) {
    const frame = document.getElementById('liveFrame');
    if (!frame) return;
    const l = LABELS[tab] || LABELS.live;
    frame.innerHTML = `
      <i class="fa-solid ${l.icon}" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
      <p>${escapeHTML(l.emptyTitle)}</p>
      <small style="color:rgba(255,255,255,.5)">${escapeHTML(l.emptyNote)}</small>`;
  }
};

// ── _cbcPlayLive: clic manual en "Toca para ver la transmisión en vivo".
// 1) Timeout de seguridad a 5s   2) try/catch para errores de red/Firestore
// 3) Bandera _cbcPlayLiveBusy evita disparos superpuestos si el usuario
//    hace varios clics seguidos (la causa típica de un "bucle" percibido)
window._cbcPlayLive = async function () {
  if (window._cbcPlayLiveBusy) return;
  window._cbcPlayLiveBusy = true;

  const frame = document.getElementById('liveFrame');
  if (frame) {
    frame.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
      <p>Verificando transmisión…</p>`;
  }

  try {
    const data = await esperarDatosConTimeout('live', 5000);
    if (data && data.activo && data.playlistId) {
      currentTab = 'live';
      renderPlayer();
    } else if (frame) {
      frame.innerHTML = `<i class="fa-solid fa-circle-play" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
        <p>No hay transmisión en vivo en este momento</p>
        <small style="color:rgba(255,255,255,.5)">Vuelve el domingo a las 10:00 AM</small>`;
    }
  } catch (err) {
    console.warn('_cbcPlayLive:', err.message);
    if (frame) {
      frame.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
        <p>No se pudo verificar la transmisión. Intenta de nuevo.</p>`;
    }
  } finally {
    window._cbcPlayLiveBusy = false;
  }
};

// Resuelve con los datos de "live" en cuanto Firestore los entregue (o con lo
// que ya esté en caché), o rechaza si tarda más de `ms` — así el clic nunca
// se queda esperando para siempre.
function esperarDatosConTimeout(tab, ms) {
  return new Promise((resolve, reject) => {
    if (transmisionData[tab] && transmisionData[tab].playlistId) {
      resolve(transmisionData[tab]);
      return;
    }
    const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms);
    const unsub = onSnapshot(doc(db, 'transmision', tab), (snap) => {
      clearTimeout(timer);
      unsub();
      resolve(snap.exists() ? snap.data() : null);
    }, (err) => {
      clearTimeout(timer);
      unsub();
      reject(err);
    });
  });
}
