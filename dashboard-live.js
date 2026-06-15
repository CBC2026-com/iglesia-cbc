// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD DINÁMICO — Panel "Nuestra Comunidad en Números" en tiempo real
// CBC Araure, Portuguesa, Venezuela
//
// Este archivo es INDEPENDIENTE de main.js y firebase.js (no los modifica).
// Usa la misma configuración de proyecto para leer, en tiempo real
// (onSnapshot), las colecciones que ya administran desde lideres.html:
//
//   actividades/{id}  → { titulo, descripcion, fecha, emoji, tag, orden }
//   anuncios/{id}     → { titulo, texto, emoji, orden }
//   ministerios/{id}  → { nombre, ... }            (solo se cuenta)
//   peticiones/{id}   → { creadoEn: Timestamp }    (ya las guarda firebase.js)
//
// Si alguna colección está vacía o no existe todavía, esta página NO borra
// el contenido estático que ya tiene index.html — simplemente lo deja como
// está (sirve de respaldo / contenido de ejemplo) y main.js sigue
// funcionando igual para esos casos.
//
// ── Reglas de Firestore necesarias ──
// Las reglas actuales tienen:
//   match /actividades/{id}  { allow read, write: if request.auth != null; }
//   match /anuncios/{id}     { allow read, write: if request.auth != null; }
//   match /ministerios/{id}  { allow read, write: if request.auth != null; }
//
// Para que index.html (público) pueda LEER estas colecciones, agrega
// "allow read: if true;" SIN quitar la restricción de escritura, ej:
//
//   match /actividades/{id} {
//     allow read: if true;
//     allow write: if request.auth != null;
//   }
//   match /anuncios/{id} {
//     allow read: if true;
//     allow write: if request.auth != null;
//   }
//   match /ministerios/{id} {
//     allow read: if true;
//     allow write: if request.auth != null;
//   }
//
// "peticiones" ya permite "allow create: if true" — para contar el total
// del mes necesitamos también "allow read: if true" en esa colección
// (actualmente solo lectura autenticada). Si no se agrega, el contador de
// peticiones simplemente seguirá usando el valor de respaldo de main.js.
// ══════════════════════════════════════════════════════════════════════════

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCvanvEBZC8Pr9S2Vp3GhMx7uIHz4aZnxo",
  authDomain:        "iglesia-cbc.firebaseapp.com",
  projectId:         "iglesia-cbc",
  storageBucket:     "iglesia-cbc.firebasestorage.app",
  messagingSenderId: "365457083043",
  appId:             "1:365457083043:web:b12ecdd14e17fa2a864d16"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);

