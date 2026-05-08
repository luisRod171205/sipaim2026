// ──────────────────────────────────────────────
//  SUPABASE SETUP
// ──────────────────────────────────────────────

const SUPABASE_URL = 'https://wcoetgrnphuwebpkzyel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb2V0Z3JucGh1d2VicGt6eWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzE2NDgsImV4cCI6MjA5MjU0NzY0OH0.6GtN_-R_RTbihHZtTrqL74qgC6UrchyQ_Jc76yyTSMc';


let sb = null;

try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
  console.error('Error inicializando Supabase:', e);
}

// ──────────────────────────────────────────────
//  TIPO DE CAMBIO (localStorage)
// ──────────────────────────────────────────────
const TIPO_CAMBIO_KEY = 'sipaim_tipo_cambio';
const TIPO_CAMBIO_DEFAULT = 3.43;

function getTipoCambio() {
  const stored = localStorage.getItem(TIPO_CAMBIO_KEY);
  if (stored) {
    return parseFloat(stored);
  }
  return TIPO_CAMBIO_DEFAULT;
}

function convertirMoneda(precio, monedaOrigen) {
  const tipoCambio = getTipoCambio();
  const precioNum = parseFloat(precio);
  
  if (isNaN(precioNum)) return null;
  
  if (monedaOrigen === 'S/.') {
    const dolares = (precioNum / tipoCambio).toFixed(2);
    return `S/. ${precioNum} ($${dolares})`;
  } else {
    const soles = (precioNum * tipoCambio).toFixed(2);
    return `$${precioNum} (S/. ${soles})`;
  }
}
// ──────────────────────────────────────────────
//  COMENTARIOS (localStorage)
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
//  COMENTARIOS 
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
//  COMENTARIOS POR OPCIÓN 
// ──────────────────────────────────────────────
//  COMENTARIOS (Supabase)

// ──────────────────────────────────────────────

const COMENTARIOS_TABLE = 'comentarios_opcion';

// Generar ID único para este navegador/usuario
function getSessionId() {
  let sessionId = localStorage.getItem('sipaim_session_id');
  if (!sessionId) {
    sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sipaim_session_id', sessionId);
  }
  return sessionId;
}

const SESSION_ID = getSessionId();

// Obtener comentarios de una opción específica
async function getComentariosByOpcion(opcionId) {
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from(COMENTARIOS_TABLE)
      .select('*')
      .eq('opcion_id', opcionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error cargando comentarios:', e);
    return [];
  }
}

// Agregar nuevo comentario a una opción
async function agregarComentarioOpcion(opcionId, nombre, comentario) {
  if (!sb) {
    showToast('Error: No hay conexión a la base de datos');
    return null;
  }
  if (!comentario.trim()) {
    showToast('Write a comment first');
    return null;
  }
  
  try {
    const { data, error } = await sb
      .from(COMENTARIOS_TABLE)
      .insert({
        opcion_id: opcionId,
        nombre_usuario: nombre.trim() || 'Anonymous',
        comentario: comentario.trim(),
        session_id: SESSION_ID
      })
      .select()
      .single();
    
    if (error) throw error;
    showToast('✓ Comment added');
    return data;
  } catch (e) {
    console.error('Error agregando comentario:', e);
    showToast('Error saving comment');
    return null;
  }
}

