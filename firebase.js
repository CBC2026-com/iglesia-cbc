// ══ FIREBASE — Peticiones de Oración ══
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp,
         query, orderBy, onSnapshot, doc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCvanvEBZC8Pr9S2Vp3GhMx7uIHz4aZnxo",
  authDomain:        "iglesia-cbc.firebaseapp.com",
  projectId:         "iglesia-cbc",
  storageBucket:     "iglesia-cbc.firebasestorage.app",
  messagingSenderId: "365457083043",
  appId:             "1:365457083043:web:b12ecdd14e17fa2a864d16"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── NÚMERO WHATSAPP DEL PASTOR ──
// Cambia este número por el real (solo dígitos, con código de país)
const WA_PASTOR = "584245206320";

window._savePrayer = async (nombre, correo, tipo, peticion) => {
  const fecha = new Date().toLocaleDateString('es', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  // 1️⃣ Guardar en Firebase Firestore
  try {
    await addDoc(collection(db, "peticiones"), {
      nombre, correo, tipo, peticion,
      fecha, orado: false,
      origen: "Sitio Web",
      creadoEn: serverTimestamp()
    });
  } catch(e) {
    console.warn("Firebase error:", e.message);
  }

  // 2️⃣ Notificar al pastor por WhatsApp
  const msg = encodeURIComponent(
    `🙏 *NUEVA PETICIÓN DE ORACIÓN*\n\n` +
    `👤 *Nombre:* ${nombre}\n` +
    `📋 *Tipo:* ${tipo}\n` +
    `📅 *Fecha:* ${fecha}\n\n` +
    `💬 *Petición:*\n${peticion}\n\n` +
    `_Enviado desde el sitio web de la Iglesia CBC_`
  );
  window.open(`https://wa.me/${WA_PASTOR}?text=${msg}`, '_blank');
};

// ── GALERÍA — fotos y videos subidos desde el admin ──
// Si hay contenido en Firestore, reemplaza la galería fija del HTML.
// Si la colección está vacía (o falla), se deja la galería fija tal cual está.
// Convierte la URL de un video de Cloudinary en una miniatura de imagen
// para no forzar la descarga del video completo solo para mostrarlo en la cuadrícula
function cloudinaryVideoThumb(url){
  if(!url || !url.includes('res.cloudinary.com')) return null;
  return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg$2');
}

function cargarGaleriaPublica(){
  const grid = document.getElementById('galeriaGrid');
  if(!grid) return;
  const q = query(collection(db,'galeria'), orderBy('creadoEn','desc'));
  onSnapshot(q, snap => {
    if(snap.empty) return; // sin fotos en Firebase: se conserva la galería fija
    const clases = ['g1','g2','g3','g4','g5','g6'];
    grid.innerHTML = '';
    let i = 0;
    snap.forEach(d => {
      const dat = d.data();
      const clase = clases[i % clases.length]; i++;
      const item = document.createElement('div');
      item.className = 'gallery-item ' + clase;
      item.style.overflow = 'hidden';

      if(dat.tipo === 'video'){
        const thumb = cloudinaryVideoThumb(dat.url);
        if(thumb){
          // Miniatura liviana con botón de reproducción; el video real
          // solo se carga cuando alguien hace clic
          const wrap = document.createElement('div');
          wrap.style.cssText = 'position:relative;width:100%;height:100%;cursor:pointer';
          const img = document.createElement('img');
          img.src = thumb; img.loading = 'lazy';
          img.alt = dat.descripcion || 'Momento comunidad';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover';
          img.onerror = ()=>{ img.style.display='none'; };
          const play = document.createElement('span');
          play.textContent = '▶';
          play.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6);pointer-events:none';
          wrap.appendChild(img); wrap.appendChild(play);
          wrap.addEventListener('click', ()=>{
            const video = document.createElement('video');
            video.src = dat.url || ''; video.controls = true; video.autoplay = true;
            video.muted = true; video.playsInline = true;
            video.style.cssText = 'width:100%;height:100%;object-fit:cover';
            video.onerror = ()=>{ item.innerHTML = '🎥'; };
            item.innerHTML = ''; item.appendChild(video);
          }, { once:true });
          item.appendChild(wrap);
        } else {
          const video = document.createElement('video');
          video.src = dat.url || ''; video.muted = true; video.playsInline = true;
          video.controls = true; video.preload = 'none';
          video.style.cssText = 'width:100%;height:100%;object-fit:cover';
          video.onerror = ()=>{ item.innerHTML = '🎥'; };
          item.appendChild(video);
        }
      } else {
        const img = document.createElement('img');
        img.src = dat.url || ''; img.loading = 'lazy';
        img.alt = dat.descripcion || 'Momento comunidad';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover';
        img.onerror = ()=>{ img.style.display='none'; item.innerHTML = '🙏'; };
        item.appendChild(img);
      }

      grid.appendChild(item);
    });
  }, err => console.warn('Galería Firebase error:', err.message));
}
cargarGaleriaPublica();

