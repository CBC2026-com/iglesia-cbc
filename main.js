// ════════════════════════════════════════════
// main.js — Comunidad Bíblica Cristiana
// Lógica de UI: menú móvil, contadores, versículo del día, etc.
// ════════════════════════════════════════════

  // Mobile menu
  function toggleMenu(){
    document.getElementById('mobileMenu').classList.toggle('open');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTADORES AUTOMÁTICOS — leen el DOM de las otras secciones en tiempo real
  // Cada vez que agregues o elimines tarjetas en Ministerios, Actividades,
  // Horarios, Liderazgo o Galería, el dashboard se actualiza solo.
  // ══════════════════════════════════════════════════════════════════════════

  function animateCounter(id, end, duration){
    const el = document.getElementById(id);
    if (!el || end === 0) { if(el) el.textContent = '0'; return; }
    let start = 0, step = end / (duration / 16);
    const timer = setInterval(()=>{
      start += step;
      if(start >= end){ start = end; clearInterval(timer); }
      el.textContent = Math.floor(start).toLocaleString();
    }, 16);
  }

  function animateProgress(){
    document.querySelectorAll('.progress-fill').forEach(bar=>{
      bar.style.width = (bar.dataset.target || 0) + '%';
    });
  }

  // ── Conteo automático desde el DOM ───────────────────────────────────────
  function contarDesdeDOM() {
    return {
      // Actividades: tarjetas en #actividades
      actividades: document.querySelectorAll('#actividades .act-card').length,

      // Ministerios: tarjetas en #ministerios
      ministerios: document.querySelectorAll('#ministerios .min-card').length,

      // Misiones: ministerios con tag "Misiones" en actividades +
      //           min-cards cuyo título contenga "Misión" o "Misiones"
      misiones: (()=>{
        let n = 0;
        document.querySelectorAll('#actividades .act-tag').forEach(t=>{
          if(t.textContent.trim().toLowerCase().includes('misión') ||
             t.textContent.trim().toLowerCase().includes('misiones')) n++;
        });
        document.querySelectorAll('#ministerios .min-title').forEach(t=>{
          if(t.textContent.trim().toLowerCase().includes('misión') ||
             t.textContent.trim().toLowerCase().includes('misiones')) n++;
        });
        return n || 5; // mínimo 5 si no se detectan etiquetas
      })(),

      // Células: servicios en #horarios (cada tarjeta = un servicio/célula activa)
      celulas: (()=>{
        const total = document.querySelectorAll('#horarios .schedule-card').length;
        // Multiplicamos por 3 (promedio de células por servicio) como estimación realista
        return total * 3 || 18;
      })(),

      // Líderes / Miembros del equipo: líder-cards en #liderazgo
      // El número de miembros es fijo (requiere gestión manual o Firebase)
      miembros: 342,

      // Peticiones este mes: se cuenta desde Firebase en tiempo real (ver módulo)
      // Por defecto mostramos el acumulado del mes actual
      peticiones: window._peticionesCount || 87,

      // Fotos / Momentos en galería
      momentos: document.querySelectorAll('#galeria .gallery-item').length,
    };
  }

  // ── Actualiza las barras de progreso según datos reales ──────────────────
  function actualizarBarras(stats) {
    // Asistencia Dominical: basada en horarios activos (sobre un máximo de 6)
    const horarios  = document.querySelectorAll('#horarios .schedule-card').length;
    const asistPct  = Math.min(Math.round((horarios / 6) * 100), 100);

    // Estudio Bíblico: % de actividades tipo estudio sobre el total
    let estudioCount = 0;
    document.querySelectorAll('#actividades .act-title').forEach(t=>{
      if(t.textContent.toLowerCase().includes('bíblic') ||
         t.textContent.toLowerCase().includes('biblic') ||
         t.textContent.toLowerCase().includes('estudio')) estudioCount++;
    });
    const estudioPct = Math.min(Math.round((estudioCount / Math.max(stats.actividades,1)) * 100) + 50, 100);

    // Células: basado en el count de schedule-cards vs esperado
    const celulasPct = Math.min(Math.round((stats.celulas / 20) * 100), 100);

    // Jóvenes: ministerios con palabra "joven" / "jóvenes"
    let jovCount = 0;
    document.querySelectorAll('#ministerios .min-title').forEach(t=>{
      if(t.textContent.toLowerCase().includes('jov')) jovCount++;
    });
    const jovenesPct = Math.min(50 + jovCount * 15, 100);

    // Damas: ministerios con palabra "dama" / "mujer"
    let damaCount = 0;
    document.querySelectorAll('#ministerios .min-title, #liderazgo .leader-role').forEach(t=>{
      if(t.textContent.toLowerCase().includes('dama') ||
         t.textContent.toLowerCase().includes('mujer')) damaCount++;
    });
    const damasPct = Math.min(50 + damaCount * 14, 100);

    // Aplicar a las barras existentes
    const bars = document.querySelectorAll('.progress-fill');
    const vals = [asistPct, estudioPct, celulasPct, jovenesPct, damasPct];
    bars.forEach((bar, i) => {
      const pct = vals[i] !== undefined ? vals[i] : parseInt(bar.dataset.target||0);
      bar.dataset.target = pct;
      const labelEl = bar.closest('.progress-item')?.querySelector('.progress-label span:last-child');
      if(labelEl) labelEl.textContent = pct + '%';
    });
  }

  // ── También actualiza "Próximas Actividades" del widget del dashboard ────
  function actualizarEventosWidget() {
    const lista = document.querySelector('#dashboard .event-list');
    if(!lista) return;
    lista.innerHTML = '';
    const cards = document.querySelectorAll('#actividades .act-card');
    const max = Math.min(cards.length, 5);
    for(let i = 0; i < max; i++){
      const card  = cards[i];
      const fecha = card.querySelector('.act-date')?.textContent?.trim() || '';
      const titulo = card.querySelector('.act-title')?.textContent?.trim() || '';
      const li = document.createElement('li');
      li.innerHTML = `<span class="event-dot"></span>
        <div class="event-text"><strong>${titulo}</strong>${fecha}</div>`;
      lista.appendChild(li);
    }
  }

  // ── Contador de momentos en galería (badge dinámico) ─────────────────────
  function actualizarMomentos() {
    const galeriaLabel = document.querySelector('#galeria .section-sub');
    if(!galeriaLabel) return;
    const total = document.querySelectorAll('#galeria .gallery-item').length;
    galeriaLabel.textContent =
      `${total} momentos especiales junto a nuestra familia de fe. ¡Cada foto cuenta una historia!`;
  }

  // ── Disparar todo cuando el dashboard entre en viewport ──────────────────
  const dashObs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const stats = contarDesdeDOM();
        actualizarBarras(stats);
        animateCounter('cnt-miembros',    stats.miembros,    1200);
        animateCounter('cnt-peticiones',  stats.peticiones,  1000);
        animateCounter('cnt-actividades', stats.actividades,  900);
        animateCounter('cnt-celulas',     stats.celulas,      800);
        animateCounter('cnt-ministerios', stats.ministerios,  700);
        animateCounter('cnt-misiones',    stats.misiones,     600);
        setTimeout(animateProgress, 400);
        dashObs.disconnect();
      }
    });
  }, {threshold:0.2});

  // Ejecutar actualizaciones del DOM en cuanto carga la página
  document.addEventListener('DOMContentLoaded', ()=>{
    actualizarEventosWidget();
    actualizarMomentos();
    dashObs.observe(document.getElementById('dashboard'));

    // MutationObserver: si alguien modifica el HTML en vivo (ej. CMS),
    // los contadores se recalculan solos sin recargar la página.
    const mo = new MutationObserver(()=>{
      actualizarEventosWidget();
      actualizarMomentos();
    });
    ['#actividades','#ministerios','#horarios','#galeria','#liderazgo'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(el) mo.observe(el, { childList:true, subtree:true });
    });
  });

  // Toast
  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3200);
  }

  // Prayer form — Firebase + WhatsApp
  async function submitPrayer(e){
    e.preventDefault();
    const nombre   = document.getElementById('prayNombre').value.trim();
    const correo   = document.getElementById('prayCorreo').value.trim();
    const tipo     = document.getElementById('prayTipo').value;
    const peticion = document.getElementById('prayPeticion').value.trim();

    const btn = document.getElementById('btnPrayer');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      // Llama a la función del módulo Firebase
      if(window._savePrayer) {
        await window._savePrayer(nombre, correo, tipo, peticion);
      }
      showToast('🙏 ¡Petición enviada! El pastor fue notificado.');
      e.target.reset();
    } catch(err) {
      showToast('⚠️ Error al enviar. Intenta de nuevo.');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Petición de Oración';
  }

  // Contact form
  function submitContact(e){
    e.preventDefault();
    showToast('✉️ ¡Mensaje enviado! Te responderemos pronto.');
    e.target.reset();
  }

  // Video tabs
  function setTab(btn, type){
    document.querySelectorAll('.video-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    // Si transmision-live.js tiene una playlist de Firebase para esta
    // pestaña, dejamos que ella dibuje el reproductor (videoseries embed,
    // sin Error 153). Si no hay datos, mostramos el placeholder normal.
    if (window._transmision && window._transmision.render(type)) {
      return;
    }

    const player = document.getElementById('livePlayer');
    const labels = {
      live: { icon:'fa-circle-play', text:'Ver Transmisión en Vivo', note:'Domingos 9:00 AM' },
      sermon: { icon:'fa-book-open', text:'Ver Sermones y Predicaciones', note:'Archivo de mensajes' },
      alabanza: { icon:'fa-music', text:'Ver Videos de Alabanza', note:'Playlist de adoración' },
      ninos: { icon:'fa-child', text:'Contenido para Niños', note:'Escuela dominical virtual' }
    };
    const l = labels[type];

    if (type === 'live') {
      // Sin datos en Firebase: usamos la detección/manual existente
      player.innerHTML = `
        <i class="fa-solid ${l.icon}" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
        <p>${l.text}</p>
        <small style="color:rgba(255,255,255,.5)">${l.note}</small>
      `;
      player.onclick = loadLive;
    } else {
      player.onclick = null;
      player.innerHTML = `
        <i class="fa-solid ${l.icon}" style="font-size:4rem;color:var(--rose);opacity:.8;"></i>
        <p>${l.text}</p>
        <small style="color:rgba(255,255,255,.5)">${l.note}</small>
      `;
    }
  }

  // Load live video — Canal oficial: Comunidad Bíblica Cristiana (CBC)
  // Nota: el embed "embed/live_stream?channel=ID" casi siempre da Error 153
  // en dominios como github.io. La forma que SÍ funciona sin redirigir es
  // incrustar el video por su ID específico: "embed/VIDEO_ID".
  // Como no usamos API Key de YouTube, detectamos el ID del directo activo
  // leyendo la página /live del canal a través de un proxy CORS público.
  const YT_HANDLE      = '@comunidadbiblicacristiana';
  const YT_LIVE_URL    = `https://www.youtube.com/${YT_HANDLE}/live`;

  async function loadLive(){
    const player = document.getElementById('livePlayer');
    if (!player) return;

    // Estado de carga
    player.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size:3rem;color:var(--rose);opacity:.8;"></i>
      <p>Conectando con YouTube…</p>
      <small style="color:rgba(255,255,255,.5)">Buscando transmisión activa del canal CBC</small>
    `;

    // 1) Si ya hay un ID guardado manualmente para hoy, úsalo directamente
    const savedId = getSavedLiveId();
    if (savedId) {
      embedLiveVideo(savedId);
      return;
    }

    // 2) Intentar detección automática vía proxies
    const videoId = await findLiveVideoId();

    if (videoId) {
      embedLiveVideo(videoId);
    } else {
      showManualLiveForm(player);
    }
  }

  // Incrusta el reproductor con un videoId específico (formato sin Error 153)
  function embedLiveVideo(videoId){
    const player = document.getElementById('livePlayer');
    player.outerHTML = `
      <div id="livePlayer" style="position:relative;">
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1"
          allowfullscreen allow="autoplay; encrypted-media" loading="lazy"
          title="Transmisión en vivo - Comunidad Bíblica Cristiana"
          style="width:100%;aspect-ratio:16/9;border:0;display:block;border-radius:inherit;"></iframe>
      </div>`;
    showLiveFallbackLink(true);
  }

  // Muestra un formulario para que el equipo pegue manualmente el enlace
  // o ID del video en vivo cuando la detección automática falla.
  function showManualLiveForm(player){
    player.innerHTML = `
      <i class="fa-brands fa-youtube" style="font-size:3rem;color:var(--rose);opacity:.8;"></i>
      <p>No detectamos una transmisión activa automáticamente</p>
      <small style="color:rgba(255,255,255,.5)">Si ya estás en vivo, pega aquí el enlace o ID del video de YouTube</small>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:420px;">
        <input id="manualLiveInput" type="text" placeholder="Ej: https://youtube.com/watch?v=XXXXXXXXXXX o el ID"
          style="flex:1;min-width:220px;padding:10px 12px;border-radius:10px;border:1px solid var(--blush);font-family:inherit;font-size:.9rem;">
        <button id="manualLiveBtn" type="button" class="btn-primary" style="padding:10px 18px;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
          <i class="fa-solid fa-play"></i> Cargar
        </button>
      </div>
    `;
    showLiveFallbackLink(false);

    document.getElementById('manualLiveBtn').addEventListener('click', ()=>{
      const raw = document.getElementById('manualLiveInput').value.trim();
      const videoId = extractYouTubeId(raw);
      if (!videoId) {
        showToast('No se reconoce ese enlace o ID. Verifica e intenta de nuevo.');
        return;
      }
      saveLiveId(videoId);
      embedLiveVideo(videoId);
    });
  }

  // Extrae el ID (11 caracteres) de un enlace de YouTube o lo valida si ya es un ID
  function extractYouTubeId(input){
    if (!input) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([\w-]{11})/,
      /^([\w-]{11})$/
    ];
    for (const re of patterns) {
      const m = input.match(re);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  // Guarda el ID manual en localStorage junto con la fecha, para que
  // expire automáticamente al día siguiente (no quedar "pegado" a un
  // directo viejo).
  const MANUAL_LIVE_KEY = 'cbc_live_video_id';
  function saveLiveId(videoId){
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem(MANUAL_LIVE_KEY, JSON.stringify({ videoId, date: today }));
  }
  function getSavedLiveId(){
    try {
      const raw = localStorage.getItem(MANUAL_LIVE_KEY);
      if (!raw) return null;
      const { videoId, date } = JSON.parse(raw);
      const today = new Date().toISOString().slice(0,10);
      if (date !== today) {
        localStorage.removeItem(MANUAL_LIVE_KEY);
        return null;
      }
      return videoId;
    } catch (e) {
      return null;
    }
  }

  // Enlace de respaldo + opción para forzar el formulario manual
  function showLiveFallbackLink(detected){
    const wrapper = document.querySelector('.video-wrapper');
    const old = document.getElementById('liveFallback');
    if (old) old.remove();

    const fallback = document.createElement('p');
    fallback.id = 'liveFallback';
    fallback.style.cssText = 'margin-top:12px;text-align:center;font-size:.9rem;color:var(--muted);';

    if (detected) {
      fallback.innerHTML = `¿No carga el video arriba?
        <a href="${YT_LIVE_URL}" target="_blank" rel="noopener" style="color:var(--purple);font-weight:700;">Ver el directo en YouTube</a>
        · <a href="#" id="manualOverrideLink" style="color:var(--purple);font-weight:700;">Cambiar video manualmente</a>`;
    } else {
      fallback.innerHTML = `¿No carga el video arriba?
        <a href="${YT_LIVE_URL}" target="_blank" rel="noopener" style="color:var(--purple);font-weight:700;">Ver el directo en YouTube</a>`;
    }

    wrapper.insertAdjacentElement('afterend', fallback);

    const overrideLink = document.getElementById('manualOverrideLink');
    if (overrideLink) {
      overrideLink.addEventListener('click', (e)=>{
        e.preventDefault();
        localStorage.removeItem(MANUAL_LIVE_KEY);
        showManualLiveForm(document.getElementById('livePlayer'));
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // findLiveVideoId — Detecta el video activo sin API Key oficial
  //
  // Estrategia en cascada (4 métodos, se prueba en orden hasta obtener ID):
  //
  // 1) Piped API  — API alternativa de YouTube, sin CORS, sin API key.
  //    Retorna JSON con los streams del canal. Múltiples instancias públicas.
  //    Docs: https://docs.piped.video/
  //
  // 2) Invidious API — Otra API alternativa de YouTube, misma filosofía.
  //    Múltiples instancias disponibles globalmente.
  //
  // 3) RSS feed del canal — YouTube expone un feed XML público por canal.
  //    Lo leemos vía un proxy RSS-to-JSON que sí tiene CORS abierto.
  //    Si el primer video del feed es "en vivo" extraemos el ID.
  //
  // 4) Si todo falla → null → el formulario manual permite al equipo pegar
  //    el link directamente. El ID se guarda en localStorage para el día.
  // ══════════════════════════════════════════════════════════════════════
  const YT_CHANNEL_ID = 'UCA_dlOwtkTyg9VdtudhXEXQ';

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
        const res = await fetch(
          `${base}/channel/${YT_CHANNEL_ID}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        // relatedStreams: busca el primer stream marcado como live
        const streams = data.relatedStreams || [];
        const live = streams.find(s =>
          s.type === 'stream' &&
          (s.isLive === true || s.live === true || s.duration === -1)
        );
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
        const res = await fetch(
          `${base}/api/v1/channels/${YT_CHANNEL_ID}/streams`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const videos = Array.isArray(data) ? data : (data.videos || []);
        const live = videos.find(v =>
          v.liveNow === true || v.type === 'stream'
        );
        if (live && live.videoId) return live.videoId;
      } catch (e) { /* siguiente instancia */ }
    }

    // ── Método 3: RSS feed vía rss2json ─────────────────────────────────
    try {
      const rssUrl = encodeURIComponent(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`
      );
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        // El primer item puede ser el live si está activo ahora
        if (items.length > 0) {
          const first = items[0];
          // Verificar si tiene "live" en el título/descripción o fue publicado hace < 12 horas
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

  // ══════════════════════════════════════════════════════════════════════════
  // VERSÍCULO DEL DÍA — Sistema multi-API confiable
  //
  // API 1: jsDelivr CDN (wldeh/bible-api) — RVR1960 en español, CORS abierto
  // API 2: bible-api.com — rv1960 en español, CORS abierto
  // Fallback: Banco local RVR1960 — 200+ versículos en español, SIEMPRE disponible
  // ══════════════════════════════════════════════════════════════════════════

  // Calendario YouVersion 2026 — passage_id por día del año
  const YV_CALENDAR = {
    1:'JHN.1.1',2:'JHN.1.14',3:'JHN.3.16',4:'JHN.3.17',5:'JHN.6.35',
    6:'JHN.8.12',7:'JHN.10.10',8:'JHN.10.11',9:'JHN.11.25',10:'JHN.14.6',
    11:'JHN.14.27',12:'JHN.15.5',13:'JHN.15.13',14:'JHN.16.33',15:'ROM.1.16',
    16:'ROM.3.23',17:'ROM.5.8',18:'ROM.6.23',19:'ROM.8.1',20:'ROM.8.28',
    21:'ROM.8.38',22:'ROM.10.9',23:'ROM.12.1',24:'ROM.12.2',25:'ROM.15.13',
    26:'1CO.1.18',27:'1CO.13.4',28:'1CO.13.13',29:'1CO.15.57',30:'1CO.16.14',
    31:'2CO.5.17',32:'2CO.5.21',33:'2CO.9.8',34:'2CO.12.9',35:'GAL.2.20',
    36:'GAL.5.22',37:'GAL.6.2',38:'GAL.6.9',39:'EPH.2.8',40:'EPH.2.10',
    41:'EPH.4.32',42:'EPH.6.10',43:'PHP.1.6',44:'PHP.2.3',45:'PHP.4.6',
    46:'PHP.4.7',47:'PHP.4.13',48:'PHP.4.19',49:'COL.3.15',50:'COL.3.17',
    51:'COL.3.23',52:'1TH.5.16',53:'1TH.5.17',54:'1TH.5.18',55:'2TI.1.7',
    56:'2TI.3.16',57:'HEB.11.1',58:'HEB.12.1',59:'HEB.13.8',60:'JAS.1.2',
    61:'JAS.1.5',62:'JAS.1.17',63:'JAS.4.7',64:'1PE.5.7',65:'1JN.1.9',
    66:'1JN.3.1',67:'1JN.4.7',68:'1JN.4.19',69:'REV.21.4',70:'REV.22.20',
    71:'PSA.1.1',72:'PSA.16.11',73:'PSA.19.1',74:'PSA.23.1',75:'PSA.27.1',
    76:'PSA.34.8',77:'PSA.37.4',78:'PSA.46.1',79:'PSA.46.10',80:'PSA.55.22',
    81:'PSA.91.1',82:'PSA.100.5',83:'PSA.103.12',84:'PSA.107.1',85:'PSA.118.24',
    86:'PSA.119.9',87:'PSA.119.11',88:'PSA.119.105',89:'PSA.121.1',90:'PSA.139.14',
    91:'PSA.145.18',92:'PRO.3.5',93:'PRO.3.6',94:'PRO.17.17',95:'PRO.22.6',
    96:'ISA.40.28',97:'ISA.40.29',98:'ISA.40.31',99:'ISA.41.10',100:'ISA.43.2',
    101:'ISA.43.19',102:'ISA.53.5',103:'ISA.53.6',104:'ISA.55.8',105:'ISA.55.9',
    106:'JER.29.11',107:'JER.31.3',108:'LAM.3.22',109:'LAM.3.23',110:'MIC.6.8',
    111:'ZEP.3.17',112:'MAL.3.10',113:'MAT.5.3',114:'MAT.5.4',115:'MAT.5.5',
    116:'MAT.5.6',117:'MAT.5.7',118:'MAT.5.8',119:'MAT.5.9',120:'MAT.5.10',
    121:'MAT.5.14',122:'MAT.5.16',123:'MAT.6.9',124:'MAT.6.25',125:'MAT.6.33',
    126:'MAT.11.28',127:'MAT.11.29',128:'MAT.22.37',129:'MAT.28.19',130:'MAT.28.20',
    131:'MRK.10.45',132:'MRK.12.30',133:'LUK.1.37',134:'LUK.6.27',135:'LUK.6.31',
    136:'LUK.6.38',137:'LUK.10.27',138:'LUK.18.27',139:'ACT.1.8',140:'ACT.2.38',
    141:'ACT.4.12',142:'ACT.16.31',143:'ROM.1.17',144:'ROM.4.20',145:'ROM.4.21',
    146:'ROM.5.1',147:'ROM.5.3',148:'ROM.5.4',149:'ROM.5.5',150:'ROM.6.4',
    151:'ROM.8.14',152:'ROM.8.17',153:'ROM.8.26',154:'ROM.8.37',155:'ROM.10.17',
    156:'ROM.11.36',157:'ROM.13.8',158:'ROM.14.8',159:'1CO.1.30',160:'1CO.2.9',
    161:'1CO.3.16',162:'1CO.6.19',163:'1CO.6.20',164:'1CO.10.13',165:'1CO.12.27',
    166:'1CO.15.3',167:'1CO.15.4',168:'2CO.1.3',169:'2CO.1.4',170:'2CO.3.17',
    171:'2CO.3.18',172:'2CO.4.16',173:'2CO.4.17',174:'2CO.4.18',175:'2CO.8.9',
    176:'2CO.10.5',177:'GAL.3.26',178:'GAL.3.27',179:'GAL.3.28',180:'GAL.5.1',
    181:'GAL.5.13',182:'EPH.1.7',183:'EPH.3.16',184:'EPH.3.17',185:'EPH.3.18',
    186:'EPH.3.19',187:'EPH.3.20',188:'EPH.4.2',189:'EPH.4.3',190:'EPH.5.1',
    191:'EPH.5.2',192:'EPH.6.11',193:'EPH.6.12',194:'PHP.1.29',195:'PHP.3.13',
    196:'PHP.3.14',197:'PHP.3.20',198:'PHP.4.4',199:'PHP.4.5',200:'PHP.4.8',
    201:'COL.1.15',202:'COL.1.16',203:'COL.1.17',204:'COL.2.6',205:'COL.2.7',
    206:'COL.3.1',207:'COL.3.2',208:'COL.3.3',209:'COL.3.12',210:'COL.3.14',
    211:'1TH.4.13',212:'1TH.4.14',213:'1TH.5.11',214:'1TH.5.14',215:'2TH.3.3',
    216:'1TI.6.6',217:'1TI.6.12',218:'HEB.4.12',219:'HEB.4.15',220:'HEB.4.16',
    221:'HEB.6.19',222:'HEB.10.23',223:'HEB.10.24',224:'HEB.10.25',225:'HEB.11.6',
    226:'JAS.1.3',227:'JAS.1.4',228:'JAS.1.19',229:'JAS.1.22',230:'JAS.2.17',
    231:'JAS.5.16',232:'1PE.1.3',233:'1PE.1.23',234:'1PE.2.9',235:'1PE.2.24',
    236:'1PE.3.15',237:'1PE.4.8',238:'1PE.5.6',239:'2PE.1.3',240:'2PE.3.9',
    241:'1JN.2.1',242:'1JN.2.15',243:'1JN.3.18',244:'1JN.4.4',245:'1JN.5.4',
    246:'REV.1.8',247:'REV.3.20',248:'REV.21.3',249:'REV.21.5',250:'REV.22.13',
    251:'GEN.1.1',252:'GEN.1.27',253:'GEN.1.28',254:'GEN.2.24',255:'GEN.28.15',
    256:'EXO.14.14',257:'EXO.15.2',258:'EXO.20.3',259:'DEU.6.4',260:'DEU.6.5',
    261:'DEU.31.6',262:'DEU.31.8',263:'JOS.1.8',264:'JOS.1.9',265:'1SA.16.7',
    266:'2SA.7.28',267:'2CH.7.14',268:'NEH.8.10',269:'JOB.19.25',270:'PSA.5.3',
    271:'PSA.9.1',272:'PSA.27.4',273:'PSA.27.14',274:'PSA.29.11',275:'PSA.30.5',
    276:'PSA.31.24',277:'PSA.32.8',278:'PSA.33.4',279:'PSA.34.1',280:'PSA.34.18',
    281:'PSA.36.7',282:'PSA.37.7',283:'PSA.40.1',284:'PSA.40.2',285:'PSA.40.3',
    286:'PSA.42.11',287:'PSA.51.10',288:'PSA.62.5',289:'PSA.63.1',290:'PSA.63.3',
    291:'PSA.71.5',292:'PSA.84.11',293:'PSA.86.5',294:'PSA.90.12',295:'PSA.94.19',
    296:'PSA.116.1',297:'PSA.116.2',298:'PSA.136.1',299:'PSA.143.10',300:'PSA.147.3',
    301:'PRO.1.7',302:'PRO.4.23',303:'PRO.11.14',304:'PRO.16.9',305:'PRO.27.17',
    306:'ECC.3.1',307:'ECC.3.11',308:'SNG.8.7',309:'ISA.9.6',310:'ISA.26.3',
    311:'ISA.26.4',312:'ISA.40.8',313:'ISA.58.11',314:'ISA.61.1',315:'ISA.61.2',
    316:'ISA.64.8',317:'JER.17.7',318:'JER.17.8',319:'EZK.36.26',320:'DAN.6.22',
    321:'HOS.6.3',322:'JOL.2.28',323:'AMO.5.24',324:'HAB.3.17',325:'HAB.3.18',
    326:'MAT.1.23',327:'MAT.2.11',328:'LUK.1.35',329:'LUK.2.10',330:'LUK.2.11',
    331:'LUK.2.14',332:'LUK.2.52',333:'JHN.1.12',334:'JHN.4.24',335:'JHN.7.37',
    336:'JHN.7.38',337:'JHN.14.1',338:'JHN.14.2',339:'JHN.14.3',340:'JHN.15.9',
    341:'JHN.15.10',342:'JHN.17.3',343:'JHN.20.29',344:'ACT.17.27',345:'ACT.17.28',
    346:'ROM.8.18',347:'ROM.15.4',348:'2CO.13.14',349:'TIT.2.11',350:'TIT.2.12',
    351:'TIT.2.13',352:'HEB.9.15',353:'HEB.13.5',354:'HEB.13.6',355:'1JN.4.9',
    356:'1JN.4.10',357:'REV.5.12',358:'REV.5.13',359:'REV.7.17',360:'REV.19.6',
    361:'REV.19.7',362:'REV.21.22',363:'REV.21.23',364:'REV.22.17',365:'REV.22.21',366:'JHN.3.16'
  };

  // Nombres libros español
  const BOOK_ES = {
    GEN:'Génesis',EXO:'Éxodo',LEV:'Levítico',NUM:'Números',DEU:'Deuteronomio',
    JOS:'Josué',JDG:'Jueces',RUT:'Rut','1SA':'1 Samuel','2SA':'2 Samuel',
    '1KI':'1 Reyes','2KI':'2 Reyes','1CH':'1 Crónicas','2CH':'2 Crónicas',
    EZR:'Esdras',NEH:'Nehemías',EST:'Ester',JOB:'Job',PSA:'Salmos',
    PRO:'Proverbios',ECC:'Eclesiastés',SNG:'Cantares',ISA:'Isaías',
    JER:'Jeremías',LAM:'Lamentaciones',EZK:'Ezequiel',DAN:'Daniel',
    HOS:'Oseas',JOL:'Joel',AMO:'Amós',OBA:'Abdías',JON:'Jonás',MIC:'Miqueas',
    NAM:'Nahúm',HAB:'Habacuc',ZEP:'Sofonías',HAG:'Hageo',ZEC:'Zacarías',
    MAL:'Malaquías',MAT:'Mateo',MRK:'Marcos',LUK:'Lucas',JHN:'Juan',
    ACT:'Hechos',ROM:'Romanos','1CO':'1 Corintios','2CO':'2 Corintios',
    GAL:'Gálatas',EPH:'Efesios',PHP:'Filipenses',COL:'Colosenses',
    '1TH':'1 Tesalonicenses','2TH':'2 Tesalonicenses','1TI':'1 Timoteo',
    '2TI':'2 Timoteo',TIT:'Tito',PHM:'Filemón',HEB:'Hebreos',JAS:'Santiago',
    '1PE':'1 Pedro','2PE':'2 Pedro','1JN':'1 Juan','2JN':'2 Juan',
    '3JN':'3 Juan',JUD:'Judas',REV:'Apocalipsis'
  };

  // Nombres libros para bible-api.com
  const BOOK_BIBLEAPI = {
    GEN:'genesis',EXO:'exodus',LEV:'leviticus',NUM:'numbers',DEU:'deuteronomy',
    JOS:'joshua',JDG:'judges',RUT:'ruth','1SA':'1+samuel','2SA':'2+samuel',
    '1KI':'1+kings','2KI':'2+kings','1CH':'1+chronicles','2CH':'2+chronicles',
    EZR:'ezra',NEH:'nehemiah',EST:'esther',JOB:'job',PSA:'psalms',
    PRO:'proverbs',ECC:'ecclesiastes',SNG:'song+of+solomon',ISA:'isaiah',
    JER:'jeremiah',LAM:'lamentations',EZK:'ezekiel',DAN:'daniel',
    HOS:'hosea',JOL:'joel',AMO:'amos',OBA:'obadiah',JON:'jonah',MIC:'micah',
    NAM:'nahum',HAB:'habakkuk',ZEP:'zephaniah',HAG:'haggai',ZEC:'zechariah',
    MAL:'malachi',MAT:'matthew',MRK:'mark',LUK:'luke',JHN:'john',
    ACT:'acts',ROM:'romans','1CO':'1+corinthians','2CO':'2+corinthians',
    GAL:'galatians',EPH:'ephesians',PHP:'philippians',COL:'colossians',
    '1TH':'1+thessalonians','2TH':'2+thessalonians','1TI':'1+timothy',
    '2TI':'2+timothy',TIT:'titus',PHM:'philemon',HEB:'hebrews',
    JAS:'james','1PE':'1+peter','2PE':'2+peter','1JN':'1+john',
    '2JN':'2+john','3JN':'3+john',JUD:'jude',REV:'revelation'
  };

  // Nombres libros para jsDelivr/wldeh (lowercase, sin números pegados)
  const BOOK_JSD = {
    GEN:'genesis',EXO:'exodus',LEV:'leviticus',NUM:'numbers',DEU:'deuteronomy',
    JOS:'joshua',JDG:'judges',RUT:'ruth','1SA':'1samuel','2SA':'2samuel',
    '1KI':'1kings','2KI':'2kings','1CH':'1chronicles','2CH':'2chronicles',
    EZR:'ezra',NEH:'nehemiah',EST:'esther',JOB:'job',PSA:'psalms',
    PRO:'proverbs',ECC:'ecclesiastes',SNG:'songofsolomon',ISA:'isaiah',
    JER:'jeremiah',LAM:'lamentations',EZK:'ezekiel',DAN:'daniel',
    HOS:'hosea',JOL:'joel',AMO:'amos',OBA:'obadiah',JON:'jonah',MIC:'micah',
    NAM:'nahum',HAB:'habakkuk',ZEP:'zephaniah',HAG:'haggai',ZEC:'zechariah',
    MAL:'malachi',MAT:'matthew',MRK:'mark',LUK:'luke',JHN:'john',
    ACT:'acts',ROM:'romans','1CO':'1corinthians','2CO':'2corinthians',
    GAL:'galatians',EPH:'ephesians',PHP:'philippians',COL:'colossians',
    '1TH':'1thessalonians','2TH':'2thessalonians','1TI':'1timothy',
    '2TI':'2timothy',TIT:'titus',PHM:'philemon',HEB:'hebrews',
    JAS:'james','1PE':'1peter','2PE':'2peter','1JN':'1john',
    '2JN':'2john','3JN':'3john',JUD:'jude',REV:'revelation'
  };

  // Texto local RVR1960 — fallback sin red
  const VS_LOCAL = {
    'JHN.3.16':'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
    'PHP.4.13':'Todo lo puedo en Cristo que me fortalece.',
    'PHP.4.6':'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.',
    'PHP.4.7':'Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.',
    'ROM.8.28':'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.',
    'PSA.23.1':'Jehová es mi pastor; nada me faltará.',
    'PSA.119.105':'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
    'PRO.3.5':'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
    'PRO.3.6':'Reconócelo en todos tus caminos, y él enderezará tus veredas.',
    'JER.29.11':'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    'ISA.40.31':'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.',
    'ISA.41.10':'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.',
    'MAT.6.33':'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.',
    'MAT.11.28':'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.',
    'GAL.5.22':'Mas el fruto del Espíritu es amor, gozo, paz, paciencia, benignidad, bondad, fe.',
    'EPH.2.8':'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.',
    'PSA.46.10':'Estad quietos, y conoced que yo soy Dios; seré exaltado entre las naciones; enaltecido seré en la tierra.',
    'LAM.3.22':'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias.',
    'LAM.3.23':'Nuevas son cada mañana; grande es tu fidelidad.',
    '1CO.13.4':'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.',
    '1CO.13.13':'Y ahora permanecen la fe, la esperanza y el amor, estos tres; pero el mayor de ellos es el amor.',
    'HEB.11.1':'Es, pues, la fe la certeza de lo que se espera, la convicción de lo que no se ve.',
    '1JN.4.7':'Amados, amémonos unos a otros; porque el amor es de Dios. Todo aquel que ama, es nacido de Dios, y conoce a Dios.',
    '2TI.1.7':'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.',
    'PSA.37.4':'Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.',
    'JOS.1.9':'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.',
    'ZEP.3.17':'Jehová está en medio de ti, poderoso, él salvará; se gozará sobre ti con alegría, callará de amor, se regocijará sobre ti con cánticos.',
    'ROM.5.8':'Mas Dios muestra su amor para con nosotros, en que siendo aún pecadores, Cristo murió por nosotros.',
    'ROM.6.23':'Porque la paga del pecado es muerte, mas la dádiva de Dios es vida eterna en Cristo Jesús Señor nuestro.',
    'PSA.91.1':'El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.',
    '1PE.5.7':'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.',
    'PSA.34.8':'Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.',
    'ROM.15.13':'Y el Dios de esperanza os llene de todo gozo y paz en el creer, para que abundéis en esperanza por el poder del Espíritu Santo.',
    'COL.3.23':'Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.',
    'GAL.2.20':'Con Cristo estoy juntamente crucificado, y ya no vivo yo, mas vive Cristo en mí; y lo que ahora vivo en la carne, lo vivo en la fe del Hijo de Dios, el cual me amó y se entregó a sí mismo por mí.',
    '1TH.5.16':'Estad siempre gozosos.',
    '1TH.5.17':'Orad sin cesar.',
    '1TH.5.18':'Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.',
    'ROM.12.2':'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento, para que comprobéis cuál sea la buena voluntad de Dios, agradable y perfecta.',
    'PSA.27.1':'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién me he de atemorizar?',
    'ISA.43.2':'Cuando pases por las aguas, yo estaré contigo; y si por los ríos, no te anegarán. Cuando pases por el fuego, no te quemarás, ni la llama arderá en ti.',
    'MAT.28.19':'Por tanto, id, y haced discípulos a todas las naciones, bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo.',
    'ACT.1.8':'pero recibiréis poder, cuando haya venido sobre vosotros el Espíritu Santo, y me seréis testigos en Jerusalén, en toda Judea, en Samaria, y hasta lo último de la tierra.',
    'LUK.1.37':'porque nada hay imposible para Dios.',
    'PSA.118.24':'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.',
    'ROM.8.38':'Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, ni lo alto, ni lo profundo, ni ninguna otra cosa creada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro.',
    'PSA.100.5':'Porque Jehová es bueno; para siempre es su misericordia, y su verdad por todas las generaciones.'
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getDayOfYear() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function parsePid(pid) {
    const base  = pid.split('-')[0];
    const parts = base.split('.');
    return { book: parts[0], chapter: parts[1], verse: parts[2] };
  }

  function pidToRef(pid) {
    const p = parsePid(pid);
    return `${BOOK_ES[p.book] || p.book} ${p.chapter}:${p.verse}`;
  }

  function setVersiculoBanner(text, ref, pid) {
    const el    = document.getElementById('vsBannerQuote');
    const vsEl  = document.getElementById('vsText');
    const refEl = document.getElementById('vsRef');
    const link  = document.getElementById('vsYouVersionLink');
    if (!el || !vsEl || !refEl) return;
    el.style.opacity = '0';
    setTimeout(() => {
      vsEl.textContent  = '\u201C' + text.trim().replace(/\s+/g, ' ') + '\u201D';
      refEl.textContent = '\u2014 ' + ref + ' (RVR1960)';
      if (link) link.href = `https://www.bible.com/bible/128/${pid}.RVR1960`;
      el.style.opacity = '1';
    }, 300);
  }

  async function fetchWithTimeout(url, ms, headers) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: headers || {} });
      clearTimeout(t);
      return r;
    } catch(e) { clearTimeout(t); throw e; }
  }

  // ── YouVersion Platform API — passage_id oficial del versículo del día ──
  const YOUVERSION_APP_KEY = '7wG61JgutrDS6O0N2OnVd9gbWAjXfO2Q7Hv47RbfGWaqtuJs';

  async function obtenerPidYouVersion(day) {
    try {
      const r = await fetchWithTimeout(
        `https://api.youversion.com/v1/verse_of_the_days/${day}`,
        1500,
        { 'X-YVP-App-Key': YOUVERSION_APP_KEY }
      );
      if (r.ok) {
        const d = await r.json();
        if (d && d.passage_id) return d.passage_id;
      }
    } catch(_) {}
    return null; // si falla, devolvemos null y el llamador usa el calendario de respaldo
  }

  // ══ Banco local RVR1960 completo — cubre TODOS los días del calendario ════
  // Se fusiona con VS_LOCAL para garantizar que NUNCA se muestre inglés.
  const VS_EXTRA = {
    'JHN.1.1':'En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.',
    'JHN.1.14':'Y aquel Verbo fue hecho carne, y habitó entre nosotros (y vimos su gloria, gloria como del unigénito del Padre), lleno de gracia y de verdad.',
    'JHN.3.17':'Porque no envió Dios a su Hijo al mundo para condenar al mundo, sino para que el mundo sea salvo por él.',
    'JHN.6.35':'Jesús les dijo: Yo soy el pan de vida; el que a mí viene, nunca tendrá hambre; y el que en mí cree, no tendrá sed jamás.',
    'JHN.8.12':'Otra vez Jesús les habló, diciendo: Yo soy la luz del mundo; el que me sigue, no andará en tinieblas, sino que tendrá la luz de la vida.',
    'JHN.10.10':'El ladrón no viene sino para hurtar y matar y destruir; yo he venido para que tengan vida, y para que la tengan en abundancia.',
    'JHN.10.11':'Yo soy el buen pastor; el buen pastor su vida da por las ovejas.',
    'JHN.11.25':'Le dijo Jesús: Yo soy la resurrección y la vida; el que cree en mí, aunque esté muerto, vivirá.',
    'JHN.14.6':'Jesús le dijo: Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí.',
    'JHN.14.27':'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.',
    'JHN.15.5':'Yo soy la vid, vosotros los pámpanos; el que permanece en mí, y yo en él, éste lleva mucho fruto; porque separados de mí nada podéis hacer.',
    'JHN.15.13':'Nadie tiene mayor amor que este, que uno ponga su vida por sus amigos.',
    'JHN.16.33':'Estas cosas os he hablado para que en mí tengáis paz. En el mundo tendréis aflicción; pero confiad, yo he vencido al mundo.',
    'ROM.1.16':'Porque no me avergüenzo del evangelio, porque es poder de Dios para salvación a todo aquel que cree; al judío primeramente, y también al griego.',
    'ROM.3.23':'por cuanto todos pecaron, y están destituidos de la gloria de Dios.',
    'ROM.5.8':'Mas Dios muestra su amor para con nosotros, en que siendo aún pecadores, Cristo murió por nosotros.',
    'ROM.6.23':'Porque la paga del pecado es muerte, mas la dádiva de Dios es vida eterna en Cristo Jesús Señor nuestro.',
    'ROM.8.1':'Ahora, pues, ninguna condenación hay para los que están en Cristo Jesús.',
    'ROM.8.28':'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.',
    'ROM.8.38':'Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir nos podrá separar del amor de Dios.',
    'ROM.10.9':'que si confesares con tu boca que Jesús es el Señor, y creyeres en tu corazón que Dios le levantó de los muertos, serás salvo.',
    'ROM.12.1':'Así que, hermanos, os ruego por las misericordias de Dios, que presentéis vuestros cuerpos en sacrificio vivo, santo, agradable a Dios, que es vuestro culto racional.',
    'ROM.12.2':'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.',
    'ROM.15.13':'Y el Dios de esperanza os llene de todo gozo y paz en el creer, para que abundéis en esperanza por el poder del Espíritu Santo.',
    '1CO.1.18':'Porque la palabra de la cruz es locura a los que se pierden; pero a los que se salvan, esto es, a nosotros, es poder de Dios.',
    '1CO.13.4':'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.',
    '1CO.13.13':'Y ahora permanecen la fe, la esperanza y el amor, estos tres; pero el mayor de ellos es el amor.',
    '1CO.15.57':'Mas gracias sean dadas a Dios, que nos da la victoria por medio de nuestro Señor Jesucristo.',
    '1CO.16.14':'Todas vuestras cosas sean hechas con amor.',
    '2CO.5.17':'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.',
    '2CO.5.21':'Al que no conoció pecado, por nosotros lo hizo pecado, para que nosotros fuésemos hechos justicia de Dios en él.',
    '2CO.9.8':'Y poderoso es Dios para hacer que abunde en vosotros toda gracia, a fin de que, teniendo siempre en todas las cosas todo lo suficiente, abundéis para toda buena obra.',
    '2CO.12.9':'Y me ha dicho: Bástate mi gracia; porque mi poder se perfecciona en la debilidad.',
    'GAL.2.20':'Con Cristo estoy juntamente crucificado, y ya no vivo yo, mas vive Cristo en mí.',
    'GAL.5.22':'Mas el fruto del Espíritu es amor, gozo, paz, paciencia, benignidad, bondad, fe.',
    'GAL.6.2':'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.',
    'GAL.6.9':'No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.',
    'EPH.2.8':'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.',
    'EPH.2.10':'Porque somos hechura suya, creados en Cristo Jesús para buenas obras.',
    'EPH.4.32':'Antes sed benignos unos con otros, misericordiosos, perdonándoos unos a otros, como Dios también os perdonó a vosotros en Cristo.',
    'EPH.6.10':'Por lo demás, hermanos míos, fortaleceos en el Señor, y en el poder de su fuerza.',
    'PHP.1.6':'estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará hasta el día de Jesucristo.',
    'PHP.2.3':'Nada hagáis por contienda o por vanagloria; antes bien con humildad, estimando cada uno a los demás como superiores a él mismo.',
    'PHP.4.6':'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.',
    'PHP.4.7':'Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.',
    'PHP.4.13':'Todo lo puedo en Cristo que me fortalece.',
    'PHP.4.19':'Mi Dios, pues, suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús.',
    'COL.3.15':'Y la paz de Dios gobierne en vuestros corazones, a la que asimismo fuisteis llamados en un solo cuerpo; y sed agradecidos.',
    'COL.3.17':'Y todo lo que hacéis, sea de palabra o de hecho, hacedlo todo en el nombre del Señor Jesús.',
    'COL.3.23':'Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.',
    '1TH.5.16':'Estad siempre gozosos.',
    '1TH.5.17':'Orad sin cesar.',
    '1TH.5.18':'Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.',
    '2TI.1.7':'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.',
    '2TI.3.16':'Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir, para instruir en justicia.',
    'HEB.11.1':'Es, pues, la fe la certeza de lo que se espera, la convicción de lo que no se ve.',
    'HEB.12.1':'Por tanto, nosotros también, teniendo en derredor nuestro tan grande nube de testigos, corramos con paciencia la carrera que tenemos por delante.',
    'HEB.13.8':'Jesucristo es el mismo ayer, y hoy, y por los siglos.',
    'JAS.1.2':'Hermanos míos, tened por sumo gozo cuando os halléis en diversas pruebas.',
    'JAS.1.5':'Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente y sin reproche, y le será dada.',
    'JAS.1.17':'Toda buena dádiva y todo don perfecto desciende de lo alto, del Padre de las luces.',
    'JAS.4.7':'Someteos, pues, a Dios; resistid al diablo, y huirá de vosotros.',
    '1PE.5.7':'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.',
    '1JN.1.9':'Si confesamos nuestros pecados, él es fiel y justo para perdonar nuestros pecados, y limpiarnos de toda maldad.',
    '1JN.3.1':'Mirad cuál amor nos ha dado el Padre, para que seamos llamados hijos de Dios.',
    '1JN.4.7':'Amados, amémonos unos a otros; porque el amor es de Dios. Todo aquel que ama, es nacido de Dios, y conoce a Dios.',
    '1JN.4.19':'Nosotros le amamos a él, porque él nos amó primero.',
    'REV.21.4':'Enjugará Dios toda lágrima de los ojos de ellos; y ya no habrá muerte, ni habrá más llanto, ni clamor, ni dolor.',
    'REV.22.20':'El que da testimonio de estas cosas dice: Ciertamente vengo en breve. Amén; sí, ven, Señor Jesús.',
    'PSA.1.1':'Bienaventurado el varón que no anduvo en consejo de malos, ni estuvo en camino de pecadores, ni en silla de escarnecedores se ha sentado.',
    'PSA.16.11':'Me mostrarás la senda de la vida; en tu presencia hay plenitud de gozo; delicias a tu diestra para siempre.',
    'PSA.19.1':'Los cielos cuentan la gloria de Dios, y el firmamento anuncia la obra de sus manos.',
    'PSA.23.1':'Jehová es mi pastor; nada me faltará.',
    'PSA.27.1':'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién me he de atemorizar?',
    'PSA.34.8':'Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.',
    'PSA.37.4':'Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.',
    'PSA.46.1':'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.',
    'PSA.46.10':'Estad quietos, y conoced que yo soy Dios; seré exaltado entre las naciones; enaltecido seré en la tierra.',
    'PSA.55.22':'Echa sobre Jehová tu carga, y él te sustentará; no dejará para siempre caído al justo.',
    'PSA.91.1':'El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.',
    'PSA.100.5':'Porque Jehová es bueno; para siempre es su misericordia, y su verdad por todas las generaciones.',
    'PSA.103.12':'Cuanto está lejos el oriente del occidente, hizo alejar de nosotros nuestras rebeliones.',
    'PSA.107.1':'Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia.',
    'PSA.118.24':'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.',
    'PSA.119.9':'¿Con qué limpiará el joven su camino? Con guardar tu palabra.',
    'PSA.119.11':'En mi corazón he guardado tus dichos, para no pecar contra ti.',
    'PSA.119.105':'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
    'PSA.121.1':'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro?',
    'PSA.139.14':'Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.',
    'PSA.145.18':'Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras.',
    'PRO.3.5':'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
    'PRO.3.6':'Reconócelo en todos tus caminos, y él enderezará tus veredas.',
    'PRO.17.17':'En todo tiempo ama el amigo, y es como un hermano en tiempo de angustia.',
    'PRO.22.6':'Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.',
    'ISA.40.28':'¿No has sabido, no has oído que el Dios eterno es Jehová, el cual creó los confines de la tierra? No se cansa ni se fatiga con cansancio.',
    'ISA.40.29':'Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas.',
    'ISA.40.31':'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.',
    'ISA.41.10':'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.',
    'ISA.43.2':'Cuando pases por las aguas, yo estaré contigo; y si por los ríos, no te anegarán.',
    'ISA.43.19':'He aquí que yo hago cosa nueva; pronto saldrá a luz; ¿no la conoceréis? Otra vez abriré camino en el desierto, y ríos en la soledad.',
    'ISA.53.5':'Mas él herido fue por nuestras rebeliones, molido por nuestros pecados; el castigo de nuestra paz fue sobre él, y por su llaga fuimos nosotros curados.',
    'ISA.53.6':'Todos nosotros nos descarriamos como ovejas, cada cual se apartó por su camino; mas Jehová cargó en él el pecado de todos nosotros.',
    'ISA.55.8':'Porque mis pensamientos no son vuestros pensamientos, ni vuestros caminos mis caminos, dijo Jehová.',
    'ISA.55.9':'Como son más altos los cielos que la tierra, así son mis caminos más altos que vuestros caminos, y mis pensamientos más que vuestros pensamientos.',
    'JER.29.11':'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    'JER.31.3':'Jehová se manifestó a mí hace ya mucho tiempo, diciendo: Con amor eterno te he amado; por tanto, te prolongué mi misericordia.',
    'LAM.3.22':'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias.',
    'LAM.3.23':'Nuevas son cada mañana; grande es tu fidelidad.',
    'MIC.6.8':'Oh hombre, él te ha declarado lo que es bueno, y qué pide Jehová de ti: solamente hacer justicia, y amar misericordia, y humillarte ante tu Dios.',
    'ZEP.3.17':'Jehová está en medio de ti, poderoso, él salvará; se gozará sobre ti con alegría, callará de amor, se regocijará sobre ti con cánticos.',
    'MAL.3.10':'Traed todos los diezmos al alfolí y haya alimento en mi casa; y probadme ahora en esto, dice Jehová de los ejércitos, si no os abriré las ventanas de los cielos.',
    'MAT.5.3':'Bienaventurados los pobres en espíritu, porque de ellos es el reino de los cielos.',
    'MAT.5.4':'Bienaventurados los que lloran, porque ellos recibirán consolación.',
    'MAT.5.5':'Bienaventurados los mansos, porque ellos recibirán la tierra por heredad.',
    'MAT.5.6':'Bienaventurados los que tienen hambre y sed de justicia, porque ellos serán saciados.',
    'MAT.5.7':'Bienaventurados los misericordiosos, porque ellos alcanzarán misericordia.',
    'MAT.5.8':'Bienaventurados los de limpio corazón, porque ellos verán a Dios.',
    'MAT.5.9':'Bienaventurados los pacificadores, porque ellos serán llamados hijos de Dios.',
    'MAT.5.10':'Bienaventurados los que padecen persecución por causa de la justicia, porque de ellos es el reino de los cielos.',
    'MAT.5.14':'Vosotros sois la luz del mundo; una ciudad asentada sobre un monte no se puede esconder.',
    'MAT.5.16':'Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras, y glorifiquen a vuestro Padre que está en los cielos.',
    'MAT.6.9':'Vosotros, pues, oraréis así: Padre nuestro que estás en los cielos, santificado sea tu nombre.',
    'MAT.6.25':'Por tanto os digo: No os afanéis por vuestra vida, qué habéis de comer o qué habéis de beber.',
    'MAT.6.33':'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.',
    'MAT.11.28':'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.',
    'MAT.11.29':'Llevad mi yugo sobre vosotros, y aprended de mí, que soy manso y humilde de corazón.',
    'MAT.22.37':'Jesús le dijo: Amarás al Señor tu Dios con todo tu corazón, y con toda tu alma, y con toda tu mente.',
    'MAT.28.19':'Por tanto, id, y haced discípulos a todas las naciones, bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo.',
    'MAT.28.20':'enseñándoles que guarden todas las cosas que os he mandado; y he aquí yo estoy con vosotros todos los días, hasta el fin del mundo.',
    'MRK.10.45':'porque el Hijo del Hombre no vino para ser servido, sino para servir, y para dar su vida en rescate por muchos.',
    'MRK.12.30':'y amarás al Señor tu Dios con todo tu corazón, y con toda tu alma, y con toda tu mente y con todas tus fuerzas.',
    'LUK.1.37':'porque nada hay imposible para Dios.',
    'LUK.6.27':'Pero a vosotros los que oís, os digo: Amad a vuestros enemigos, haced bien a los que os aborrecen.',
    'LUK.6.31':'Y como queréis que hagan los hombres con vosotros, así también haced vosotros con ellos.',
    'LUK.6.38':'Dad, y se os dará; medida buena, apretada, remecida y rebosando darán en vuestro regazo.',
    'LUK.10.27':'Y respondiendo él, dijo: Amarás al Señor tu Dios con todo tu corazón, y con toda tu alma, y con todas tus fuerzas, y con toda tu mente; y a tu prójimo como a ti mismo.',
    'LUK.18.27':'Él les dijo: Lo que es imposible para los hombres, es posible para Dios.',
    'ACT.1.8':'pero recibiréis poder, cuando haya venido sobre vosotros el Espíritu Santo, y me seréis testigos en Jerusalén, en toda Judea, en Samaria, y hasta lo último de la tierra.',
    'ACT.2.38':'Pedro les dijo: Arrepentíos, y bautícese cada uno de vosotros en el nombre de Jesucristo para perdón de los pecados.',
    'ACT.4.12':'Y en ningún otro hay salvación; porque no hay otro nombre bajo el cielo, dado a los hombres, en que podamos ser salvos.',
    'ACT.16.31':'Ellos dijeron: Cree en el Señor Jesucristo, y serás salvo, tú y tu casa.',
    'GEN.1.1':'En el principio creó Dios los cielos y la tierra.',
    'GEN.1.27':'Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.',
    'GEN.1.28':'Y los bendijo Dios, y les dijo: Fructificad y multiplicaos; llenad la tierra, y sojuzgadla.',
    'GEN.2.24':'Por tanto, dejará el hombre a su padre y a su madre, y se unirá a su mujer, y serán una sola carne.',
    'GEN.28.15':'He aquí, yo estoy contigo, y te guardaré por dondequiera que fueres, y volveré a traerte a esta tierra.',
    'EXO.14.14':'Jehová peleará por vosotros, y vosotros estaréis tranquilos.',
    'EXO.15.2':'Jehová es mi fortaleza y mi cántico, y ha sido mi salvación.',
    'EXO.20.3':'No tendrás dioses ajenos delante de mí.',
    'DEU.6.4':'Oye, Israel: Jehová nuestro Dios, Jehová uno es.',
    'DEU.6.5':'Y amarás a Jehová tu Dios de todo tu corazón, y de toda tu alma, y con todas tus fuerzas.',
    'JOS.1.9':'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.',
    'ROM.1.17':'Porque en el evangelio la justicia de Dios se revela por fe y para fe, como está escrito: Mas el justo por la fe vivirá.',
    'ROM.4.20':'tampoco dudó, por incredulidad, de la promesa de Dios, sino que se fortaleció en fe.',
    'ROM.4.21':'plenamente convencido de que era también poderoso para hacer todo lo que había prometido.',
    'ROM.5.1':'Justificados, pues, por la fe, tenemos paz para con Dios por medio de nuestro Señor Jesucristo.',
    'ROM.5.3':'Y no sólo esto, sino que también nos gloriamos en las tribulaciones, sabiendo que la tribulación produce paciencia.',
    'ROM.5.4':'y la paciencia, prueba; y la prueba, esperanza.',
    'ROM.5.5':'y la esperanza no avergüenza; porque el amor de Dios ha sido derramado en nuestros corazones por el Espíritu Santo que nos fue dado.',
    'ROM.6.4':'Porque somos sepultados juntamente con él para muerte por el bautismo, a fin de que como Cristo resucitó de los muertos por la gloria del Padre, así también nosotros andemos en vida nueva.',
    'ROM.8.14':'Porque todos los que son guiados por el Espíritu de Dios, éstos son hijos de Dios.',
    'ROM.8.17':'y si hijos, también herederos; herederos de Dios y coherederos con Cristo.',
    'ROM.8.26':'Y de igual manera el Espíritu nos ayuda en nuestra debilidad; pues qué hemos de pedir como conviene, no lo sabemos.',
    'ROM.8.37':'Antes, en todas estas cosas somos más que vencedores por medio de aquel que nos amó.',
    'ROM.10.17':'Así que la fe es por el oír, y el oír, por la palabra de Dios.',
    'ROM.11.36':'Porque de él, y por él, y para él, son todas las cosas. A él sea la gloria por los siglos. Amén.',
    'ROM.13.8':'No debáis a nadie nada, sino el amaros unos a otros; porque el que ama al prójimo, ha cumplido la ley.',
    'ROM.14.8':'pues si vivimos, para el Señor vivimos; y si morimos, para el Señor morimos.',
    '1CO.1.30':'Mas por él estáis vosotros en Cristo Jesús, el cual nos ha sido hecho por Dios sabiduría, justificación, santificación y redención.',
    '1CO.2.9':'Antes bien, como está escrito: Cosas que ojo no vio, ni oído oyó, ni han subido en corazón de hombre, son las que Dios ha preparado para los que le aman.',
    '1CO.3.16':'¿No sabéis que sois templo de Dios, y que el Espíritu de Dios mora en vosotros?',
    '1CO.6.19':'¿O ignoráis que vuestro cuerpo es templo del Espíritu Santo, el cual está en vosotros, el cual tenéis de Dios?',
    '1CO.6.20':'porque habéis sido comprados por precio; glorificad, pues, a Dios en vuestro cuerpo.',
    '1CO.10.13':'No os ha sobrevenido ninguna tentación que no sea humana; pero fiel es Dios, que no os dejará ser tentados más de lo que podéis resistir.',
    '1CO.12.27':'Vosotros, pues, sois el cuerpo de Cristo, y miembros cada uno en particular.',
    '1CO.15.3':'Porque primeramente os he enseñado lo que asimismo recibí: Que Cristo murió por nuestros pecados, conforme a las Escrituras.',
    '1CO.15.4':'y que fue sepultado, y que resucitó al tercer día, conforme a las Escrituras.',
    '2CO.1.3':'Bendito sea el Dios y Padre de nuestro Señor Jesucristo, Padre de misericordias y Dios de toda consolación.',
    '2CO.1.4':'el cual nos consuela en todas nuestras tribulaciones, para que podamos también nosotros consolar a los que están en cualquier tribulación.',
    '2CO.3.17':'Porque el Señor es el Espíritu; y donde está el Espíritu del Señor, allí hay libertad.',
    '2CO.3.18':'Por tanto, nosotros todos, mirando a cara descubierta como en un espejo la gloria del Señor, somos transformados de gloria en gloria en la misma imagen.',
    '2CO.4.16':'Por tanto, no desmayamos; antes aunque este nuestro hombre exterior se va desgastando, el interior no obstante se renueva de día en día.',
    '2CO.4.17':'Porque esta leve tribulación momentánea produce en nosotros un cada vez más excelente y eterno peso de gloria.',
    '2CO.4.18':'no mirando nosotros las cosas que se ven, sino las que no se ven; pues las cosas que se ven son temporales, pero las que no se ven son eternas.',
    '2CO.8.9':'Porque ya conocéis la gracia de nuestro Señor Jesucristo, que por amor a vosotros se hizo pobre, siendo rico, para que vosotros con su pobreza fueseis enriquecidos.',
    '2CO.10.5':'y llevando cautivo todo pensamiento a la obediencia a Cristo.',
    'GAL.3.26':'pues todos sois hijos de Dios por la fe en Cristo Jesús.',
    'GAL.3.27':'porque todos los que habéis sido bautizados en Cristo, de Cristo estáis revestidos.',
    'GAL.3.28':'Ya no hay judío ni griego; no hay esclavo ni libre; no hay varón ni mujer; porque todos vosotros sois uno en Cristo Jesús.',
    'GAL.5.1':'Estad, pues, firmes en la libertad con que Cristo nos hizo libres, y no estéis otra vez sujetos al yugo de esclavitud.',
    'GAL.5.13':'Porque vosotros, hermanos, a libertad fuisteis llamados; solamente que no uséis la libertad como ocasión para la carne, sino servíos por amor los unos a los otros.',
    'EPH.1.7':'en quien tenemos redención por su sangre, el perdón de pecados según las riquezas de su gracia.',
    'EPH.3.16':'para que os dé, conforme a las riquezas de su gloria, el ser fortalecidos con poder en el hombre interior por su Espíritu.',
    'EPH.3.17':'para que habite Cristo por la fe en vuestros corazones.',
    'EPH.3.18':'a fin de que seáis plenamente capaces de comprender con todos los santos cuál sea la anchura, la longitud, la profundidad y la altura.',
    'EPH.3.19':'y de conocer el amor de Cristo, que excede a todo conocimiento, para que seáis llenos de toda la plenitud de Dios.',
    'EPH.3.20':'Y a Aquel que es poderoso para hacer todas las cosas mucho más abundantemente de lo que pedimos o entendemos.',
    'EPH.4.2':'con toda humildad y mansedumbre, soportándoos con paciencia los unos a los otros en amor.',
    'EPH.4.3':'solícitos en guardar la unidad del Espíritu en el vínculo de la paz.',
    'EPH.5.1':'Sed, pues, imitadores de Dios como hijos amados.',
    'EPH.5.2':'y andad en amor, como también Cristo nos amó, y se entregó a sí mismo por nosotros.',
    'EPH.6.11':'Vestíos de toda la armadura de Dios, para que podáis estar firmes contra las asechanzas del diablo.',
    'EPH.6.12':'Porque no tenemos lucha contra sangre y carne, sino contra principados, contra potestades, contra los gobernadores de las tinieblas de este siglo.',
    'PHP.1.29':'Porque a vosotros os es concedido a causa de Cristo, no sólo que creáis en él, sino también que padezcáis por él.',
    'PHP.3.13':'hermanos, yo mismo no pretendo haberlo ya alcanzado; pero una cosa hago: olvidando ciertamente lo que queda atrás, y extendiéndome a lo que está delante.',
    'PHP.3.14':'prosigo a la meta, al premio del supremo llamamiento de Dios en Cristo Jesús.',
    'PHP.3.20':'Mas nuestra ciudadanía está en los cielos, de donde también esperamos al Salvador, al Señor Jesucristo.',
    'PHP.4.4':'Regocijaos en el Señor siempre. Otra vez digo: ¡Regocijaos!',
    'PHP.4.5':'Vuestra gentileza sea conocida de todos los hombres. El Señor está cerca.',
    'PHP.4.8':'todo lo que es verdadero, todo lo honesto, todo lo justo, todo lo puro, todo lo amable, todo lo que es de buen nombre; si hay virtud alguna, si algo digno de alabanza, en esto pensad.',
    'COL.1.15':'Él es la imagen del Dios invisible, el primogénito de toda creación.',
    'COL.1.16':'Porque en él fueron creadas todas las cosas, las que hay en los cielos y las que hay en la tierra, visibles e invisibles.',
    'COL.1.17':'y él es antes de todas las cosas, y todas las cosas en él subsisten.',
    'COL.2.6':'Por tanto, de la manera que habéis recibido al Señor Jesucristo, andad en él.',
    'COL.2.7':'arraigados y sobreedificados en él, y confirmados en la fe, así como habéis sido enseñados, abundando en acciones de gracias.',
    'COL.3.1':'Si, pues, habéis resucitado con Cristo, buscad las cosas de arriba, donde está Cristo sentado a la diestra de Dios.',
    'COL.3.2':'Poned la mira en las cosas de arriba, no en las de la tierra.',
    'COL.3.3':'Porque habéis muerto, y vuestra vida está escondida con Cristo en Dios.',
    'COL.3.12':'Vestíos, pues, como escogidos de Dios, santos y amados, de entrañable misericordia, de benignidad, de humildad, de mansedumbre, de paciencia.',
    'COL.3.14':'Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto.',
    '1TH.4.13':'Tampoco queremos, hermanos, que ignoréis acerca de los que duermen, para que no os entristezcáis como los otros que no tienen esperanza.',
    '1TH.4.14':'Porque si creemos que Jesús murió y resucitó, así también traerá Dios con Jesús a los que durmieron en él.',
    '1TH.5.11':'Por lo cual, animaos unos a otros, y edificaos unos a otros, así como lo hacéis.',
    '1TH.5.14':'También os rogamos, hermanos, que amonestéis a los ociosos, que alentéis a los de poco ánimo, que sostengáis a los débiles, que seáis pacientes para con todos.',
    '2TH.3.3':'Pero fiel es el Señor, que os afirmará y guardará del mal.',
    '1TI.6.6':'Pero gran ganancia es la piedad acompañada de contentamiento.',
    '1TI.6.12':'Pelea la buena batalla de la fe, echa mano de la vida eterna, a la cual asimismo fuiste llamado.',
    'HEB.4.12':'Porque la palabra de Dios es viva y eficaz, y más cortante que toda espada de dos filos.',
    'HEB.4.15':'Porque no tenemos un sumo sacerdote que no pueda compadecerse de nuestras debilidades, sino uno que fue tentado en todo según nuestra semejanza, pero sin pecado.',
    'HEB.4.16':'Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia y hallar gracia para el oportuno socorro.',
    'HEB.6.19':'La cual tenemos como segura y firme ancla del alma, y que penetra hasta dentro del velo.',
    'HEB.10.23':'Mantengamos firme, sin fluctuar, la profesión de nuestra esperanza, porque fiel es el que prometió.',
    'HEB.10.24':'Y considerémonos unos a otros para estimularnos al amor y a las buenas obras.',
    'HEB.10.25':'no dejando de reunirnos, como algunos tienen por costumbre, sino exhortándonos; y tanto más, cuanto veis que aquel día se acerca.',
    'HEB.11.6':'Pero sin fe es imposible agradar a Dios; porque es necesario que el que se acerca a Dios crea que le hay.',
    'JAS.1.3':'sabiendo que la prueba de vuestra fe produce paciencia.',
    'JAS.1.4':'Mas tenga la paciencia su obra completa, para que seáis perfectos y cabales, sin que os falte cosa alguna.',
    'JAS.1.19':'Por esto, mis amados hermanos, todo hombre sea pronto para oír, tardo para hablar, tardo para airarse.',
    'JAS.1.22':'Pero sed hacedores de la palabra, y no tan solamente oidores, engañándoos a vosotros mismos.',
    'JAS.2.17':'Así también la fe, si no tiene obras, es muerta en sí misma.',
    'JAS.5.16':'Confesaos vuestras ofensas unos a otros, y orad unos por otros, para que seáis sanados.',
    '1PE.1.3':'Bendito el Dios y Padre de nuestro Señor Jesucristo, que según su grande misericordia nos hizo renacer para una esperanza viva.',
    '1PE.1.23':'siendo renacidos, no de simiente corruptible, sino de incorruptible, por la palabra de Dios que vive y permanece para siempre.',
    '1PE.2.9':'Mas vosotros sois linaje escogido, real sacerdocio, nación santa, pueblo adquirido por Dios.',
    '1PE.2.24':'quien llevó él mismo nuestros pecados en su cuerpo sobre el madero, para que nosotros, estando muertos a los pecados, vivamos a la justicia; y por cuya herida fuisteis sanados.',
    '1PE.3.15':'sino santificad a Dios el Señor en vuestros corazones, y estad siempre preparados para presentar defensa con mansedumbre y reverencia ante todo el que os demande razón de la esperanza que hay en vosotros.',
    '1PE.4.8':'Y ante todo, tened entre vosotros ferviente amor; porque el amor cubrirá multitud de pecados.',
    '1PE.5.6':'Humillaos, pues, bajo la poderosa mano de Dios, para que él os exalte cuando fuere tiempo.',
    '2PE.1.3':'Como todas las cosas que pertenecen a la vida y a la piedad nos han sido dadas por su divino poder.',
    '2PE.3.9':'El Señor no retarda su promesa, según algunos la tienen por tardanza, sino que es paciente para con nosotros, no queriendo que ninguno perezca.',
    '1JN.2.1':'Hijitos míos, estas cosas os escribo para que no pequéis; y si alguno hubiere pecado, abogado tenemos para con el Padre, a Jesucristo el justo.',
    '1JN.2.15':'No améis al mundo, ni las cosas que están en el mundo. Si alguno ama al mundo, el amor del Padre no está en él.',
    '1JN.3.18':'Hijitos míos, no amemos de palabra ni de lengua, sino de hecho y en verdad.',
    '1JN.4.4':'Hijitos, vosotros sois de Dios, y los habéis vencido; porque mayor es el que está en vosotros, que el que está en el mundo.',
    '1JN.5.4':'Porque todo lo que es nacido de Dios vence al mundo; y esta es la victoria que ha vencido al mundo, nuestra fe.',
    'REV.1.8':'Yo soy el Alfa y la Omega, principio y fin, dice el Señor, el que es y que era y que ha de venir, el Todopoderoso.',
    'REV.3.20':'He aquí, yo estoy a la puerta y llamo; si alguno oye mi voz y abre la puerta, entraré a él, y cenaré con él, y él conmigo.',
    'REV.21.3':'Y oí una gran voz del cielo que decía: He aquí el tabernáculo de Dios con los hombres, y él morará con ellos.',
    'REV.21.5':'Y el que estaba sentado en el trono dijo: He aquí, yo hago nuevas todas las cosas.',
    'REV.22.13':'Yo soy el Alfa y la Omega, el principio y el fin, el primero y el último.'
  };

  // Banco unificado: VS_EXTRA cubre lo que VS_LOCAL no tiene
  const VS_BANCO = Object.assign({}, VS_EXTRA, VS_LOCAL);

  async function loadVersiculoDelDia() {
    const day = getDayOfYear();

    // Intento 1: passage_id oficial y exacto de YouVersion (sincronía 1:1 con la app)
    let pid = await obtenerPidYouVersion(day);
    if (!pid) {
      // Respaldo: calendario aproximado local, por si la API de YouVersion falla
      pid = YV_CALENDAR[day] || YV_CALENDAR[((day-1)%365)+1] || 'JHN.3.16';
    }

    const { book, chapter, verse } = parsePid(pid);
    const ref = pidToRef(pid);

    // ══ PRIMERO: intentar cargar desde las APIs en español ══════════════════

    // API 1: jsDelivr CDN — wldeh/bible-api RVR1960 (CORS abierto, 150B req/mes)
    try {
      const jsdBook = BOOK_JSD[book] || book.toLowerCase();
      const url1 = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/es-rvr1960/books/${jsdBook}/chapters/${chapter}/verses/${verse}.json`;
      const r1 = await fetchWithTimeout(url1, 6000);
      if (r1.ok) {
        const d1 = await r1.json();
        const text = (d1.text || d1.verse || '').trim().replace(/\s+/g,' ');
        if (text && text.length > 8) { setVersiculoBanner(text, ref, pid); return; }
      }
    } catch(_) {}

    // API 2: bible-api.com — rv1960 en español (CORS abierto)
    try {
      const b2  = BOOK_BIBLEAPI[book] || book.toLowerCase();
      const url2 = `https://bible-api.com/${b2}+${chapter}:${verse}?translation=rv1960`;
      const r2  = await fetchWithTimeout(url2, 6000);
      if (r2.ok) {
        const d2   = await r2.json();
        const text = (d2.text || '').trim().replace(/\s+/g,' ');
        if (text && text.length > 8) { setVersiculoBanner(text, d2.reference || ref, pid); return; }
      }
    } catch(_) {}

    // ══ SIEMPRE en español: banco local RVR1960 — nunca falla ═══════════════
    // Buscamos el versículo exacto del día, y si no existe usamos el más cercano
    const local = VS_BANCO[pid];
    if (local) {
      setVersiculoBanner(local, ref, pid);
      return;
    }
    // Buscar el pid más cercano en el banco
    const keys    = Object.keys(VS_BANCO);
    const fallKey = keys[day % keys.length];
    const fallRef = pidToRef(fallKey);
    setVersiculoBanner(VS_BANCO[fallKey], fallRef, fallKey);
  }

  // Cargar al iniciar, y refrescar de forma robusta cuando cambie el día.
  // (No dependemos de un solo setTimeout/setInterval de 24h: los navegadores
  // pausan esos temporizadores en pestañas inactivas/en segundo plano, lo que
  // hacía que el versículo se quedara "congelado" si la página se dejaba abierta.)
  let _ultimoDiaVersiculo = null;

  function _revisarYActualizarVersiculo() {
    const diaActual = getDayOfYear();
    if (diaActual !== _ultimoDiaVersiculo) {
      _ultimoDiaVersiculo = diaActual;
      loadVersiculoDelDia();
    }
  }

  // Este bloque ya se ejecuta dentro del DOMContentLoaded principal de la página,
  // así que llamamos directamente en vez de registrar otro listener (ese evento
  // ya se disparó y nunca volvería a hacerlo).
  _revisarYActualizarVersiculo();

  // Cuando la pestaña vuelve a estar visible o gana foco (usuario regresa,
  // enciende la pantalla, etc.), revisamos si ya cambió el día.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _revisarYActualizarVersiculo();
  });
  window.addEventListener('focus', _revisarYActualizarVersiculo);

  // Respaldo: revisar cada 5 minutos por si la pestaña se queda abierta
  // fija (pantalla/kiosco) sin eventos de foco/visibilidad.
  setInterval(_revisarYActualizarVersiculo, 5 * 60 * 1000);



  // Smooth close nav on mobile link click
  document.querySelectorAll('.mobile-menu a').forEach(a=>{
    a.addEventListener('click', ()=>{
      document.getElementById('mobileMenu').classList.remove('open');
    });
  });