// Editar comentario
async function editarComentarioOpcion(comentarioId, nuevoTexto) {
  if (!sb) return false;
  if (!nuevoTexto.trim()) return false;
  
  try {
    // Verificar que el comentario pertenece al usuario
    const { data: existing, error: checkError } = await sb
      .from(COMENTARIOS_TABLE)
      .select('session_id')
      .eq('id', comentarioId)
      .single();
    
    if (checkError || existing.session_id !== SESSION_ID) {
      showToast('You cannot edit this comment');
      return false;
    }
    
    const { error } = await sb
      .from(COMENTARIOS_TABLE)
      .update({
        comentario: nuevoTexto.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', comentarioId);
    
    if (error) throw error;
    showToast('✓ Comment updated');
    return true;
  } catch (e) {
    console.error('Error editing comment:', e);
    showToast('Error updating comment');
    return false;
  }
}

// Eliminar comentario
async function eliminarComentarioOpcion(comentarioId) {
  if (!sb) return false;
  
  if (!confirm('Delete this comment?')) return false;
  
  try {
    // Verificar que el comentario pertenece al usuario
    const { data: existing, error: checkError } = await sb
      .from(COMENTARIOS_TABLE)
      .select('session_id')
      .eq('id', comentarioId)
      .single();
    
    if (checkError || existing.session_id !== SESSION_ID) {
      showToast('You cannot delete this comment');
      return false;
    }
    
    const { error } = await sb
      .from(COMENTARIOS_TABLE)
      .delete()
      .eq('id', comentarioId);
    
    if (error) throw error;
    showToast('✓ Comment deleted');
    return true;
  } catch (e) {
    console.error('Error deleting comment:', e);
    showToast('Error deleting comment');
    return false;
  }
}

// Mostrar comentarios en pantalla (para una opción)
async function renderComentariosOpcion(opcionId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">Loading comments...</div>';
  
  const comentarios = await getComentariosByOpcion(opcionId);
  
  if (comentarios.length === 0) {
    container.innerHTML = '<div class="comentarios-vacio">💬 No comments yet. Be the first to comment!</div>';
    return;
  }
  
  container.innerHTML = comentarios.map(c => {
    const isOwner = c.session_id === SESSION_ID;
    const fecha = new Date(c.created_at).toLocaleString('es-ES', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
    
    return `
      <div class="comentario-item" data-id="${c.id}">
        <div class="comentario-header">
          <strong>${escapeHtml(c.nombre_usuario)}</strong>
          <span class="comentario-fecha">${fecha}</span>
        </div>
        <p class="comentario-texto">${escapeHtml(c.comentario)}</p>
        ${isOwner ? `
          <div class="comentario-actions">
            <button class="btn-editar" onclick="editarComentarioUI('${opcionId}', '${c.id}')">✏️ Edit</button>
            <button class="btn-eliminar" onclick="eliminarComentarioOpcion('${c.id}'); renderComentariosOpcion('${opcionId}', 'comentarios-opcion-${opcionId}')">🗑️ Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Abrir diálogo para editar
async function editarComentarioUI(opcionId, comentarioId) {
  const comentarios = await getComentariosByOpcion(opcionId);
  const comentario = comentarios.find(c => c.id === comentarioId);
  
  if (!comentario) return;
  
  const nuevoTexto = prompt('Edit comment:', comentario.comentario);
  if (nuevoTexto && nuevoTexto.trim()) {
    await editarComentarioOpcion(comentarioId, nuevoTexto);
    await renderComentariosOpcion(opcionId, `comentarios-opcion-${opcionId}`);
  }
}

// Generar el HTML del bloque de comentarios
function getComentariosHTML(opcionId) {
  return `
    <div class="comentarios-actividad-section">
      <div class="comentarios-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Comments for this option</span>
      </div>
      
      <div class="comentarios-lista" id="comentarios-opcion-${opcionId}">
        <div class="loading">Loading comments...</div>
      </div>
      
      <div class="comentarios-form-mini">
        <div class="form-row">
          <input type="text" id="comentario-nombre-opcion-${opcionId}" placeholder="Your name (optional)" maxlength="50" class="comentario-nombre-input">
          <textarea id="comentario-texto-opcion-${opcionId}" placeholder="Write your comment about this option..." rows="2" class="comentario-texto-input"></textarea>
          <button class="btn-enviar-comentario" onclick="enviarComentarioOpcion('${opcionId}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Submit
          </button>
        </div>
      </div>
    </div>
  `;
}

// Enviar comentario desde el formulario
async function enviarComentarioOpcion(opcionId) {
  const nombreInput = document.getElementById(`comentario-nombre-opcion-${opcionId}`);
  const textoInput = document.getElementById(`comentario-texto-opcion-${opcionId}`);
  
  const nombre = nombreInput?.value || '';
  const texto = textoInput?.value || '';
  
  if (!texto.trim()) {
    showToast('Write a comment');
    return;
  }
  
  await agregarComentarioOpcion(opcionId, nombre, texto);
  
  if (nombreInput) nombreInput.value = '';
  if (textoInput) textoInput.value = '';
  
  await renderComentariosOpcion(opcionId, `comentarios-opcion-${opcionId}`);
}


// ──────────────────────────────────────────────
//  DATA MODEL
// ──────────────────────────────────────────────
const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes'];

let state = {
  activeDay: 'Lunes',
  actividades: [],
  // Guarda el id de opción activa (hover/clic) por cada actividad
  activeOptionId: {},
  openActivities: {}, // Rastrea qué actividades están expandidas (acordeón abierto)
  semanaActual: getCurrentWeek(),
  votosUsuario: {}, // Rastrea los votos del usuario por opción_id
  votos: {}, // Contador de votos por opción_id (cargado desde localStorage)
  filterEstado: 'all' // Filtro actual: 'all', 'pendiente', 'cerrado'
};

// Funciones de votos en localStorage
function getVotosKey() {
  return 'sipaim_votos';
}

function loadVotosFromLocalStorage() {
  try {
    const stored = localStorage.getItem(getVotosKey());
    if (stored) {
      state.votos = JSON.parse(stored);
    }
    // Cargar votos del usuario actual
    const usuarioVotos = localStorage.getItem('sipaim_votos_usuario');
    if (usuarioVotos) {
      state.votosUsuario = JSON.parse(usuarioVotos);
    }
  } catch (e) {
    console.error('Error cargando votos:', e);
    state.votos = {};
    state.votosUsuario = {};
  }
}

function saveVotosToLocalStorage() {
  try {
    localStorage.setItem(getVotosKey(), JSON.stringify(state.votos));
    localStorage.setItem('sipaim_votos_usuario', JSON.stringify(state.votosUsuario));
  } catch (e) {
    console.error('Error guardando votos:', e);
  }
}

function getVotosCount(opcionId) {
  return state.votos[opcionId] || 0;
}

function usuarioHaVotado(opcionId) {
  return !!state.votosUsuario[opcionId];
}

function getCurrentWeek() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { inicio: monday, fin: friday };
}

// ──────────────────────────────────────────────
//  SUPABASE SYNC
// ──────────────────────────────────────────────

let isSyncing = false;
let isSaving = false;
let lastLocalChange = 0;
let lastSnapshot = '';

async function loadFromSupabase() {
  if (!sb || isSaving) return;

  isSyncing = true;
  try {
    const { data, error } = await sb
      .from('actividades')
      .select(`
        *,
        opciones (*)
      `);

    if (error) throw error;

    // Cargar todas las actividades, incluyendo inactivas
    state.actividades = data || [];
  } catch (error) {
    console.error('Error cargando Supabase:', error);
  } finally {
    isSyncing = false;
  }
}

async function saveEstadoActividad(actividadId, estado) {
  if (!sb) return;
  const update = { estado, updated_at: new Date().toISOString() };

  const { error } = await sb
    .from('actividades')
    .update(update)
    .eq('id', actividadId);

  if (error) {
    console.warn('Supabase save failed:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────
function getPendingActividades() {
  return state.actividades.filter(act => 
    act.estado === 'pendiente' || act.estado === 'en_espera'
  );
}

function getActividadesPorEstado() {
 const counts = { inactivo: 0, en_espera: 0, pendiente: 0, cerrado: 0 };
  state.actividades.forEach(act => { if (counts[act.estado] !== undefined) counts[act.estado]++; });
  return counts;
}

function getActividadesPorDia(dia) {
  // Filtrar SOLO por día de la semana, ignorando la fecha específica
  const DAYS_MAP = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  
  return state.actividades.filter(act => {
    const fecha = new Date(act.fecha);
    const diaSemana = DAYS_MAP[fecha.getDay()];
    return diaSemana === dia;
  });
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Actualizar el estado activo de los botones del navbar
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes('scrollToSection')) {
      btn.classList.remove('active');
    }
  });
  
  const activeBtn = document.querySelector(`.nav-btn[onclick="scrollToSection('${id}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function formatHoraActividad(fecha) {
  if (!fecha) return '';
  const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
  const match = fechaStr.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return '';
}



function formatRangoHora(fecha, fechaFin) {
  const inicio = formatHoraActividad(fecha);
  const fin = formatHoraActividad(fechaFin);
  if (inicio && fin) return `${inicio} – ${fin}`;
  return inicio;
}
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSnapshot(actividades) {
  return JSON.stringify(
    (actividades || []).map(act => ({
      id: act.id,
      estado: act.estado,
      updated_at: act.updated_at,
      opciones: (act.opciones || []).map(opt => ({
        id: opt.id,
        seleccionada: opt.seleccionada,
        updated_at: opt.updated_at
      }))
    }))
  );
}
// ──────────────────────────────────────────────
//  BUILD OPTION DETAIL HTML
//  Genera el contenido del panel de detalle para
//  una opción dada, con sus campos extra parseados
// ──────────────────────────────────────────────
function buildClosedOptionExtraHtml(opt) {
  if (!opt || !opt.extra) return '';

  try {
    const extraObj = typeof opt.extra === 'string' ? JSON.parse(opt.extra) : opt.extra;

    const entries = Array.isArray(extraObj)
      ? extraObj
      : Object.entries(extraObj).map(([k, v]) => ({ k, v }));

    const normales = entries.filter(({ k }) => k.toLowerCase() !== 'imagen' && k.toLowerCase() !== 'url');
    const especiales = entries.filter(({ k }) => k.toLowerCase() === 'imagen' || k.toLowerCase() === 'url');
    const ordenadas = [...normales, ...especiales];

    return ordenadas.map(({ k: key, v: val }) => {
      if (key.toLowerCase() === 'imagen') {
        return `
          <div class="option-detail-image">
           <img src="${escapeHtml(String(val))}" alt="Imagen de la opción"
     style="width:100%;max-height:220px;height:auto;object-fit:contain;border-radius:12px;background:#f8fafc;padding:6px;margin-top:10px;"
          </div>`;
      }

      if (key.toLowerCase() === 'url') {
        if (!val || String(val).trim() === '') return '';
        return `
          <div class="option-detail-section" style="margin-top:10px;">
            <div class="option-detail-section-label">Link</div>
            <div class="option-detail-section-body">
              <a href="${escapeHtml(String(val))}" target="_blank" rel="noopener noreferrer"
                 style="color:var(--accent);font-weight:600;text-decoration:underline;">
                ${escapeHtml(String(val))}
              </a>
            </div>
          </div>`;
      }

      return `
        <div class="option-detail-section" style="margin-top:10px;">
          <div class="option-detail-section-label">${escapeHtml(key)}</div>
          <div class="option-detail-section-body">${escapeHtml(String(val))}</div>
        </div>`;
    }).join('');
  } catch {
    return `
      <div class="option-detail-section" style="margin-top:10px;">
        <div class="option-detail-section-label">Additional Information</div>
        <div class="option-detail-section-body">${escapeHtml(String(opt.extra))}</div>
      </div>`;
  }
}

function buildOptionDetailHtml(opt, actividadId, isSelected, isPendiente) {
  if (!opt) {
    return `<div class="option-detail-empty">Select an option to view its details</div>`;
  }

  let extraSections = '';
  if (opt.extra) {
    try {
      const extraObj = typeof opt.extra === 'string' ? JSON.parse(opt.extra) : opt.extra;

      const entries = Array.isArray(extraObj)
        ? extraObj
        : Object.entries(extraObj).map(([k, v]) => ({ k, v }));

      // Separar campos resaltados, normales y especiales
      const resaltados = entries.filter(({k}) => k === 'Price' || k === 'Availability');
      const normales = entries.filter(({k}) => k.toLowerCase() !== 'imagen' && k.toLowerCase() !== 'url' && k.toLowerCase() !== 'location' && k !== 'Price' && k !== 'Availability');
      const especiales = entries.filter(({k}) => k.toLowerCase() === 'imagen' || k.toLowerCase() === 'url' || k.toLowerCase() === 'location');

      // Renderizar badges resaltados primero
      let badgesHtml = '';
      if (resaltados.length > 0) {
        badgesHtml = `<div class="relevant-badges-container" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">`;
        badgesHtml += resaltados.map(({k: key, v: val}) => {
          const icon = key === 'Price' ? '💰' : '🗓️';
          const bgColor = key === 'Price' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)';
          const borderColor = key === 'Price' ? '#3b82f6' : '#22c55e';
          const textColor = key === 'Price' ? '#1e40af' : '#15803d';
          
          return `<div class="info-badge" style="background: ${bgColor}; border: 2px solid ${borderColor}; color: ${textColor}; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${icon}</span>
            <span><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(val))}</span>
          </div>`;
        }).join('');
        badgesHtml += '</div>';
      }

      // Renderizar campos normales y especiales
      let normalSections = '';
      const ordenadas = [...normales, ...especiales];
      if (ordenadas.length > 0) {
        normalSections = ordenadas.map(({k: key, v: val}) => {
          if (key.toLowerCase() === 'imagen') {
            return `<div class="option-detail-image">
              <img src="${escapeHtml(String(val))}" alt="Imagen de la opción" 
                   style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:8px;" 
                   onerror="this.style.display='none'"/>
            </div>`;
          }
          
          // 🔗 URL NORMAL (enlace web, noticias, artículos)
          if (key.toLowerCase() === 'url') {
            if (!val || String(val).trim() === '') return '';
            let urlVal = String(val).trim();
            
            return `<div class="option-detail-section">
                <div class="option-detail-section-label">🔗 Link</div>
                <div class="option-detail-section-body">
                    <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer"
                       style="color:var(--accent);font-weight:600;text-decoration:underline;">
                        ${escapeHtml(urlVal.length > 60 ? urlVal.substring(0, 60) + '...' : urlVal)}
                    </a>
                </div>
            </div>`;
          }
          
          // 📍 LOCATION (Google Maps con mapa integrado)
          if (key.toLowerCase() === 'location') {
            if (!val || String(val).trim() === '') return '';
            let urlVal = String(val).trim();
            let mapEmbed = '';
            
            // Detectar si es un enlace de Google Maps
            const isGoogleMaps = urlVal.includes('google.com/maps') || 
                                 urlVal.includes('goo.gl/maps') || 
                                 urlVal.includes('maps.app.goo.gl') ||
                                 urlVal.includes('maps.google');
            
            if (isGoogleMaps) {
              // Extraer coordenadas del enlace
              const match = urlVal.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
              if (match && match[1] && match[2]) {
                //  CLAVE DE GOOGLE MAPS
                const GOOGLE_MAPS_API_KEY = 'AIzaSyApRlx6p1bSvi44xoFV87vGGN2ezRLw0Vs';
                
                mapEmbed = `<div class="option-detail-map" style="margin-top:10px;">
                  <iframe
                    width="100%"
                    height="250"
                    frameborder="0"
                    style="border:0;border-radius:10px;"
                    src="https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${match[1]},${match[2]}"
                    allowfullscreen>
                  </iframe>
                  <small style="display:block; margin-top:5px;">
                    <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">Open in Google Maps</a>
                  </small>
                </div>`;
              } else {
                mapEmbed = `<div class="option-detail-map" style="margin-top:10px;">
                  <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-weight:600;">📍 Open in Google Maps</a>
                </div>`;
              }
            } else {
              // Si no es Google Maps, mostrar como enlace normal
              return `<div class="option-detail-section">
                  <div class="option-detail-section-label">📍 Location</div>
                  <div class="option-detail-section-body">
                      <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer"
                         style="color:var(--accent);font-weight:600;text-decoration:underline;">
                          ${escapeHtml(urlVal.length > 60 ? urlVal.substring(0, 60) + '...' : urlVal)}
                      </a>
                  </div>
              </div>`;
            }
            
            return `<div class="option-detail-section">
                <div class="option-detail-section-label">📍 Location</div>
                <div class="option-detail-section-body">
                    <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer"
                       style="color:var(--accent);font-weight:600;text-decoration:underline;">
                        View on Google Maps
                    </a>
                    ${mapEmbed}
                </div>
            </div>`;
          }
          
          return `
          <div class="option-detail-section">
            <div class="option-detail-section-label">${escapeHtml(key)}</div>
            <div class="option-detail-section-body">${escapeHtml(String(val))}</div>
          </div>`;
        }).join('');
      }

      extraSections = badgesHtml + normalSections;
    } catch {
      extraSections = `<div class="option-detail-section">
        <div class="option-detail-section-label">Additional Information</div>
        <div class="option-detail-section-body">${escapeHtml(String(opt.extra))}</div>
      </div>`;
    }
  }

  const descHtml = opt.descripcion
    ? `<div class="option-detail-section">
        <div class="option-detail-section-label">Description</div>
        <div class="option-detail-section-body">${escapeHtml(opt.descripcion).replace(/\n/g, '<br>')}</div>
      </div>`
    : '';

  let actionsHtml = '';
  if (isPendiente) {
    if (isSelected) {
      actionsHtml = `
        <div class="option-detail-actions">
          <button type="button" class="btn-deseleccionar" onclick="seleccionarOpcion('${actividadId}', '${opt.id}', event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Unselect this option
          </button>
        </div>`;
    } else {
      actionsHtml = `
        <div class="option-detail-actions">
          <button type="button" class="btn-seleccionar" onclick="seleccionarOpcion('${actividadId}','${opt.id}',event)">
            Select this option
          </button>
        </div>`;
    }
  } else {
    actionsHtml = `
      <div class="option-detail-actions">
        <button type="button" class="btn-seleccionar" onclick="seleccionarOpcion('${actividadId}','${opt.id}',event)">
          Select this option
        </button>
      </div>`;
  }

  const badgeHtml = isSelected 
    ? `<div class="option-detail-badge-selected">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 
         Selected
       </div>`
    : '';

  // Generar HTML de comentarios para esta opción
  const comentariosHTML = `
    <div class="comentarios-actividad-section">
      <div class="comentarios-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Comments for this option</span>
      </div>
      
      <div class="comentarios-lista" id="comentarios-opcion-${opt.id}">
        <div class="loading">Loading comments...</div>
      </div>
      
      <div class="comentarios-form-mini">
        <div class="form-row">
          <input type="text" id="comentario-nombre-opcion-${opt.id}" placeholder="Your name (optional)" maxlength="50" class="comentario-nombre-input">
          <textarea id="comentario-texto-opcion-${opt.id}" placeholder="Write your comment about this option..." rows="2" class="comentario-texto-input"></textarea>
          <button class="btn-enviar-comentario" onclick="enviarComentarioOpcion('${opt.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Submit
          </button>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="option-detail-header">
      <div class="option-detail-title-row">
        <div class="option-detail-title">${escapeHtml(opt.titulo || 'Option')}</div>
        ${badgeHtml}
      </div>
    </div>
    <div class="option-detail-content">
      ${descHtml}
      ${extraSections}
    </div>
    ${actionsHtml}
    ${comentariosHTML}
  `;
}


// ──────────────────────────────────────────────
//  BUILD OPTION LIST ITEM HTML
// ──────────────────────────────────────────────
function buildOptionListItemHtml(opt, actividadId, isActive, isSelected) {
  const activeClass = isActive ? ' active' : '';
  const selectedClass = isSelected ? ' selected-item' : '';
  const shortDesc = opt.descripcion
    ? opt.descripcion.substring(0, 45) + (opt.descripcion.length > 45 ? '…' : '')
    : '';

  const arrowIcon = isSelected 
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` 
    : `▶`;

  return `
    <div class="option-list-item${activeClass}${selectedClass}"
         onclick="setActiveOption('${actividadId}','${opt.id}',event)">
      <div style="flex:1;min-width:0;">
        <div class="option-list-name">${escapeHtml(opt.titulo || 'Opción')}</div>
        ${shortDesc ? `<div class="option-list-sub">${escapeHtml(shortDesc)}</div>` : ''}
      </div>
      <span class="option-list-arrow">${arrowIcon}</span>
    </div>`;
}

// ──────────────────────────────────────────────
//  BUILD TWO-COLUMN OPTIONS BODY
// ──────────────────────────────────────────────
function buildTwoColOptionsBody(act, allowChange = true) {
  if (!act.opciones || act.opciones.length === 0) {
    return `<div class="no-options"><p>Sin opciones configuradas. Ve al panel de administración para agregar opciones.</p></div>`;
  }

  const activeOptId = state.activeOptionId[act.id] || (act.opciones[0]?.id);
  const activeOpt = act.opciones.find(o => o.id === activeOptId) || act.opciones[0];
  const selectedOpt = act.opciones.find(o => o.seleccionada);
 const isPendiente = act.estado === 'pendiente' || act.estado === 'en_espera';

  // Lista de opciones (col izquierda)
  const listItems = act.opciones.map(opt => {
    const isActive = opt.id === activeOpt?.id;
    const isSelected = opt.seleccionada;
    return buildOptionListItemHtml(opt, act.id, isActive, isSelected);
  }).join('');

  const listCol = `
    <div class="options-list-col" id="opts-list-${act.id}">
      ${listItems}
    </div>`;

  // Panel de detalle (col derecha)
  const isActiveSelected = activeOpt?.seleccionada || false;
  const detailHtml = buildOptionDetailHtml(activeOpt, act.id, isActiveSelected, isPendiente);

  const detailColClass = isActiveSelected ? 'option-detail-col is-selected' : 'option-detail-col';

  const detailCol = `
    <div class="${detailColClass}" id="opts-detail-${act.id}">
      ${detailHtml}
    </div>`;

  // Footer con botón cerrar decisión (solo si está pendiente y tiene opción seleccionada)
  const footerHtml = (isPendiente && selectedOpt && allowChange)
    ? `<div class="decision-footer">
        <button type="button" class="btn-close-decision" onclick="cerrarActividad('${act.id}',event)">Close decision</button>
       </div>`
    : '';

  return `
    <div class="options-two-col">
      ${listCol}
      ${detailCol}
    </div>
    ${footerHtml}`;
}

// ──────────────────────────────────────────────
//  RENDER
// ──────────────────────────────────────────────
function render() {
  renderPending();
  renderDonut();
  renderTabs();
  renderSchedule();
  renderGlobalActions();
}

function rerenderPreservingPosition(openActividadId = null) {
  const y = window.scrollY;
  if (openActividadId) {
    state.openActivities[openActividadId] = true;
  }
  render();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

function renderPending() {
  let filtered = [];
  
  if (state.filterEstado === 'all') {
    // MOSTRAR TODAS las actividades (incluyendo inactivas)
    filtered = state.actividades;
  } else if (state.filterEstado === 'pendiente') {
    filtered = state.actividades.filter(act => act.estado === 'pendiente' || act.estado === 'en_espera');
  } else if (state.filterEstado === 'cerrado') {
    filtered = state.actividades.filter(act => act.estado === 'cerrado');
  } else if (state.filterEstado === 'inactivo') {
    filtered = state.actividades.filter(act => act.estado === 'inactivo');
  }
  
  const list = document.getElementById('pending-list');
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✓</div>No activities to show</div>`;
    return;
  }
  
  list.innerHTML = filtered.map(act => {
    const diaIndex = new Date(act.fecha).getDay() - 1;
    const dia = DAYS[diaIndex] || '';
    const DAY_LABELS = {
      'Lunes': 'Monday',
      'Martes': 'Tuesday',
      'Miércoles': 'Wednesday',
      'Jueves': 'Thursday',
      'Viernes': 'Friday'
    };
    const diaLabel = DAY_LABELS[dia] || dia;
    const hora = formatRangoHora(act.fecha, act.fecha_fin);
    return `
      <div class="pending-item" onclick="scrollToDiaAndOpen('${dia}', '${act.id}')">
        <div class="pending-left">
          <span class="item-time">${hora}</span>
          <span style="color:var(--text-muted);margin-right:8px;font-size:14px;">-</span>
          <span class="item-title">${escapeHtml(act.titulo)}</span>
        </div>
        <span class="item-day">| ${diaLabel}</span>
      </div>`;
  }).join('');
  
  // Calcular estadísticas para la barra de progreso
  const totalActividades = state.actividades.filter(act => act.estado !== 'inactivo').length;
  const cerradas = state.actividades.filter(act => act.estado === 'cerrado').length;
  const pctCerradas = totalActividades > 0 ? Math.round((cerradas / totalActividades) * 100) : 0;
  
  document.getElementById('progress-text').textContent =
    totalActividades === 0 ? 'No activities this week' : `${cerradas} of ${totalActividades} decisions made`;
  document.getElementById('progress-pct').textContent = `${pctCerradas}%`;
  document.getElementById('progress-fill').style.width = `${pctCerradas}%`;
}


function renderDonut() {
  // Obtener los datos reales
  const todas = state.actividades;
  const pendientes = todas.filter(act => act.estado === 'pendiente' || act.estado === 'en_espera').length;
  const confirmados = todas.filter(act => act.estado === 'cerrado').length;
  const inactivos = todas.filter(act => act.estado === 'inactivo').length;
  const totalGeneral = todas.length;
  
  // Circunferencia del círculo
  const circ = 301.6;
  
  // Elementos del DOM
  const donutPending = document.getElementById('donut-pending');
  const donutConfirmed = document.getElementById('donut-confirmed');
  const centerText = document.getElementById('donut-center-text');
  const legendPending = document.getElementById('legend-pending');
  const legendConfirmed = document.getElementById('legend-confirmed');
  
  // Según el filtro seleccionado
  if (state.filterEstado === 'all') {
    // MOSTRAR DONUT MORADO COMPLETO (como los otros filtros)
    // El círculo se pone morado y muestra el total de actividades
    
    donutPending.style.stroke = '#3b82f6'; // Color morado
    donutPending.style.strokeDasharray = `${circ} ${circ}`;
    donutPending.style.strokeDashoffset = '0';
    donutConfirmed.style.strokeDasharray = `0 ${circ}`;
    
    // El centro muestra TODAS las actividades
    centerText.textContent = totalGeneral;
    
    // Las leyendas muestran pendientes y confirmados
    legendPending.textContent = `${pendientes} pending`;
    legendConfirmed.textContent = `${confirmados} confirmed`;
    
  } else if (state.filterEstado === 'pendiente') {
    // Solo pendientes (círculo rojo completo)
    donutPending.style.stroke = '#ef4444';
    donutPending.style.strokeDasharray = `${circ} ${circ}`;
    donutPending.style.strokeDashoffset = '0';
    donutConfirmed.style.strokeDasharray = `0 ${circ}`;
    centerText.textContent = pendientes;
    legendPending.textContent = `${pendientes} pending`;
    legendConfirmed.textContent = `0 confirmed`;
    
  } else if (state.filterEstado === 'cerrado') {
    // Solo confirmados (círculo verde completo)
    donutConfirmed.style.stroke = '#10b981';
    donutConfirmed.style.strokeDasharray = `${circ} ${circ}`;
    donutConfirmed.style.strokeDashoffset = '0';
    donutPending.style.strokeDasharray = `0 ${circ}`;
    centerText.textContent = confirmados;
    legendPending.textContent = `0 pending`;
    legendConfirmed.textContent = `${confirmados} confirmed`;
    
  } else if (state.filterEstado === 'inactivo') {
    // Solo inactivos (círculo gris completo)
    donutPending.style.stroke = '#9ca3af';
    donutPending.style.strokeDasharray = `${circ} ${circ}`;
    donutPending.style.strokeDashoffset = '0';
    donutConfirmed.style.strokeDasharray = `0 ${circ}`;
    centerText.textContent = inactivos;
    legendPending.textContent = `${inactivos} inactive`;
    legendConfirmed.textContent = `0 confirmed`;
  }
}

function renderTabs() {
  const DAY_LABELS = {
    'Lunes': 'Monday',
    'Martes': 'Tuesday',
    'Miércoles': 'Wednesday',
    'Jueves': 'Thursday',
    'Viernes': 'Friday'
  };

  const bar = document.getElementById('tab-bar');
  bar.innerHTML = DAYS.map(d => `
    <button class="tab ${d === state.activeDay ? 'active' : ''}" onclick="setDay('${d}')">${DAY_LABELS[d] || d}</button>
  `).join('');
}

function renderSchedule() {
  const dayActividades = getActividadesPorDia(state.activeDay);
  const list = document.getElementById('schedule-list');

  if (dayActividades.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div>No scheduled activities</div>`;
    return;
  }

  const sorted = [...dayActividades].sort((a, b) => {
    const ta = new Date(a.fecha).getTime();
    const tb = new Date(b.fecha).getTime();
    if (ta !== tb && !isNaN(ta) && !isNaN(tb)) return ta - tb;
    const order = { pendiente: 1, cerrado: 2, inactivo: 3 };
    return order[a.estado] - order[b.estado];
  });

  list.innerHTML = sorted.map(act => {
    const { statusLabel, statusClass } = getStatusInfo(act.estado);
    const horaStr = formatRangoHora(act.fecha, act.fecha_fin);
   const isSelected = act.estado === 'pendiente' || act.estado === 'en_espera';
    const selectedClass = isSelected ? ' sch-selected' : '';

    let bodyHtml = '';

  if (act.estado === 'pendiente' || act.estado === 'en_espera') {
  bodyHtml = `<div class="sch-body-inner">
                ${buildTwoColOptionsBody(act, true)}
              </div>`;
} else if (act.estado === 'cerrado') {
  const selectedOpciones = act.opciones?.filter(o => o.seleccionada) || [];
  if (selectedOpciones.length > 0) {
    bodyHtml = `
      <div class="sch-body-inner">
        <div class="closed-options-list">
          ${selectedOpciones.map(opcion => `
            <div class="closed-selected-option">
              <div>${escapeHtml(opcion.titulo || 'Opción')}</div>
              ${opcion.descripcion ? `<div>${escapeHtml(opcion.descripcion)}</div>` : ''}
              ${buildClosedOptionExtraHtml(opcion)}
            </div>
          `).join('')}
        </div>
        <div class="closed-notice">✓ Decision closed</div>
      </div>`;
  } else {
    bodyHtml = `<div class="sch-body-inner">
                  <div class="no-options"><p>Closed activity without a recorded option.</p></div>
                  ${getComentariosHTML(act.id)}
                </div>`;
  }
    } else if (act.estado === 'inactivo') {
      bodyHtml = `<div class="sch-body-inner"><div class="no-options"><p>Inactive activity.</p></div></div>`;
    }

    const hasBody = bodyHtml !== '';
    const isOpenClass = state.openActivities[act.id] ? ' open' : '';

    return `
      <div class="sch-item${selectedClass}${isOpenClass}" id="sch-${act.id}">
        <div class="sch-header" onclick="toggleSchItem('${act.id}', ${hasBody})">
          ${horaStr ? `<span class="sch-time">${horaStr}</span><span class="sch-sep"> - </span>` : ''}
          <span class="sch-name">${escapeHtml(act.titulo)}</span>
          <span class="sch-status ${statusClass}">${statusLabel}</span>
          ${hasBody ? `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>` : ''}
        </div>
        ${hasBody ? `<div class="sch-body">${bodyHtml}</div>` : ''}
      </div>`;
  }).join('');
}

function getStatusInfo(estado) {
  const map = {
    en_espera: { statusLabel: 'Pending', statusClass: 'status-pending' },
    pendiente:  { statusLabel: 'Pending', statusClass: 'status-pending' },
    cerrado:    { statusLabel: 'Closed',   statusClass: 'status-closed' },
    inactivo:   { statusLabel: 'Inactive',  statusClass: 'status-inactive' },
  };
  return map[estado] || { statusLabel: 'Inactive', statusClass: 'status-inactive' };
}

// ──────────────────────────────────────────────
//  INTERACTIONS
// ──────────────────────────────────────────────

/** Cambia la opción activa en el panel de detalle sin re-render completo */
function setActiveOption(actividadId, opcionId, evt) {
  if (evt) evt.stopPropagation();

  state.activeOptionId[actividadId] = opcionId;

  const act = state.actividades.find(a => a.id === actividadId);
  if (!act) return;

  const activeOpt = act.opciones.find(o => o.id === opcionId);
  const isPendiente = act.estado === 'pendiente' || act.estado === 'en_espera';

  // Actualizar clases en la lista
  const listCol = document.getElementById(`opts-list-${actividadId}`);
  if (listCol) {
    listCol.querySelectorAll('.option-list-item').forEach((el, i) => {
      const opt = act.opciones[i];
      el.classList.toggle('active', opt?.id === opcionId);
    });
  }

  // Actualizar panel de detalle
  const detailCol = document.getElementById(`opts-detail-${actividadId}`);
  if (detailCol && activeOpt) {
    const isSelected = activeOpt.seleccionada;
    detailCol.innerHTML = buildOptionDetailHtml(activeOpt, actividadId, isSelected, isPendiente);
    
    // 🔥 Cargar los comentarios después de que el HTML esté en el DOM
    setTimeout(() => {
      renderComentariosOpcion(opcionId, `comentarios-opcion-${opcionId}`);
    }, 50);
    
    if (isSelected) {
      detailCol.classList.add('is-selected');
    } else {
      detailCol.classList.remove('is-selected');
    }
  }
}

function setDay(day) {
  state.activeDay = day;
  renderTabs();
  renderSchedule();
  document.getElementById('programa').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setFilter(filter) {
  state.filterEstado = filter;
  
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderPending();
  renderDonut();
}
function toggleSchItem(actividadId, hasBody) {
  if (!hasBody) return;
  const el = document.getElementById(`sch-${actividadId}`);
  const isOpening = !el.classList.contains('open');
  el.classList.toggle('open');
  
  state.openActivities[actividadId] = isOpening;

  // Al abrir, asegurarse de que la primera opción está activa en el panel
  if (isOpening) {
    const act = state.actividades.find(a => a.id === actividadId);
    if (act && act.opciones && act.opciones.length > 0 && !state.activeOptionId[actividadId]) {
      state.activeOptionId[actividadId] = act.opciones[0].id;
    }
  }
}

function scrollToDiaAndOpen(dia, actividadId) {
  state.activeDay = dia;
  state.openActivities[actividadId] = true;
  renderTabs();
  renderSchedule();
  setTimeout(() => {
    const el = document.getElementById(`sch-${actividadId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 50);
  document.getElementById('programa').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function seleccionarOpcion(actividadId, opcionId, evt) {
  if (evt) evt.stopPropagation();

  const act = state.actividades.find(a => a.id === actividadId);
  if (!act) return;

  const targetOption = act.opciones.find(o => o.id === opcionId);
  if (!targetOption) return;

  // Verificar si la actividad permite múltiple selección (inclusivo)
const isMultipleSelection = act.tipo_seleccion === 'inclusivo';
  
  if (isMultipleSelection) {
    // MODO MULTIPLE: toggle la opción seleccionada
    targetOption.seleccionada = !targetOption.seleccionada;
  } else {
    // MODO SINGLE: deseleccionar todas y seleccionar esta
    if (targetOption.seleccionada) {
      targetOption.seleccionada = false;
    } else {
      act.opciones.forEach(opt => {
        opt.seleccionada = false;
      });
      targetOption.seleccionada = true;
    }
  }

  // Actualizar estado de la actividad
  const hasSelected = act.opciones.some(o => o.seleccionada);
  if (hasSelected && act.estado === 'en_espera') act.estado = 'pendiente';
  if (!hasSelected && act.estado !== 'cerrado') act.estado = 'en_espera';

  const isPendienteOEspera = act.estado === 'pendiente' || act.estado === 'en_espera';

  // Actualizar UI de la lista de opciones
  const listCol = document.getElementById(`opts-list-${actividadId}`);
  if (listCol) {
    listCol.querySelectorAll('.option-list-item').forEach((el, i) => {
      const opt = act.opciones[i];
      if (!opt) return;
      
      const hasAnySelected = act.opciones.some(o => o.seleccionada);
      el.classList.toggle('selected-item', opt.seleccionada);
      
      // Solo para modo single mostrar el rojo
      if (!isMultipleSelection) {
        el.classList.toggle('deselected-item', hasAnySelected && !opt.seleccionada);
      } else {
        el.classList.remove('deselected-item');
      }
      
      const arrow = el.querySelector('.option-list-arrow');
      if (arrow) {
        arrow.innerHTML = opt.seleccionada
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`
          : `▶`;
      }
    });
  }

  // Actualizar panel de detalle
  const detailCol = document.getElementById(`opts-detail-${actividadId}`);
  if (detailCol) {
    const activeOptId = state.activeOptionId[actividadId];
    const activeOpt = act.opciones.find(o => o.id === activeOptId) || act.opciones[0];
    if (activeOpt) {
      const isSelected = activeOpt.seleccionada;
      detailCol.innerHTML = buildOptionDetailHtml(activeOpt, actividadId, isSelected, isPendienteOEspera);
      detailCol.classList.toggle('is-selected', isSelected);
      
      // Recargar comentarios
      setTimeout(() => {
        renderComentariosOpcion(activeOpt.id, `comentarios-opcion-${activeOpt.id}`);
      }, 50);
    }
  }

  // Actualizar footer de decisión
  const twoCol = detailCol?.closest('.options-two-col');
  if (twoCol) {
    let footer = twoCol.nextElementSibling;
    const hasAnySelected = act.opciones.some(o => o.seleccionada);
    const isPendiente = act.estado === 'pendiente';

    if (isPendiente && hasAnySelected) {
      if (!footer || !footer.classList.contains('decision-footer')) {
        footer = document.createElement('div');
        footer.className = 'decision-footer';
        footer.innerHTML = `<button type="button" class="btn-close-decision" onclick="cerrarActividad('${actividadId}',event)">Close Decision</button>`;
        twoCol.after(footer);
      }
    } else {
      if (footer && footer.classList.contains('decision-footer')) {
        footer.remove();
      }
    }
  }

  renderPending();
  renderGlobalActions();

  const selectedCount = act.opciones.filter(o => o.seleccionada).length;
  showToast(isMultipleSelection 
    ? `${selectedCount} option(s) selected`
    : (selectedCount > 0 ? `✓ Option selected` : `✓ Option deselected`));

  // Guardar en Supabase
  lastLocalChange = Date.now();
  isSaving = true;

  try {
    if (sb) {
      if (isMultipleSelection) {
        // Guardar selección múltiple: actualizar cada opción individualmente
        for (const opt of act.opciones) {
          await sb.from('opciones')
            .update({ seleccionada: opt.seleccionada })
            .eq('id', opt.id);
        }
      } else {
        // Modo single: deseleccionar todas y seleccionar solo la elegida
        await sb.from('opciones').update({ seleccionada: false }).eq('actividad_id', actividadId);
        if (targetOption.seleccionada) {
          await sb.from('opciones')
            .update({ seleccionada: true })
            .eq('id', opcionId);
        }
      }
      await saveEstadoActividad(actividadId, act.estado);
    }
  } catch (e) {
    console.error('Error guardando selección:', e);
    showToast(`Error: ${e.message || e}`);
  } finally {
    isSaving = false;
  }
}
async function cerrarActividad(actividadId, evt) {
  if (evt) evt.stopPropagation();

  const act = state.actividades.find(a => a.id === actividadId);
  if (!act) return;

  const isAnySelected = act.opciones.some(o => o.seleccionada);
  if (!isAnySelected) {
    showToast('Selecciona al menos una opción antes de cerrar la decisión');
    return;
  }

  act.estado = 'cerrado';
  lastLocalChange = Date.now();
  isSaving = true;

  try {
    await saveEstadoActividad(actividadId, 'cerrado');
    showToast(`✓ Decisión cerrada para ${act.titulo}`);
    rerenderPreservingPosition(actividadId);
  } catch (e) {
    console.error('Error cerrando actividad:', e);
    showToast('Error cerrando actividad');
  } finally {
    isSaving = false;
  }
}



function getPendingSelectedActivities() {
  return state.actividades.filter(act => 
    act.estado === 'pendiente' && 
    act.opciones?.some(o => o.seleccionada)
  );
}

function renderGlobalActions() {
  const container = document.getElementById('global-actions');
  if (!container) return;
  const selected = getPendingSelectedActivities();
  if (selected.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = `
  <div class="global-actions-card">
    <div class="global-actions-copy">
      <strong>${selected.length} selected activities</strong>
      <span>You can close all selected decisions in one step.</span>
    </div>
    <button class="btn-close-decision" style="width:auto;" onclick="closeSelectedActivities()">Confirm all</button>
  </div>`;
}

async function saveMultipleActividadEstado(ids, estado) {
  if (!sb || !ids || ids.length === 0) return false;
  const { error } = await sb.from('actividades')
    .update({ estado, updated_at: new Date().toISOString() }).in('id', ids);
  if (error) { console.error('Error actualizando actividades:', error); return false; }
  return true;
}

async function closeSelectedActivities() {
  const selected = getPendingSelectedActivities();
  if (selected.length === 0) return;
  if (!confirm(`¿Cerrar ${selected.length} actividades seleccionadas?`)) return;

  const ids = selected.map(act => act.id);

  lastLocalChange = Date.now();
  isSaving = true;

  try {
    const success = await saveMultipleActividadEstado(ids, 'cerrado');
    if (success) {
      showToast(`✓ ${selected.length} actividades confirmadas`);
    }
  } catch (e) {
    console.error('Error cerrando actividades:', e);
    showToast('Error cerrando actividades');
  } finally {
    isSaving = false;
  }

  await loadFromSupabase();
  render();
}


function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

['detail-modal','choose-modal','info-modal'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function(e) {
    if (e.target === this) closeModal(id);
  });
});


// ──────────────────────────────────────────────
//  VOTING FUNCTIONS (LOCALSTORAGE)
// ──────────────────────────────────────────────

function agregarVoto(opcionId, evt) {
  if (evt) evt.stopPropagation();
  
  // Verificar si ya votó
  if (state.votosUsuario[opcionId]) {
    showToast('Ya has votado por esta opción');
    return;
  }
  
  // Incrementar contador de votos
  state.votos[opcionId] = (state.votos[opcionId] || 0) + 1;
  // Marcar que el usuario votó
  state.votosUsuario[opcionId] = true;
  
  // Guardar en localStorage
  saveVotosToLocalStorage();
  
  // Actualizar la UI
  render();
  showToast('¡Voto registrado! 👍');
}

function quitarVoto(opcionId, evt) {
  if (evt) evt.stopPropagation();
  
  // Verificar si ha votado
  if (!state.votosUsuario[opcionId]) {
    showToast('No has votado por esta opción');
    return;
  }
  
  // Decrementar contador de votos (mínimo 0)
  state.votos[opcionId] = Math.max(0, (state.votos[opcionId] || 0) - 1);
  // Desmarcar voto del usuario
  delete state.votosUsuario[opcionId];
  
  // Guardar en localStorage
  saveVotosToLocalStorage();
  
  // Actualizar la UI
  render();
  showToast('Voto eliminado');
}

// Función para convertir saltos de línea en <br>
function formatTextWithLineBreaks(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}
// ──────────────────────────────────────────────
//  INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
 try {
    loadVotosFromLocalStorage();
    await loadFromSupabase();
    render();
  } catch(e) {
    console.error('Error en carga inicial:', e);
  }
});

async function silentRefresh() {
  try {
    if (isSyncing || isSaving) return;
    if (Date.now() - lastLocalChange < 4000) return;

    const y = window.scrollY;
    const openBefore = { ...state.openActivities };
    const activeOptBefore = { ...state.activeOptionId };

    await loadFromSupabase();

    state.openActivities = openBefore;
    state.activeOptionId = activeOptBefore;

    render();

    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  } catch (e) {
    console.error('Error en recarga:', e);
  }
}


// ──────────────────────────────────────────────
//  EXPORTAR CRONOGRAMA A EXCEL
// ──────────────────────────────────────────────
window.exportarCronogramaExcel = async function() {
  if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
    showToast('Las librerías de exportación aún no han cargado.', 'error');
    return;
  }

  showToast('Generando Excel, por favor espera...');
  
  try {
    // 1. Fetch de la plantilla
    const response = await fetch('./assets/SIPAIM_Program_2026.xlsx');
    if (!response.ok) throw new Error('No se pudo cargar la plantilla local.');
    const arrayBuffer = await response.arrayBuffer();

    // 2. Cargar en ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const ws = wb.worksheets[0]; // Trabajar en la primera hoja

    // 3. Filtrar actividades cerradas
    const actividadesCerradas = state.actividades.filter(a => a.estado === 'cerrado');

    if (actividadesCerradas.length === 0) {
      showToast('No hay decisiones cerradas para exportar.', 'error');
      return;
    }

    // 4. Inyectar datos
    actividadesCerradas.forEach(act => {
      const opcionesElegidas = act.opciones.filter(o => o.seleccionada);
      if (opcionesElegidas.length === 0) return;

      const detallesTexto = opcionesElegidas.map(o => `✓ ${o.titulo}`).join('\n');
      const infoAInyectar = `${act.titulo}\n\nDECISIÓN FINAL:\n${detallesTexto}`;

      // Calcular el día y la hora de la actividad para encontrar el slot exacto
      const actDate = new Date(act.fecha); // Ej. 2026-04-20T08:30:00
      const actDay = actDate.getDay(); // 1=Lunes, 2=Martes...
      const actTimeStr = actDate.getHours().toString().padStart(2, '0') + ':' + actDate.getMinutes().toString().padStart(2, '0');

      // Mapeo de columnas por día en la plantilla SIPAIM_Program_2026.xlsx
      const colMap = { 1: [2,3], 2: [4,5], 3: [6,7], 4: [8,9], 5: [10,11] };
      const targetCols = colMap[actDay] || [];

      // Recorrer toda la hoja buscando la celda que tenga el título de esta actividad
      ws.eachRow(row => {
        row.eachCell(cell => {
          // Solo buscar en las columnas que corresponden al día de esta actividad
          if (!targetCols.includes(cell.col)) return;

          if (cell.value) {
            let text = '';
            if (typeof cell.value === 'string') text = cell.value;
            else if (cell.value.richText) text = cell.value.richText.map(rt => rt.text).join('');

            // Si el texto de la celda contiene el título de la actividad
            if (text && text.toLowerCase().includes(act.titulo.toLowerCase())) {
               
               // Verificar que la HORA coincida (leyendo la columna 1 de la fila original)
               const masterRow = cell.master.row; // Por si es una celda combinada
               const timeCell = ws.getRow(masterRow).getCell(1);
               let cellTimeStr = '';

               if (timeCell.value instanceof Date) {
                 cellTimeStr = timeCell.value.getUTCHours().toString().padStart(2, '0') + ':' + timeCell.value.getUTCMinutes().toString().padStart(2, '0');
               } else if (typeof timeCell.value === 'string') {
                 // Intentar extraer de un string (por si acaso)
                 const match = timeCell.value.match(/(\d{1,2}:\d{2})/);
                 if (match) cellTimeStr = match[1].padStart(5, '0');
               }

               // Si la hora coincide, o si no se pudo leer la hora pero el titulo es muy único, sobrescribimos.
               // Para ser seguros, exigimos que la hora coincida.
               if (cellTimeStr === actTimeStr) {
                 cell.value = infoAInyectar;
                 
                 cell.fill = {
                   type: 'pattern',
                   pattern: 'solid',
                   fgColor: { argb: 'FFE6F4EA' } 
                 };
                 
                 cell.font = {
                   color: { argb: 'FF1F2937' },
                   bold: true,
                   size: 11
                 };
                 
                 cell.alignment = { 
                   wrapText: true, 
                   vertical: 'middle', 
                   horizontal: 'center' 
                 };
               }
            }
          }
        });
      });
    });

    // 5. Descargar archivo resultante
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'SIPAIM_Cronograma_Final_2026.xlsx');
    showToast('¡Excel exportado con éxito!');

  } catch (e) {
    console.error(e);
    showToast('Error exportando Excel', 'error');
  }
};