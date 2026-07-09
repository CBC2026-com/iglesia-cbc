// ══ FIREBASE — Peticiones de Oración ══
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp,
         query, orderBy, onSnapshot }
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
        item.innerHTML = `<video src="${dat.url||''}" style="width:100%;height:100%;object-fit:cover"
             muted playsinline controls onerror="this.parentElement.innerHTML='🎥'"></video>`;
      } else {
        item.innerHTML = `<img src="${dat.url||''}" alt="${dat.descripcion||'Momento comunidad'}"
             style="width:100%;height:100%;object-fit:cover"
             onerror="this.style.display='none';this.parentElement.innerHTML='🙏'">`;
      }
      grid.appendChild(item);
    });
  }, err => console.warn('Galería Firebase error:', err.message));
}
cargarGaleriaPublica();
