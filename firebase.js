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
const DEFAULT_LIVE_SRC = "https://www.youtube.com/embed/live_stream?channel=UCA_dlOwtkTyg9VdtudhXEXQ&autoplay=1&mute=1";
const transmisionCache = {};
let currentTab = 'live';
let videoPropioEl = null;

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
};

// Escucha en vivo los 4 documentos; si el admin guarda algo, se actualiza
// automáticamente la pestaña que esté abierta en ese momento.
['live','sermon','alabanza','ninos'].forEach(tab=>{
  onSnapshot(doc(db,'transmision',tab), snap=>{
    transmisionCache[tab] = snap.exists() ? snap.data() : null;
    if(currentTab === tab) pintarTab(tab);
  }, err => console.warn('Transmisión Firebase error ('+tab+'):', err.message));
});