// ── TRANSMISIÓN — conecta las pestañas En Vivo / Sermones / Alabanza / Niños ──
// Todo se hace por JavaScript; no se toca la estructura de index.html.
const YT_CHANNEL_ID   = 'UCA_dlOwtkTyg9VdtudhXEXQ';
const DEFAULT_LIVE_SRC = `https://www.youtube.com/embed/live_stream?channel=${YT_CHANNEL_ID}&autoplay=1&mute=1`;
const transmisionCache = {};
let currentTab = 'live';
let videoPropioEl = null;

// ══════════════════════════════════════════════════════════════════════════
// DETECCIÓN AUTOMÁTICA DEL VIDEO EN VIVO — sin API Key
//
// El embed "embed/live_stream?channel=ID" (DEFAULT_LIVE_SRC) es el formato
// oficial de YouTube para mostrar el directo activo de un canal, y se
// actualiza solo en el momento en que el canal empieza a transmitir — no
// requiere ninguna acción manual. Se usa como primera opción por ser
// instantáneo (no depende de proxies externos).
//
// Como respaldo — por si ese formato falla en algún navegador/región —
// detectamos también el ID exacto del video en vivo (si existe) a través
// de APIs alternativas sin API Key, y si lo encontramos, sustituimos el
// iframe por el embed directo "embed/VIDEO_ID", que es el más confiable.
// Esto se revisa cada 90s mientras la pestaña "En Vivo" esté abierta, así
// que en cuanto el pastor inicia el directo, el sitio lo refleja solo.
// ══════════════════════════════════════════════════════════════════════════
let liveVideoIdDetectado = null;

async function findLiveVideoId(){
  // ── Método 1: Piped API (múltiples instancias) ──────────────────────
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.garudalinux.org',
    'https://api.piped.projectsegfau.lt',
    'https://piped.syncit.fr/api',
    'https://pipedapi.adminforge.de'
  ];
  for (const base of pipedInstances) {
    try {
      const res = await fetch(`${base}/channel/${YT_CHANNEL_ID}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const streams = data.relatedStreams || [];
      const live = streams.find(s => s.type === 'stream' && (s.isLive === true || s.live === true || s.duration === -1));
      if (live && live.url) {
        const m = live.url.match(/[?&]v=([\w-]{11})|\/v\/([\w-]{11})|youtu\.be\/([\w-]{11})/);
        if (m) return m[1] || m[2] || m[3];
      }
    } catch (e) { /* siguiente instancia */ }
  }

  // ── Método 2: Invidious API (múltiples instancias) ──────────────────
  const invidiousInstances = [
    'https://invidious.snopyta.org',
    'https://yewtu.be',
    'https://invidious.namazso.eu',
    'https://inv.riverside.rocks',
    'https://invidious.slipfox.xyz'
  ];
  for (const base of invidiousInstances) {
    try {
      const res = await fetch(`${base}/api/v1/channels/${YT_CHANNEL_ID}/streams`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const videos = Array.isArray(data) ? data : (data.videos || []);
      const live = videos.find(v => v.liveNow === true || v.type === 'stream');
      if (live && live.videoId) return live.videoId;
    } catch (e) { /* siguiente instancia */ }
  }

  // ── Método 3: RSS feed del canal vía rss2json ───────────────────────
  try {
    const rssUrl = encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`);
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      if (items.length > 0) {
        const first = items[0];
        const pubDate = new Date(first.pubDate);
        const hoursOld = (Date.now() - pubDate) / 3600000;
        const looksLive = /live|en vivo|directo|culto|servicio/i.test(first.title || '');
        if (hoursOld < 12 || looksLive) {
          const m = (first.link || '').match(/[?&]v=([\w-]{11})/);
          if (m) return m[1];
        }
      }
    }
  } catch (e) { /* método 3 falló */ }

  return null;
}

