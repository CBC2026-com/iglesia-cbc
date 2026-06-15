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
  const player = document.getElementById('livePlayer');
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
      <div id="livePlayer" style="position:relative;">
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
