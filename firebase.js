// ══════════════════════════════════════════════════════════════════════════
// FIREBASE — Peticiones de Oración, Galería y Panel de Transmisión (admin)
//
// Carga RESISTENTE: si Google/Firebase está lento o bloqueado en la red del
// visitante, esto ya NO puede colgar ni romper el resto del sitio. Se
// intenta con un límite de 8s; si falla, el resto de la página (horarios,
// ministerios, formulario que igual abre WhatsApp, video en vivo con
// detección propia, etc.) sigue funcionando con total normalidad.
// ══════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyCvanvEBZC8Pr9S2Vp3GhMx7uIHz4aZnxo",
  authDomain:        "iglesia-cbc.firebaseapp.com",
  projectId:         "iglesia-cbc",
  storageBucket:     "iglesia-cbc.firebasestorage.app",
  messagingSenderId: "365457083043",
  appId:             "1:365457083043:web:b12ecdd14e17fa2a864d16"
};

let db = null;
let fs = null; // { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc }

function conTiempoLimite(promesa, ms){
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo agotado')), ms))
  ]);
}

async function initFirebase(){
  try {
    const [{ initializeApp }, fsMod] = await conTiempoLimite(Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
    ]), 8000);
    fs = fsMod;
    const app = initializeApp(firebaseConfig);
    db = fs.getFirestore(app);
    return true;
  } catch (e) {
    console.warn('Firebase no disponible (red lenta o bloqueada); el sitio sigue funcionando sin las funciones en vivo:', e.message);
    return false;
  }
}

// ── NÚMERO WHATSAPP DEL PASTOR ──
// Cambia este número por el real (solo dígitos, con código de país)
const WA_PASTOR = "584245206320";

