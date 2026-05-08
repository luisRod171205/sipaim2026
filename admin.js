// ──────────────────────────────────────────────
//  SUPABASE SETUP
// ──────────────────────────────────────────────


const SUPABASE_URL = 'https://wcoetgrnphuwebpkzyel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb2V0Z3JucGh1d2VicGt6eWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzE2NDgsImV4cCI6MjA5MjU0NzY0OH0.6GtN_-R_RTbihHZtTrqL74qgC6UrchyQ_Jc76yyTSMc';

let editingOptionId = null;

try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  console.warn('Supabase not configured');
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

function setTipoCambio(valor) {
  localStorage.setItem(TIPO_CAMBIO_KEY, valor);
}

function convertirMoneda(precio, monedaOrigen) {
  const tipoCambio = getTipoCambio();
  const precioNum = parseFloat(precio);
  
  if (isNaN(precioNum)) return null;
  
  if (monedaOrigen === 'S/.') {
    // Soles a Dólares
    const dolares = (precioNum / tipoCambio).toFixed(2);
    return `S/. ${precioNum} ($${dolares})`;
  } else {
    // Dólares a Soles
    const soles = (precioNum * tipoCambio).toFixed(2);
    return `$${precioNum} (S/. ${soles})`;
  }
}

// Inicializar el campo de tipo de cambio en el admin
function initTipoCambioAdmin() {
  const input = document.getElementById('tipo-cambio-input');
  const btn = document.getElementById('guardar-tipo-cambio');
  const status = document.getElementById('tipo-cambio-status');
  
  if (!input || !btn) return;
  
  // Cargar valor actual
  input.value = getTipoCambio();
  
  // Guardar nuevo valor
  btn.addEventListener('click', () => {
    const nuevoValor = parseFloat(input.value);
    if (isNaN(nuevoValor) || nuevoValor <= 0) {
      status.textContent = '❌ Valor inválido';
      setTimeout(() => { status.textContent = ''; }, 2000);
      return;
    }
    setTipoCambio(nuevoValor);
    status.textContent = '✓ Tipo de cambio actualizado';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

// ──────────────────────────────────────────────
//  FUNCIONES DE ADMIN
// ──────────────────────────────────────────────
async function cargarActividades() {
  if (!sb) return;
  try {
    const { data, error } = await sb.from('actividades').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    renderActividades(data);
  } catch (e) {
    console.error('Error cargando actividades:', e);
  }
}

function renderActividades(actividades) {
  const list = document.getElementById('actividades-list');
  if (actividades.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay actividades creadas</div>';
    return;
  }
  const estadoLabelMap = {
    inactivo: 'Inactivo',
    pendiente: 'Pendiente',
    cerrado: 'Cerrado'
  };

  list.innerHTML = actividades.map(act => {
    const inicio = act.fecha     ? new Date(act.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    const fin    = act.fecha_fin ? new Date(act.fecha_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    const fecha  = act.fecha     ? new Date(act.fecha).toLocaleDateString() : '';
    const rango  = inicio && fin ? `${inicio} – ${fin}` : inicio;
    const estadoVisual = estadoLabelMap[act.estado] || act.estado;

    return `
    <div class="actividad-item">
      <div class="actividad-header">
        <h3>${act.titulo}</h3>
        <span class="estado-${act.estado}">${estadoVisual}</span>
      </div>
      <p>Fecha: ${fecha} &nbsp;·&nbsp; ${rango}</p>
      <div class="actividad-actions">
        <button class="btn-primary" onclick="abrirModalOpciones('${act.id}', '${act.titulo}')">Gestionar Opciones</button>
        <button class="btn-secondary" onclick="cambiarEstado('${act.id}', '${act.estado}')">Cambiar Estado</button>
        <button class="btn-secondary" style="background:#fde2e2;color:#b91c1c;border-color:rgba(185,28,28,0.12);" onclick="eliminarActividad('${act.id}', '${act.titulo}')">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

async function crearActividad(titulo, dia, hora, horaFin) {
  if (!sb) { alert('❌ Error: Supabase no está cargado'); return; }
  try {
    const fechaCompleta    = getFechaFromDiaYHora(dia, hora);
    const fechaFinCompleta = getFechaFromDiaYHora(dia, horaFin);

    console.log('Guardando fecha inicio:', fechaCompleta);
    console.log('Guardando fecha fin:', fechaFinCompleta);

    const { data, error } = await sb.from('actividades').insert({
      titulo,
      fecha: fechaCompleta,
      fecha_fin: fechaFinCompleta,
      estado: 'inactivo'
    }).select();

    if (error) throw error;
    alert('✅ Actividad creada exitosamente');
    cargarActividades();
    return data[0];
  } catch (e) {
    alert('❌ Error: ' + (e.message || 'Error desconocido'));
  }
}


function getFechaFromDiaYHora(dia, hora) {
  const semanaBase = {
    'Lunes': '2026-04-20',
    'Martes': '2026-04-21',
    'Miércoles': '2026-04-22',
    'Jueves': '2026-04-23',
    'Viernes': '2026-04-24'
  };

  const fechaBase = semanaBase[dia];
  if (!fechaBase) throw new Error('Día inválido');

  // Guardar SIN zona horaria (como texto simple)
  return `${fechaBase}T${hora}:00`;
}



async function cambiarEstado(actividadId, estadoActual) {
  const estados = ['inactivo', 'pendiente', 'cerrado'];
  const currentIndex = estados.indexOf(estadoActual);
  const nextEstado = estados[(currentIndex + 1) % estados.length];

  if (!sb) return;
  try {
    const { error } = await sb.from('actividades').update({ estado: nextEstado }).eq('id', actividadId);
    if (error) throw error;
    cargarActividades();
  } catch (e) {
    console.error('Error cambiando estado:', e);
  }
}

async function eliminarActividad(actividadId, titulo) {
  if (!sb) return;
  if (!confirm(`¿Eliminar la actividad "${titulo}"? Esta acción no se puede deshacer.`)) return;

  try {
    const { error } = await sb.from('actividades').delete().eq('id', actividadId);
    if (error) throw error;
    showToast(`✓ Actividad eliminada: ${titulo}`);
    cargarActividades();
  } catch (e) {
    console.error('Error eliminando actividad:', e);
    showToast('❌ No se pudo eliminar la actividad', 'error');
  }
}

let actividadActualId = null;
let opcionesActuales = [];

function abrirModalOpciones(actividadId, titulo) {
  actividadActualId = actividadId;
  const titleEl = document.getElementById('om-actividad-titulo') || document.getElementById('om-title');
  if (titleEl) titleEl.textContent = titulo;
  cargarOpciones(actividadId);
  document.getElementById('opciones-modal').classList.add('show');
}

async function cargarOpciones(actividadId) {
  if (!sb) return;
  try {
    const { data, error } = await sb.from('opciones').select('*').eq('actividad_id', actividadId);
    if (error) throw error;
    opcionesActuales = data || [];
    renderOpciones();
    
    if (opcionesActuales.length > 0) {
      mostrarDetalleOpcion(opcionesActuales[0].id);
    } else {
      mostrarFormularioOpcion();
    }
  } catch (e) {
    console.error('Error cargando opciones:', e);
  }
}

function resetExtraFields() {
  currentExtraFields = [];
  renderExtraFields();
}

function renderExtraFields() {
  const list = document.getElementById('extra-fields-list');
  if (!list) return;
  if (currentExtraFields.length === 0) {
    list.innerHTML = '<div class="empty-state">Agrega los campos dinámicos de esta opción aquí.</div>';
    return;
  }

  list.innerHTML = currentExtraFields.map(field => `
    <div class="extra-field-row" data-field-id="${field.id}">
      <input type="text" placeholder="Nombre del campo" value="${escapeHtml(field.key)}" oninput="updateExtraField('${field.id}', 'key', this.value)" />
      <input type="text" placeholder="Valor" value="${escapeHtml(field.value)}" oninput="updateExtraField('${field.id}', 'value', this.value)" />
      <button type="button" class="btn-opcion-eliminar" onclick="removeExtraField('${field.id}')">Eliminar</button>
    </div>
  `).join('');
}

function addExtraField() {
  currentExtraFields.push({ id: `field-${Date.now()}`, key: '', value: '' });
  renderExtraFields();
}

function updateExtraField(fieldId, prop, value) {
  const field = currentExtraFields.find(item => item.id === fieldId);
  if (!field) return;
  field[prop] = value;
}

function removeExtraField(fieldId) {
  currentExtraFields = currentExtraFields.filter(item => item.id !== fieldId);
  renderExtraFields();
}

function getExtraFieldsObject() {
  return currentExtraFields.reduce((acc, field) => {
    const key = String(field.key || '').trim();
    if (!key) return acc;
    acc[key] = field.value;
    return acc;
  }, {});
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function insertSoftBreaks(s, every = 18) {
  if (s == null) return '';
  return String(s).replace(new RegExp(`([^\\s]{${every}})(?=[^\\s])`, 'g'), '$1\u200B');
}

function renderOpciones() {
  const list = document.getElementById('opciones-list');

  if (!opcionesActuales || opcionesActuales.length === 0) {
    list.innerHTML = '<div class="opciones-list-empty">Aún no hay opciones. Añade una nueva.</div>';
    return;
  }

  list.innerHTML = opcionesActuales.map(opt => {
    const titulo = escapeHtml(insertSoftBreaks(opt.titulo || 'Sin título'));
    const desc = escapeHtml(insertSoftBreaks(opt.descripcion || ''));
    return `
    <div class="opcion-item" id="opcion-item-${opt.id}" onclick="mostrarDetalleOpcion('${opt.id}')">
      <h4>${titulo}</h4>
      <p>${desc}</p>
    </div>`;
  }).join('');
}

function mostrarDetalleOpcion(id) {
  const opt = opcionesActuales.find(o => o.id === id);
  if (!opt) return;

  // Actualizar visualmente la lista
  document.querySelectorAll('.opcion-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`opcion-item-${id}`);
  if (activeEl) activeEl.classList.add('active');

  // Mostrar panel de detalle y ocultar formulario
  document.getElementById('opcion-form-view').style.display = 'none';
  const detailView = document.getElementById('opcion-detail-view');
  detailView.style.display = 'flex';

  // Renderizar contenido del detalle
  const titulo = escapeHtml(insertSoftBreaks(opt.titulo || 'Sin título'));
  const desc = escapeHtml(insertSoftBreaks(opt.descripcion || ''));
  
  let extraHtml = '';
 if (opt.extra != null) {
    const entries = Array.isArray(opt.extra)
      ? opt.extra
      : Object.entries(opt.extra).map(([k, v]) => ({ k, v }));
    
    // Separar campos resaltados, normales y especiales
    const resaltados = entries.filter(({k}) => k === 'Price' || k === 'Availability');
    const normales = entries.filter(({k}) => k.toLowerCase() !== 'imagen' && k.toLowerCase() !== 'url' && k !== 'Price' && k !== 'Availability');
    const especiales = entries.filter(({k}) => k.toLowerCase() === 'imagen' || k.toLowerCase() === 'url');
    
    // Renderizar badges resaltados
    let badgesHtml = '';
    if (resaltados.length > 0) {
      badgesHtml = `<div class="relevant-badges-container" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">`;
      badgesHtml += resaltados.map(({k, v}) => {
        const icon = k === 'Price' ? '💰' : '🗓️';
        const bgColor = k === 'Price' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)';
        const borderColor = k === 'Price' ? '#3b82f6' : '#22c55e';
        const textColor = k === 'Price' ? '#1e40af' : '#15803d';
        
        return `<div class="info-badge" style="background: ${bgColor}; border: 2px solid ${borderColor}; color: ${textColor}; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">${icon}</span>
          <span><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</span>
        </div>`;
      }).join('');
      badgesHtml += '</div>';
    }

    // Renderizar campos normales y especiales
    const ordenadas = [...normales, ...especiales];
    let normalHtml = ordenadas.map(({k, v}) => {
   if (k.toLowerCase() === 'imagen') {
        return `<div class="detail-block">
          <img src="${escapeHtml(String(v))}" alt="Imagen" 
               style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;" 
               onerror="this.style.display='none'"/>
        </div>`;
      }
      if (k.toLowerCase() === 'url') {
        return `<div class="detail-block">
          <h5>Link</h5>
          <a href="${escapeHtml(String(v))}" target="_blank" rel="noopener noreferrer"
             style="color:var(--accent);font-weight:600;word-break:break-all;">
            ${escapeHtml(String(v))}
          </a>
        </div>`;
      }
      return `
      <div class="detail-block">
        <h5>${escapeHtml(k)}</h5>
        <p>${escapeHtml(String(v))}</p>
      </div>`;
    }).join('');
    
    extraHtml = badgesHtml + normalHtml;
  } else if (opt.extra != null && String(opt.extra).trim() !== '') {
    extraHtml = `
      <div class="detail-block">
        <h5>Detalles Adicionales</h5>
        <p>${escapeHtml(String(opt.extra))}</p>
      </div>
    `;
  }

  detailView.innerHTML = `
    <div class="modal-right-header">
      <h3 class="detail-title">${titulo}</h3>
<p class="detail-desc">${desc.replace(/\n/g, '<br>')}</p>
    </div>
    <div style="flex: 1;">
      ${extraHtml}
    </div>
    <div class="modal-actions" style="margin-top: auto; padding-top: 20px; display: grid; gap: 12px;">
      <button type="button" class="btn-primary" style="width:100%; border-radius: 8px; font-size: 14px; padding: 12px;" onclick="editarOpcion('${opt.id}')">Editar esta Opción</button>
      <button type="button" class="btn-opcion-eliminar" style="width:100%; border-radius: 8px; font-size: 14px; padding: 12px;" onclick="eliminarOpcion('${opt.id}')">Eliminar esta Opción</button>
    </div>
  `;
}

function mostrarFormularioOpcion() {
  editingOptionId = null;
  setOptionFormMode(false);

  // Limpiar selección de la lista
  document.querySelectorAll('.opcion-item').forEach(el => el.classList.remove('active'));
  
  // Limpiar formulario
  document.getElementById('nueva-opcion-titulo').value = '';
  document.getElementById('nueva-opcion-desc').value = '';
  document.getElementById('info-precio').value = '';
  document.getElementById('info-disponibilidad').value = '';
  document.getElementById('info-notas').value = '';
  document.getElementById('info-moneda').value = 'S/.';
  document.getElementById('campos-dinamicos-container').innerHTML = '';

  // Alternar paneles
  document.getElementById('opcion-detail-view').style.display = 'none';
  document.getElementById('opcion-form-view').style.display = 'block';
}

function setOptionFormMode(isEditing) {
  const titleEl = document.getElementById('opcion-form-title');
  const submitBtn = document.getElementById('opcion-form-submit-btn');
  const cancelBtn = document.getElementById('opcion-cancel-edit-btn');

  if (isEditing) {
    if (titleEl) titleEl.textContent = 'Editar Opción';
    if (submitBtn) submitBtn.textContent = 'Guardar cambios';
    if (cancelBtn) cancelBtn.style.display = 'block';
  } else {
    if (titleEl) titleEl.textContent = 'Crear Nueva Opción';
    if (submitBtn) submitBtn.textContent = 'Guardar Opción';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }
}

function populateExtraFields(extra) {
  const container = document.getElementById('campos-dinamicos-container');
  if (!container) return;
  container.innerHTML = '';

  const appendField = (key, value) => {
    const div = document.createElement('div');
    div.className = 'bloque-dinamico';
    div.style = `
      margin-bottom: 15px;
      padding: 15px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: rgba(0,0,0,0.02);
      position: relative;
    `;
    div.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()" 
              style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: #ff4444; cursor: pointer; font-size: 20px;">&times;</button>
      <div class="form-group" style="margin-bottom: 10px;">
        <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Nombre del campo</label>
        <input type="text" class="input-nombre-campo" placeholder="Ej: Ponente o Requisitos" value="${escapeHtml(key)}" />
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Valor del campo</label>
        <textarea class="input-valor-campo" placeholder="Escribe el detalle aquí..." rows="3">${escapeHtml(value)}</textarea>
      </div>
    `;
    container.appendChild(div);
  };

 if (Array.isArray(extra)) {
    extra.forEach(({k, v}) => appendField(k, String(v)));
  } else if (extra != null && typeof extra === 'object') {
    Object.entries(extra).forEach(([key, value]) => appendField(key, String(value)));
  }
}

function editarOpcion(opcionId) {
  const opt = opcionesActuales.find(o => o.id === opcionId);
  if (!opt) return;

  editingOptionId = opcionId;
  setOptionFormMode(true);

  document.getElementById('nueva-opcion-titulo').value = opt.titulo || '';
  document.getElementById('nueva-opcion-desc').value = opt.descripcion || '';

  // Extraer campos especiales (Precio, Disponibilidad, Notas)
  let precio = '';
  let moneda = 'S/.';
  let disponibilidad = '';
  let notas = '';
  let camposDinamicos = [];

  if (opt.extra) {
    const entries = Array.isArray(opt.extra)
      ? opt.extra
      : Object.entries(opt.extra).map(([k, v]) => ({ k, v }));

    entries.forEach(({k, v}) => {
      if (k === 'Price') {
        // Parsear "S/. 100.00 (Notas)" o "$ 100.00"
        const precioStr = String(v).trim();
        const match = precioStr.match(/^(S\/\.|\$)\s*([0-9.]+)\s*(?:\((.+)\))?/);
        if (match) {
          moneda = match[1];
          precio = match[2];
          notas = match[3] || '';
        }
      } else if (k === 'Availability') {
        disponibilidad = String(v);
      } else {
        camposDinamicos.push({k, v});
      }
    });
  }

  // Rellenar campos especiales
  document.getElementById('info-moneda').value = moneda;
  document.getElementById('info-precio').value = precio;
  document.getElementById('info-disponibilidad').value = disponibilidad;
  document.getElementById('info-notas').value = notas;

  // Rellenar campos dinámicos
  populateExtraFields(camposDinamicos);

  document.getElementById('opcion-detail-view').style.display = 'none';
  document.getElementById('opcion-form-view').style.display = 'block';
}

function cancelarEdicion() {
  editingOptionId = null;
  setOptionFormMode(false);
  mostrarFormularioOpcion();
}

// Función para añadir una nueva fila de campos dinámicos en el modal
function agregarFilaCampo() {
  const container = document.getElementById('campos-dinamicos-container');
  const div = document.createElement('div');

  // Usamos estilos que respeten tu CSS actual
  div.className = 'bloque-dinamico';
  div.style = `
    margin-bottom: 15px; 
    padding: 15px; 
    border: 1px solid var(--border); 
    border-radius: 12px; 
    background: rgba(0,0,0,0.02); 
    position: relative;
  `;

  div.innerHTML = `
    <button type="button" onclick="this.parentElement.remove()" 
            style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: #ff4444; cursor: pointer; font-size: 20px;">&times;</button>
    
    <div class="form-group" style="margin-bottom: 10px;">
      <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Nombre del campo</label>
      <input type="text" class="input-nombre-campo" placeholder="Ej: Ponente o Requisitos">
    </div>
    
    <div class="form-group" style="margin-bottom: 0;">
      <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Valor del campo</label>
      <textarea class="input-valor-campo" placeholder="Escribe el detalle aquí..." rows="3"></textarea>
    </div>
  `;
  container.appendChild(div);
}

async function agregarOpcion() {
  const titulo = document.getElementById('nueva-opcion-titulo').value;
  const descripcion = document.getElementById('nueva-opcion-desc').value;
  
  // 1. Capturar Información Crítica
  const moneda = document.getElementById('info-moneda').value;
  const precioVal = document.getElementById('info-precio').value.trim();
  const disponibilidad = document.getElementById('info-disponibilidad').value.trim();
  const notas = document.getElementById('info-notas').value.trim();

  let extra = [];

  // Inyectar Precio como campo especial (con conversión)
if (precioVal) {
  const precioConvertido = convertirMoneda(precioVal, moneda);
  const precioTexto = notas 
    ? `${precioConvertido} (${notas})`
    : precioConvertido;
  extra.push({ 
    k: 'Precio', 
    v: precioTexto
  });
}

  // Inyectar Disponibilidad como campo especial
  if (disponibilidad) {
    extra.push({ 
      k: 'Disponibilidad', 
      v: disponibilidad 
    });
  }

  // 2. Capturar campos dinámicos
  const nombres = document.querySelectorAll('.input-nombre-campo');
  const valores = document.querySelectorAll('.input-valor-campo');

  let camposValidos = true;

  nombres.forEach((input, index) => {
    const llave = input.value.trim();
    const valor = valores[index].value.trim();
    if (valor !== "" && llave === "") {
      camposValidos = false;
      input.style.border = "2px solid #dc2626";
    } else if (llave !== "") {
      input.style.border = "1px solid var(--border)";
      extra.push({ k: llave, v: valor });
    }
  });

  if (!camposValidos) {
    showToast('⚠️ Error: Los campos adicionales deben tener un nombre.', 'error');
    return;
  }

  if (!titulo || !actividadActualId) {
    showToast('⚠️ El título de la opción es obligatorio', 'error');
    return;
  }

  try {
    const wasEditing = Boolean(editingOptionId);
    let error;
    const payload = {
      actividad_id: actividadActualId,
      descripcion: descripcion,
      extra: extra,
      titulo: titulo
    };

    if (wasEditing) {
      ({ error } = await sb.from('opciones').update(payload).eq('id', editingOptionId));
    } else {
      ({ error } = await sb.from('opciones').insert(payload));
    }

    if (error) throw error;

    editingOptionId = null;
    setOptionFormMode(false);
    document.getElementById('nueva-opcion-titulo').value = '';
    document.getElementById('nueva-opcion-desc').value = '';
    document.getElementById('info-precio').value = '';
    document.getElementById('info-disponibilidad').value = '';
    document.getElementById('info-notas').value = '';
    document.getElementById('info-moneda').value = 'S/.';
    document.getElementById('campos-dinamicos-container').innerHTML = '';
    cargarOpciones(actividadActualId);
    showToast(wasEditing ? '✓ Opción actualizada con éxito' : '✓ Opción guardada con éxito');
  } catch (e) {
    console.error(e);
    showToast('❌ Error al guardar', 'error');
  }
}

async function eliminarOpcion(opcionId) {
  if (!sb || !actividadActualId) return;
  if (!confirm('¿Eliminar esta opción? Esta acción no se puede deshacer.')) return;

  try {
    const { error } = await sb.from('opciones').delete().eq('id', opcionId);
    if (error) throw error;

    cargarOpciones(actividadActualId);
    showToast('Opción eliminada con éxito');
  } catch (e) {
    console.error('Error eliminando opción:', e);
    showToast('No se pudo eliminar la opción', 'error');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  
  const iconHtml = type === 'error' 
    ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
         <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
         <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
         <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
         <path d="M5 8l2.5 2.5L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;

  t.innerHTML = `${iconHtml}<span id="toast-msg">${msg}</span>`;
  
  if (type === 'error') {
    t.classList.add('error');
  } else {
    t.classList.remove('error');
  }

  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ──────────────────────────────────────────────
//  EVENT LISTENERS
// ──────────────────────────────────────────────
document.getElementById('actividad-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo  = document.getElementById('titulo').value;
  const dia     = document.getElementById('dia').value;
  const hora    = document.getElementById('hora').value;
  const horaFin = document.getElementById('hora-fin').value;

  if (!hora) { showToast('⚠️ Selecciona la hora de inicio', 'error'); return; }
  if (!horaFin) { showToast('⚠️ Selecciona la hora de fin', 'error'); return; }

  await crearActividad(titulo, dia, hora, horaFin);
  document.getElementById('actividad-form').reset();
  setAmPm('AM');
  setAmPmFin('AM');
});

document.getElementById('opciones-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal('opciones-modal');
});

document.addEventListener('DOMContentLoaded', function () {
  cargarActividades();
  initTimePicker();
  initTimePickerFin();
  initTipoCambioAdmin(); 

});

// ──────────────────────────────────────────────
//  CUSTOM TIME PICKER LOGIC
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
//  CUSTOM TIME PICKER LOGIC
// ──────────────────────────────────────────────
let currentAmPm = 'AM';
let currentAmPmFin = 'AM';

function setAmPm(period) {
  currentAmPm = period;
  document.getElementById('btn-am').classList.toggle('active', period === 'AM');
  document.getElementById('btn-pm').classList.toggle('active', period === 'PM');
  updateHiddenHora();
}

function updateHiddenHora() {
  const hhInput = document.getElementById('hora-hh').value;
  const mmInput = document.getElementById('hora-mm').value;
  const hiddenInput = document.getElementById('hora');
  if (!hhInput || !mmInput) { hiddenInput.value = ''; return; }
  let h = parseInt(hhInput, 10);
  const m = parseInt(mmInput, 10);
  if (isNaN(h) || isNaN(m)) return;
  
  // No convertir AM/PM, usar el valor directo (formato 24h)
  hiddenInput.value = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}


function initTimePicker() {
  const hh = document.getElementById('hora-hh');
  const mm = document.getElementById('hora-mm');
  if (!hh || !mm) return;

 hh.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  if (parseInt(val) > 23) val = '23';  // ← Ahora permite hasta 23
  e.target.value = val;
  if (val.length === 2 && parseInt(val) > 0) mm.focus();
  updateHiddenHora();
});
  hh.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (val.length === 1 && parseInt(val) > 0) e.target.value = '0' + val;
    else if (val === '0' || val === '00') e.target.value = '12';
    updateHiddenHora();
  });
  mm.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    if (parseInt(val) > 59) val = '59';
    e.target.value = val;
    updateHiddenHora();
  });
  mm.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (val.length === 1) e.target.value = '0' + val;
    else if (!val && hh.value) e.target.value = '00';
    updateHiddenHora();
  });
}

function setAmPmFin(period) {
  currentAmPmFin = period;
  document.getElementById('btn-fin-am').classList.toggle('active', period === 'AM');
  document.getElementById('btn-fin-pm').classList.toggle('active', period === 'PM');
  updateHiddenHoraFin();
}

function updateHiddenHoraFin() {
  const hhInput = document.getElementById('hora-fin-hh').value;
  const mmInput = document.getElementById('hora-fin-mm').value;
  const hiddenInput = document.getElementById('hora-fin');
  if (!hhInput || !mmInput) { hiddenInput.value = ''; return; }
  let h = parseInt(hhInput, 10);
  const m = parseInt(mmInput, 10);
  if (isNaN(h) || isNaN(m)) return;
  
  // Usar el valor directo (formato 24h)
  hiddenInput.value = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}


function initTimePickerFin() {
  const hh = document.getElementById('hora-fin-hh');
  const mm = document.getElementById('hora-fin-mm');
  if (!hh || !mm) return;

 hh.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  if (parseInt(val) > 23) val = '23';  // ← Ahora permite hasta 23
  e.target.value = val;
  if (val.length === 2 && parseInt(val) > 0) mm.focus();
  updateHiddenHoraFin();
});
  hh.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (val.length === 1 && parseInt(val) > 0) e.target.value = '0' + val;
    else if (val === '0' || val === '00') e.target.value = '12';
    updateHiddenHoraFin();
  });
  mm.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    if (parseInt(val) > 59) val = '59';
    e.target.value = val;
    updateHiddenHoraFin();
  });
  mm.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (val.length === 1) e.target.value = '0' + val;
    else if (!val && hh.value) e.target.value = '00';
    updateHiddenHoraFin();
  });
}