// Revisa si hay un directo activo y, si lo encuentra, sustituye el iframe
// por el embed directo del video (más confiable que el embed por canal).
// Solo actúa si seguimos en la pestaña "live" y no hay una playlist manual
// activa desde el panel de líderes (esa siempre tiene prioridad).
async function actualizarLiveDetectado(){
  if (currentTab !== 'live') return;
  const dataAdmin = transmisionCache['live'];
  if (dataAdmin && dataAdmin.activo && dataAdmin.playlistId) return; // override manual activo

  const id = await findLiveVideoId();
  if (id === liveVideoIdDetectado) return; // sin cambios
  liveVideoIdDetectado = id;

  if (currentTab !== 'live') return; // pudo cambiar mientras esperábamos la respuesta
  const dataAdmin2 = transmisionCache['live'];
  if (dataAdmin2 && dataAdmin2.activo && dataAdmin2.playlistId) return;

  const iframe = document.getElementById('liveFrame');
  if (!iframe) return;
  iframe.style.display = 'block';
  iframe.src = id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`
    : DEFAULT_LIVE_SRC;
}

// Primera revisión al cargar, y luego cada 90s mientras el sitio esté abierto
// (así el video aparece solo, sin recargar la página, apenas se inicia el directo).
actualizarLiveDetectado();
setInterval(actualizarLiveDetectado, 90 * 1000);

function ytEmbedUrl(playlistId, autoplay){
  if(!playlistId) return null;
  const idLimpio = playlistId.trim();
  const esVideoSuelto = /^[\w-]{11}$/.test(idLimpio);
  const auto = autoplay ? '&autoplay=1&mute=1' : '';
  return esVideoSuelto
    ? `https://www.youtube.com/embed/${idLimpio}?rel=0${auto}`
    : `https://www.youtube.com/embed/videoseries?list=${idLimpio}${auto}`;
}

function obtenerVideoPropioEl(){
  if(videoPropioEl) return videoPropioEl;
  const iframe = document.getElementById('liveFrame');
  if(!iframe) return null;
  videoPropioEl = document.createElement('video');
  videoPropioEl.id = 'liveFrameVideoPropio';
  videoPropioEl.controls = true;
  videoPropioEl.style.cssText = 'width:100%;aspect-ratio:16/9;border:none;display:none;background:#000';
  iframe.insertAdjacentElement('afterend', videoPropioEl);
  return videoPropioEl;
}

function pintarTab(tab){
  const iframe = document.getElementById('liveFrame');
  if(!iframe) return;
  const video = obtenerVideoPropioEl();
  const data = transmisionCache[tab];

  if(tab === 'live'){
    if(video) video.style.display = 'none';
    iframe.style.display = 'block';
    iframe.src = (data && data.activo && data.playlistId)
      ? (ytEmbedUrl(data.playlistId, true) || DEFAULT_LIVE_SRC)
      : DEFAULT_LIVE_SRC;
    return;
  }

  if(data && data.tipo === 'video' && data.videoUrl){
    iframe.style.display = 'none';
    if(video){
      video.src = data.videoUrl;
      video.style.display = 'block';
      video.play().catch(()=>{});
    }
  } else if(data && data.playlistId){
    if(video) video.style.display = 'none';
    iframe.style.display = 'block';
    iframe.src = ytEmbedUrl(data.playlistId, false);
  } else {
    if(video) video.style.display = 'none';
    iframe.style.display = 'block';
    iframe.src = DEFAULT_LIVE_SRC;
  }
}

window.setTab = function(btn, tab){
  const tabsWrap = btn.parentElement;
  Array.from(tabsWrap.children).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = tab;
  pintarTab(tab);
  if (tab === 'live') actualizarLiveDetectado();
};

// Escucha en vivo los 4 documentos; si el admin guarda algo, se actualiza
// automáticamente la pestaña que esté abierta en ese momento.
['live','sermon','alabanza','ninos'].forEach(tab=>{
  onSnapshot(doc(db,'transmision',tab), snap=>{
    transmisionCache[tab] = snap.exists() ? snap.data() : null;
    if(currentTab === tab) pintarTab(tab);
  }, err => console.warn('Transmisión Firebase error ('+tab+'):', err.message));
});