window._savePrayer = async (nombre, correo, tipo, peticion) => {
  const fecha = new Date().toLocaleDateString('es', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  // 1️⃣ Guardar en Firebase Firestore (si está disponible)
  if (db && fs) {
    try {
      await fs.addDoc(fs.collection(db, "peticiones"), {
        nombre, correo, tipo, peticion,
        fecha, orado: false,
        origen: "Sitio Web",
        creadoEn: fs.serverTimestamp()
      });
    } catch(e) {
      console.warn("Firebase error:", e.message);
    }
  }

  // 2️⃣ Notificar al pastor por WhatsApp (esto SIEMPRE funciona,
  //     incluso si Firebase no cargó)
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
// Si la colección está vacía (o Firebase no cargó), se deja la galería
// fija del HTML tal cual está — nunca se queda en blanco.
// Convierte la URL de un video de Cloudinary en una miniatura de imagen
// para no forzar la descarga del video completo solo para mostrarlo en la cuadrícula
function cloudinaryVideoThumb(url){
  if(!url || !url.includes('res.cloudinary.com')) return null;
  return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg$2');
}

function cargarGaleriaPublica(){
  const grid = document.getElementById('galeriaGrid');
  if(!grid || !db || !fs) return;
  const q = fs.query(fs.collection(db,'galeria'), fs.orderBy('creadoEn','desc'));
  fs.onSnapshot(q, snap => {
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

// ══════════════════════════════════════════════════════════════════════════
// TRANSMISIÓN — pestañas En Vivo / Sermones / Alabanza / Niños
//
// MODELO: "fachada" (click-to-play). El elemento #liveFrame empieza como un
// simple div con un botón de reproducir — NUNCA se crea el iframe de YouTube
// hasta que la persona hace clic. Así, si YouTube devuelve algún error de
// embed (Error 153, restricciones de referrer, etc.), NUNCA aparece solo al
// cargar la página — como mucho, al hacer clic, y con un clic real del
// usuario YouTube permite mucho más (autoplay incluido) que al cargar en
// automático.
//
// Aun así, el video se "auto-actualiza" apenas el pastor inicia el directo:
// cada 90s (y al abrir la pestaña "En Vivo") revisamos en segundo plano si
// el canal está transmitiendo. Si lo está, el texto de la fachada cambia a
// "🔴 EN VIVO — toca para ver" — no hace falta que nadie haga nada del lado
// del admin para que esto ocurra.
// ══════════════════════════════════════════════════════════════════════════

const YT_CHANNEL_ID    = 'UCA_dlOwtkTyg9VdtudhXEXQ';
const DEFAULT_LIVE_SRC = `https://www.youtube.com/embed/live_stream?channel=${YT_CHANNEL_ID}`;
const transmisionCache = {};
let currentTab   = 'live';
let liveVideoId  = null;   // ID detectado automáticamente del directo activo
let iframeCreado = false;  // si ya se creó el iframe real (tras el primer clic)

const LABELS = {
  live:     { icon:'fa-circle-play', text:'Toca para ver la transmisión en vivo', textLive:'🔴 EN VIVO — Toca para ver', note:'Domingos 9:00 AM' },
  sermon:   { icon:'fa-book-open',   text:'Toca para ver Sermones y Predicaciones', note:'Archivo de mensajes' },
  alabanza: { icon:'fa-music',       text:'Toca para ver Videos de Alabanza', note:'Playlist de adoración' },
  ninos:    { icon:'fa-child',       text:'Toca para ver Contenido para Niños', note:'Escuela dominical virtual' }
};

function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Arma la URL de embed correcta para la pestaña activa ────────────────
function resolverSrcPestana(tab){
  const data = transmisionCache[tab];

  if(tab === 'live'){
    if(data && data.activo && data.playlistId) return ytEmbedUrl(data.playlistId, true); // override manual del admin
    if(liveVideoId) return `https://www.youtube.com/embed/${liveVideoId}?autoplay=1&mute=1`;
    return `${DEFAULT_LIVE_SRC}&autoplay=1&mute=1`;
  }
  if(data && data.playlistId) return ytEmbedUrl(data.playlistId, true);
  return null; // sin contenido configurado para esta pestaña todavía
}

function ytEmbedUrl(playlistId, autoplay){
  if(!playlistId) return null;
  const idLimpio = playlistId.trim();
  const esVideoSuelto = /^[\w-]{11}$/.test(idLimpio);
  const auto = autoplay ? '&autoplay=1&mute=1' : '';
  return esVideoSuelto
    ? `https://www.youtube.com/embed/${idLimpio}?rel=0${auto}`
    : `https://www.youtube.com/embed/videoseries?list=${idLimpio}${auto}`;
}

// ── Dibuja la fachada (miniatura + botón) con el texto correcto ─────────
function pintarFachada(tab){
  const el = document.getElementById('liveFrame');
  if(!el || el.tagName === 'IFRAME') return; // ya se convirtió en iframe real
  const l = LABELS[tab];
  const esVivoActivo = tab === 'live' &&
    ((transmisionCache.live && transmisionCache.live.activo && transmisionCache.live.playlistId) || liveVideoId);

  el.innerHTML = `
    <i class="fa-solid ${l.icon}" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
    <p>${escapeHTML(esVivoActivo ? l.textLive : l.text)}</p>
    <small style="color:rgba(255,255,255,.5)">${escapeHTML(l.note)}</small>
  `;
}

// ── Crea el iframe real (solo se llama desde un clic del usuario) ───────
window._cbcPlayLive = function(){
  const src = resolverSrcPestana(currentTab);
  const el = document.getElementById('liveFrame');
  if(!el) return;

  if(!src){
    // Pestaña sin contenido configurado todavía: no hacemos nada más que
    // dejar el mensaje de "aún no hay contenido" (ya está en la fachada).
    return;
  }

  el.outerHTML = `
    <iframe id="liveFrame"
      src="${src}"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
      style="width:100%;aspect-ratio:16/9;border:none;display:block">
    </iframe>`;
  iframeCreado = true;
};

// ── Cambia de pestaña ─────────────────────────────────────────────────
window.setTab = function(btn, tab){
  const tabsWrap = btn.parentElement;
  Array.from(tabsWrap.children).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = tab;

  const el = document.getElementById('liveFrame');
  if(el && el.tagName === 'IFRAME'){
    // El usuario ya interactuó antes (el iframe existe): cambiamos el
    // src directamente, ya no hace falta otro clic.
    const src = resolverSrcPestana(tab);
    if(src) el.src = src;
  } else {
    pintarFachada(tab);
  }

  if (tab === 'live') revisarLiveActivo();
};

// ══════════════════════════════════════════════════════════════════════════
// DETECCIÓN AUTOMÁTICA DEL DIRECTO — sin API Key
// Revisa si el canal está transmitiendo ahora mismo, usando APIs públicas
// alternativas (sin necesidad de que nadie del equipo configure nada).
// Solo actualiza el TEXTO de la fachada (nunca crea el iframe solo) —
// el iframe solo se crea con un clic real del usuario.
// ══════════════════════════════════════════════════════════════════════════
async function findLiveVideoId(){
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

async function revisarLiveActivo(){
  const id = await findLiveVideoId();
  if (id === liveVideoId) return; // sin cambios
  liveVideoId = id;

  const el = document.getElementById('liveFrame');
  if (!el) return;

  if (el.tagName === 'IFRAME') {
    // Ya se estaba reproduciendo algo: si aparece un nuevo directo y no hay
    // override manual del admin, lo actualizamos sin que el usuario haga nada.
    if (currentTab === 'live') {
      const data = transmisionCache.live;
      if (!(data && data.activo && data.playlistId) && liveVideoId) {
        el.src = `https://www.youtube.com/embed/${liveVideoId}?autoplay=1&mute=1`;
      }
    }
  } else if (currentTab === 'live') {
    pintarFachada('live'); // solo actualiza el texto de la fachada
  }
}

// Primera revisión al cargar, y luego cada 90s (así el aviso "EN VIVO"
// aparece solo, sin recargar la página, apenas se inicia el directo).
revisarLiveActivo();
setInterval(revisarLiveActivo, 90 * 1000);

// ── Escucha en vivo los 4 documentos administrables desde el panel ──────
// (solo si Firebase cargó correctamente; si no, las pestañas siguen
// funcionando igual con el sistema de detección automática de más arriba)
function escucharPanelTransmision(){
  if(!db || !fs) return;
  ['live','sermon','alabanza','ninos'].forEach(tab=>{
    fs.onSnapshot(fs.doc(db,'transmision',tab), snap=>{
      transmisionCache[tab] = snap.exists() ? snap.data() : null;
      if(currentTab !== tab) return;
      const el = document.getElementById('liveFrame');
      if(el && el.tagName === 'IFRAME'){
        const src = resolverSrcPestana(tab);
        if(src) el.src = src;
      } else {
        pintarFachada(tab);
      }
    }, err => console.warn('Transmisión Firebase error ('+tab+'):', err.message));
  });
}

// ══ ARRANQUE ══
// Todo lo que NO depende de Firebase (fachada del video, detección
// automática del directo) ya se ejecutó arriba y funciona sin esperar
// nada. Firebase se conecta en paralelo, con límite de tiempo, y si
// falla, simplemente no se activan sus funciones — el resto del sitio
// nunca se ve afectado.
initFirebase().then(ok => {
  if(ok){
    cargarGaleriaPublica();
    escucharPanelTransmision();
  }
});