function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function animateCounter(id, end){
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 900;
  let startTime = null;
  function step(ts){
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    el.textContent = Math.floor(start + (end - start) * progress).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════════════════════════════════
// ANUNCIOS — colección "anuncios"
// ══════════════════════════════════════════════════════════════════════════
let anunciosCargados = false;

function renderAnuncios(docs){
  const widget = [...document.querySelectorAll('#dashboard .dash-widget')]
    .find(w => w.querySelector('h3')?.textContent.includes('Anuncios'));
  if (!widget) return;

  if (docs.length === 0) {
    // Sin datos en Firebase: deja el contenido estático que ya existe
    return;
  }

  // Elimina los .announcement-item estáticos
  widget.querySelectorAll('.announcement-item').forEach(el => el.remove());

  docs.forEach(d => {
    const data = d.data();
    const emoji = data.emoji || '📢';
    const titulo = data.titulo || data.title || '';
    const texto = data.texto || data.descripcion || data.contenido || '';

    const div = document.createElement('div');
    div.className = 'announcement-item';
    div.innerHTML = `<strong>${escapeHTML(emoji)} ${escapeHTML(titulo)}</strong> ${escapeHTML(texto)}`;
    widget.appendChild(div);
  });

  anunciosCargados = true;
}

// ══════════════════════════════════════════════════════════════════════════
// ACTIVIDADES — colección "actividades"
// Alimenta: contador #cnt-actividades, widget "Próximas Actividades" del
// dashboard, y (si existe) la cuadrícula #actividades .activities-grid
// ══════════════════════════════════════════════════════════════════════════
let actividadesCargadas = false;

const COLOR_CLASSES = ['bg1','bg2','bg3','bg4','bg5','bg6'];

function renderEventosWidget(docs){
  const lista = document.querySelector('#dashboard .event-list');
  if (!lista || docs.length === 0) return;

  lista.innerHTML = '';
  docs.slice(0, 5).forEach(d => {
    const data = d.data();
    const titulo = data.titulo || data.title || '';
    const fecha = data.fecha || data.fechaTexto || '';
    const li = document.createElement('li');
    li.innerHTML = `<span class="event-dot"></span>
      <div class="event-text"><strong>${escapeHTML(titulo)}</strong>${escapeHTML(fecha)}</div>`;
    lista.appendChild(li);
  });
}

function renderActividadesGrid(docs){
  const grid = document.querySelector('#actividades .activities-grid');
  if (!grid || docs.length === 0) return;

  grid.innerHTML = '';
  docs.forEach((d, i) => {
    const data = d.data();
    const emoji = data.emoji || '🌟';
    const titulo = data.titulo || data.title || '';
    const descripcion = data.descripcion || data.desc || '';
    const fecha = data.fecha || data.fechaTexto || '';
    const tag = data.tag || data.categoria || 'General';
    const colorClass = COLOR_CLASSES[i % COLOR_CLASSES.length];

    const card = document.createElement('div');
    card.className = 'act-card';
    card.innerHTML = `
      <div class="act-header ${colorClass}">${escapeHTML(emoji)}</div>
      <div class="act-body">
        <div class="act-date">${escapeHTML(fecha)}</div>
        <div class="act-title">${escapeHTML(titulo)}</div>
        <div class="act-desc">${escapeHTML(descripcion)}</div>
        <span class="act-tag">${escapeHTML(tag)}</span>
      </div>`;
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MINISTERIOS — colección "ministerios" (solo se usa para el contador)
// ══════════════════════════════════════════════════════════════════════════
let ministeriosCount = null;

// ══════════════════════════════════════════════════════════════════════════
// PETICIONES — colección "peticiones" (contador del mes actual)
// ══════════════════════════════════════════════════════════════════════════
let peticionesCount = null;

function isThisMonth(timestamp){
  if (!timestamp) return false;
  let date;
  if (timestamp instanceof Timestamp) date = timestamp.toDate();
  else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else date = new Date(timestamp);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

// ══════════════════════════════════════════════════════════════════════════
// Suscripciones en tiempo real
// ══════════════════════════════════════════════════════════════════════════

onSnapshot(query(collection(db, 'actividades'), orderBy('orden', 'asc')),
  (snap) => {
    const docs = snap.docs;
    renderEventosWidget(docs);
    renderActividadesGrid(docs);
    if (docs.length > 0) {
      actividadesCargadas = true;
      animateCounter('cnt-actividades', docs.length);
    }
  },
  () => {
    // Si falla por falta de campo "orden" o permisos, intenta sin orderBy
    onSnapshot(collection(db, 'actividades'), (snap) => {
      const docs = snap.docs;
      renderEventosWidget(docs);
      renderActividadesGrid(docs);
      if (docs.length > 0) {
        actividadesCargadas = true;
        animateCounter('cnt-actividades', docs.length);
      }
    }, (err) => {
      console.warn('dashboard-live: no se pudo leer "actividades":', err.message);
    });
  }
);

onSnapshot(collection(db, 'anuncios'), (snap) => {
  renderAnuncios(snap.docs);
}, (err) => {
  console.warn('dashboard-live: no se pudo leer "anuncios":', err.message);
});

onSnapshot(collection(db, 'ministerios'), (snap) => {
  if (snap.size > 0) {
    ministeriosCount = snap.size;
    animateCounter('cnt-ministerios', ministeriosCount);
  }
}, (err) => {
  console.warn('dashboard-live: no se pudo leer "ministerios":', err.message);
});

onSnapshot(collection(db, 'peticiones'), (snap) => {
  let count = 0;
  snap.forEach(d => {
    const data = d.data();
    if (isThisMonth(data.creadoEn)) count++;
  });
  peticionesCount = count;
  window._peticionesCount = count; // compatibilidad con main.js
  animateCounter('cnt-peticiones', count);
}, (err) => {
  console.warn('dashboard-live: no se pudo leer "peticiones" (puede requerir permisos públicos de lectura):', err.message);
});
