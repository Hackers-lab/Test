// ERP Web Companion — application logic
// Depends on: erp-web-data.js (must be loaded first)

// ═══════════════════════════════════════════════════════════════════
//  STATE & HISTORY ENGINE
// ═══════════════════════════════════════════════════════════════════
let project = {
  version: 7,
  project_meta: {
    subject: '', lat: '', long: '', division: '', circle: '',
    project_type: 'NSC', use_uh: false, supervision_rate: 0.10
  },
  overrides: {},
  nodes: [],
  spans: []
};

let historyStack = [];
let historyIndex = -1;

function saveState() {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push({
    nodes: JSON.parse(JSON.stringify(project.nodes)),
    spans: JSON.parse(JSON.stringify(project.spans)),
    nC: _nodeCounter, sC: _spanCounter
  });
  if (historyStack.length > 40) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(historyStack[historyIndex]);
    toast('Undo applied');
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    restoreState(historyStack[historyIndex]);
    toast('Redo applied');
  }
}

function restoreState(state) {
  project.nodes = JSON.parse(JSON.stringify(state.nodes));
  project.spans = JSON.parse(JSON.stringify(state.spans));
  _nodeCounter = state.nC; _spanCounter = state.sC;
  selectedId = null; spanFrom = null; lastAddedNodeId = null;
  renderAll(); buildPropStrip(null);
}

let activeTool = 'SELECT';
let selectedId = null;
let spanFrom = null;
let pendingStructurePos = null;
let lastAddedNodeId = null;

let isDragging = false;
let dragNodeId = null;
let dragOffX = 0, dragOffY = 0;
let _nodeCounter = 0;
let _spanCounter = 0;

// Pan & Zoom state
let panX = 0, panY = 0, scale = 1;
let isPanning = false;
let panStartX = 0, panStartY = 0, panStartPX = 0, panStartPY = 0;
let pinchDist = 0;
let touchStartPos = {x:0, y:0};
let hasMoved = false;

// A4 page at 96dpi: Portrait 210mm x 297mm → 794x1122px; Landscape → 1122x794px
const A4_PORT_W = 794, A4_PORT_H = 1122;
const A4_LAND_W = 1122, A4_LAND_H = 794;
let A4W = A4_PORT_W, A4H = A4_PORT_H;
let isLandscapeMode = false;
const SCALE_UNIT = 17.5; // canvas units per metre

// ── App Defaults (saved to localStorage) ──
let appDefaults = {
  division: '', circle: '', project_type: 'NSC', use_uh: false,
  lt_mat: 'PCC', lt_h: 8, ht_mat: 'PCC', ht_h: 9,
  lt_earth: 1, lt_stay: 0,
  span_len: 40, ab_cable_size: '3CX70+1CX16+1CX50', acsr_size: '50SQMM',
  sd_phase: '1 Phase', sd_cable: '10 SQMM'
};

function loadAppDefaults() {
  try {
    const saved = localStorage.getItem('erp_app_defaults');
    if (saved) appDefaults = { ...appDefaults, ...JSON.parse(saved) };
  } catch(e) {}
}

function saveAppDefaultsToStorage() {
  try { localStorage.setItem('erp_app_defaults', JSON.stringify(appDefaults)); } catch(e) {}
}

function autoSaveProject() {
  try { localStorage.setItem('erp_autosave', JSON.stringify(buildJSONForSave())); } catch(e) {}
}

function loadAutoSave() {
  try {
    const saved = localStorage.getItem('erp_autosave');
    if (!saved) return false;
    const data = JSON.parse(saved);
    if (!data.nodes || !data.spans) return false;
    project.nodes = data.nodes || [];
    project.spans = data.spans || [];
    project.project_meta = data.project_meta || project.project_meta;
    project.overrides = data.overrides || {};
    let maxNode = 0, maxSpan = 0;
    project.nodes.forEach(n => { const m = parseInt(n.id?.split('_')[1])||0; if(m>maxNode) maxNode=m; });
    project.spans.forEach(s => { const m = parseInt(s.id?.split('_')[1])||0; if(m>maxSpan) maxSpan=m; });
    _nodeCounter = maxNode; _spanCounter = maxSpan;
    return true;
  } catch(e) { return false; }
}

function checkLandscape() {
  const wrap = document.getElementById('canvas-wrap');
  const ww = wrap.clientWidth, wh = wrap.clientHeight;
  const newLand = ww > wh * 1.2;
  if (newLand !== isLandscapeMode) {
    isLandscapeMode = newLand;
    A4W = isLandscapeMode ? A4_LAND_W : A4_PORT_W;
    A4H = isLandscapeMode ? A4_LAND_H : A4_PORT_H;
    const sx = (ww - 24) / A4W, sy = (wh - 24) / A4H;
    scale = Math.min(sx, sy);
    panX = (ww - A4W * scale) / 2;
    panY = (wh - A4H * scale) / 2;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
function init() {
  loadAppDefaults();

  const wrap = document.getElementById('canvas-wrap');
  const ww = wrap.clientWidth, wh = wrap.clientHeight;
  checkLandscape();

  const sx = (ww - 24) / A4W, sy = (wh - 24) / A4H;
  scale = Math.min(sx, sy);
  panX = (ww - A4W * scale) / 2;
  panY = (wh - A4H * scale) / 2;

  resizePage();
  setupEvents();

  const hadSave = loadAutoSave();
  renderAll();
  saveState();

  if (hadSave && project.project_meta.subject) {
    updateTitle();
    toast('Auto-save restored: ' + project.project_meta.subject.substring(0, 30));
  } else {
    showProjectSetup();
  }

  // Apply app defaults to new-project meta if no save
  if (!hadSave) {
    project.project_meta.division = appDefaults.division || '';
    project.project_meta.circle   = appDefaults.circle || '';
    project.project_meta.project_type = appDefaults.project_type || 'NSC';
    project.project_meta.use_uh = appDefaults.use_uh || false;
    project.project_meta.supervision_rate = appDefaults.project_type === 'FDS / TURNKEY' ? 0.15 : 0.10;
  }
}

// Ensure the A4 page doesn't get lost out of view
function clampPan() {
  const wrap = document.getElementById('canvas-wrap');
  const maxW = A4W * scale, maxH = A4H * scale;
  const bound = 150; 
  if (panX < -(maxW - bound)) panX = -(maxW - bound);
  if (panX > wrap.clientWidth - bound) panX = wrap.clientWidth - bound;
  if (panY < -(maxH - bound)) panY = -(maxH - bound);
  if (panY > wrap.clientHeight - bound) panY = wrap.clientHeight - bound;
}

function resizePage() {
  clampPan();
  const bg = document.getElementById('page-bg');
  const brd = document.getElementById('page-border');
  bg.style.cssText = `left:${panX}px;top:${panY}px;width:${A4W*scale}px;height:${A4H*scale}px;`;
  brd.style.cssText = `left:${panX-1}px;top:${panY-1}px;width:${A4W*scale+2}px;height:${A4H*scale+2}px;`;
  const svg = document.getElementById('canvas');
  svg.style.cssText = `left:${panX}px;top:${panY}px;width:${A4W*scale}px;height:${A4H*scale}px;`;
  svg.setAttribute('viewBox', `0 0 ${A4W} ${A4H}`);
}

// ═══════════════════════════════════════════════════════════════════
//  TOUCH / MOUSE EVENTS
// ═══════════════════════════════════════════════════════════════════
function setupEvents() {
  const wrap = document.getElementById('canvas-wrap');
  wrap.addEventListener('touchstart', onTouchStart, {passive:false});
  wrap.addEventListener('touchmove', onTouchMove, {passive:false});
  wrap.addEventListener('touchend', onTouchEnd, {passive:false});
  wrap.addEventListener('mousedown', onMouseDown);
  wrap.addEventListener('mousemove', onMouseMove);
  wrap.addEventListener('mouseup', onMouseUp);
}

function getPos(clientX, clientY) {
  const wrap = document.getElementById('canvas-wrap');
  const rect = wrap.getBoundingClientRect();
  const cx = (clientX - rect.left - panX) / scale;
  const cy = (clientY - rect.top - panY) / scale;
  return {x: cx, y: cy};
}

function nodeAt(cx, cy) {
  for (let i = project.nodes.length - 1; i >= 0; i--) {
    const n = project.nodes[i];
    const r = nodeRadius(n) + 10; // Extra padding for easier tap
    if (Math.hypot(cx - n.x, cy - n.y) <= r) return n;
  }
  return null;
}

function spanAt(cx, cy) {
  for (const s of project.spans) {
    const f = project.nodes.find(n => n.id === s.from_id);
    const t = project.nodes.find(n => n.id === s.to_id);
    if (!f || !t) continue;
    
    const l2 = (f.x - t.x)**2 + (f.y - t.y)**2;
    if (l2 === 0) continue;
    
    let t_param = ((cx - f.x) * (t.x - f.x) + (cy - f.y) * (t.y - f.y)) / l2;
    t_param = Math.max(0, Math.min(1, t_param));
    
    const projX = f.x + t_param * (t.x - f.x);
    const projY = f.y + t_param * (t.y - f.y);
    
    if (Math.hypot(cx - projX, cy - projY) < 20) return s; // Generous 20px tolerance
  }
  return null;
}

function nodeRadius(n) {
  if (n.type === 'SmartStructure') return 18;
  if (n.type === 'SmartConsumer') return 10;
  return 14;
}

// ── TOUCH ──
function onTouchStart(e) {
  if (e.touches.length === 2) {
    isPanning = true;
    isDragging = false;
    const t1 = e.touches[0], t2 = e.touches[1];
    pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    panStartX = (t1.clientX + t2.clientX) / 2;
    panStartY = (t1.clientY + t2.clientY) / 2;
    panStartPX = panX; panStartPY = panY;
    return;
  }
  
  if (e.touches.length === 1) {
    if (e.target.closest('.modal') || e.target.closest('#prop-strip') || e.target.closest('.top-btn') || e.target.closest('.tool-btn') || e.target.closest('input') || e.target.closest('textarea')) return; 
    e.preventDefault(); 
    
    const t = e.touches[0];
    touchStartPos = {x: t.clientX, y: t.clientY};
    hasMoved = false;
    const pos = getPos(t.clientX, t.clientY);
    const node = nodeAt(pos.x, pos.y);
    
    if (activeTool === 'SELECT') {
      if (node) {
        // Prepare drag but do NOT render yet to avoid breaking touch gesture
        isDragging = true;
        dragNodeId = node.id;
        dragOffX = pos.x - node.x;
        dragOffY = pos.y - node.y;
      } else {
        isPanning = true;
        panStartX = t.clientX; panStartY = t.clientY;
        panStartPX = panX; panStartPY = panY;
      }
    }
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const t1 = e.touches[0], t2 = e.touches[1];
    const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    const wrap = document.getElementById('canvas-wrap');
    const rect = wrap.getBoundingClientRect();
    
    const ratio = newDist / pinchDist;
    const newScale = Math.max(0.2, Math.min(4, scale * ratio));
    const focusX = midX - rect.left;
    const focusY = midY - rect.top;
    panX = focusX - (focusX - panX) * (newScale / scale);
    panY = focusY - (focusY - panY) * (newScale / scale);
    scale = newScale;
    pinchDist = newDist;
    
    panX += midX - panStartX;
    panY += midY - panStartY;
    panStartX = midX; panStartY = midY;
    
    resizePage();
    return;
  }
  
  if (e.touches.length === 1) {
    if (e.target.closest('.modal')) return;
    e.preventDefault();
    
    const t = e.touches[0];
    if (Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y) > 6) {
      hasMoved = true;
    }
    
    if (isDragging && dragNodeId) {
      const pos = getPos(t.clientX, t.clientY);
      const node = project.nodes.find(n => n.id === dragNodeId);
      if (node) {
        node.x = Math.max(0, Math.min(A4W, pos.x - dragOffX));
        node.y = Math.max(0, Math.min(A4H, pos.y - dragOffY));
        renderAll();
      }
    } else if (isPanning) {
      panX = panStartPX + (t.clientX - panStartX);
      panY = panStartPY + (t.clientY - panStartY);
      resizePage();
      renderAll();
    }
  }
}

function onTouchEnd(e) {
  if (e.target.closest('.modal')) return;
  
  const wasDragging = isDragging;
  isDragging = false;
  dragNodeId = null;
  isPanning = false;
  
  // TAP LOGIC - Handles Spans perfectly now
  if (!hasMoved && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    if (activeTool !== 'SELECT') {
      handleTap(t.clientX, t.clientY);
    } else {
      const pos = getPos(t.clientX, t.clientY);
      const node = nodeAt(pos.x, pos.y);
      const span = spanAt(pos.x, pos.y);
      if (node) selectNode(node.id);
      else if (span) selectNode(span.id);
      else selectNode(null); // Clicked empty space
    }
  } else if (wasDragging && hasMoved) {
    saveState(); // Saved after drag completes
    if (selectedId) buildPropStrip(selectedId);
  }
}

// ── MOUSE (desktop fallback) ──
function onMouseDown(e) {
  if (e.button !== 0 || e.target.closest('.modal') || e.target.closest('#prop-strip') || e.target.closest('.tool-btn') || e.target.closest('.top-btn') || e.target.closest('input') || e.target.closest('textarea')) return;
  touchStartPos = {x: e.clientX, y: e.clientY};
  hasMoved = false;
  
  const pos = getPos(e.clientX, e.clientY);
  const node = nodeAt(pos.x, pos.y);
  
  if (activeTool === 'SELECT') {
    if (node) {
      isDragging = true; dragNodeId = node.id;
      dragOffX = pos.x - node.x; dragOffY = pos.y - node.y;
    } else {
      isPanning = true;
      panStartX = e.clientX; panStartY = e.clientY;
      panStartPX = panX; panStartPY = panY;
    }
  }
}

function onMouseMove(e) {
  if (Math.hypot(e.clientX - touchStartPos.x, e.clientY - touchStartPos.y) > 6) {
    hasMoved = true;
  }
  if (isDragging && dragNodeId) {
    const pos = getPos(e.clientX, e.clientY);
    const node = project.nodes.find(n => n.id === dragNodeId);
    if (node) {
      node.x = Math.max(0, Math.min(A4W, pos.x - dragOffX));
      node.y = Math.max(0, Math.min(A4H, pos.y - dragOffY));
      renderAll();
    }
  } else if (isPanning) {
    panX = panStartPX + (e.clientX - panStartX);
    panY = panStartPY + (e.clientY - panStartY);
    resizePage(); renderAll();
  }
}

function onMouseUp(e) {
  if (e.button !== 0 || e.target.closest('.modal')) return;
  const wasDragging = isDragging;
  isDragging = false; dragNodeId = null; isPanning = false;
  
  if (!hasMoved) {
    if (activeTool !== 'SELECT') {
      handleTap(e.clientX, e.clientY);
    } else {
      const pos = getPos(e.clientX, e.clientY);
      const node = nodeAt(pos.x, pos.y);
      const span = spanAt(pos.x, pos.y);
      if (node) selectNode(node.id);
      else if (span) selectNode(span.id);
      else selectNode(null);
    }
  } else if (wasDragging && hasMoved) {
    saveState();
    if (selectedId) buildPropStrip(selectedId);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  TOOL HANDLING
// ═══════════════════════════════════════════════════════════════════
function setTool(t) {
  activeTool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tool="${t}"]`).classList.add('active');
  
  if (t === 'SELECT' || t === 'ADD_SPAN' || t === 'ADD_CONSUMER') {
    lastAddedNodeId = null;
  }
  
  if (t !== 'ADD_SPAN') { spanFrom = null; hideSpaHint(); }
  if (t !== 'SELECT') { selectNode(null); }
}

function handleTap(clientX, clientY) {
  const pos = getPos(clientX, clientY);
  const cx = Math.max(10, Math.min(A4W-10, pos.x));
  const cy = Math.max(10, Math.min(A4H-10, pos.y));
  const node = nodeAt(cx, cy);

  switch (activeTool) {
    case 'ADD_LT': {
      const newNode = addNode('SmartPole', cx, cy, {pole_type:'LT', pole_type2:appDefaults.lt_mat||'PCC', height:appDefaults.lt_h||8, is_existing:false, earth_count:appDefaults.lt_earth??1, stay_count:appDefaults.lt_stay??0, has_extension:false, dist_box_required:true});
      if (lastAddedNodeId) { addSpan(lastAddedNodeId, newNode.id); renderAll(); }
      lastAddedNodeId = newNode.id; saveState(); autoSaveProject();
      break;
    }
    case 'ADD_HT': {
      const newNode = addNode('SmartPole', cx, cy, {pole_type:'HT', pole_type2:appDefaults.ht_mat||'PCC', height:appDefaults.ht_h||9, is_existing:false, earth_count:1, stay_count:0, has_extension:false});
      if (lastAddedNodeId) { addSpan(lastAddedNodeId, newNode.id); renderAll(); }
      lastAddedNodeId = newNode.id; saveState(); autoSaveProject();
      break;
    }
    case 'ADD_STRUCTURE':
      pendingStructurePos = {x:cx, y:cy};
      document.getElementById('struct-modal').style.display = 'flex';
      break;
    case 'ADD_EXISTING': {
      const newNode = addNode('SmartPole', cx, cy, {pole_type:'LT', pole_type2:'PCC', height:8, is_existing:true, existing_subtype:'LT', earth_count:0, stay_count:0});
      if (lastAddedNodeId) { addSpan(lastAddedNodeId, newNode.id); renderAll(); }
      lastAddedNodeId = newNode.id; saveState(); autoSaveProject();
      break;
    }
    case 'ADD_CONSUMER':
      addConsumer(cx, cy);
      break;
    case 'ADD_SPAN':
      if (!node) { toast('Tap a pole or structure to start span'); return; }
      if (!spanFrom) {
        spanFrom = node.id;
        showSpanHint();
        renderAll();
        toast('Now tap the second pole');
      } else {
        if (spanFrom === node.id) { toast('Tap a different pole'); return; }
        addSpan(spanFrom, node.id);
        spanFrom = null;
        hideSpaHint();
        renderAll();
        saveState(); autoSaveProject();
      }
      break;
  }
}

function addNode(type, x, y, props) {
  const id = `node_${++_nodeCounter}_${Date.now()}`;
  const node = {id, type, x, y, sin_number:`P${_nodeCounter}`, label_offset:[0,-18], ...props};
  project.nodes.push(node);
  selectNode(id);
  renderAll();
  toast(`${type === 'SmartConsumer' ? 'Consumer' : props.pole_type || type} placed`);
  return node;
}

function addConsumer(cx, cy) {
  let nearest = null, minD = 999999;
  for (const n of project.nodes) {
    if (n.type === 'SmartConsumer') continue;
    const d = Math.hypot(n.x - cx, n.y - cy);
    if (d < minD) { minD = d; nearest = n; }
  }
  const id = `node_${++_nodeCounter}_${Date.now()}`;
  const node = {id, type:'SmartConsumer', x:cx, y:cy, phase: appDefaults.sd_phase||'1 Phase', cable_size: appDefaults.sd_cable||'10 SQMM', agency_supply:false, consider_cable:true, parent_id: nearest ? nearest.id : null};
  project.nodes.push(node);
  if (nearest) {
    addSpan(nearest.id, id, {conductor:'Service Drop', conductor_size:'10 SQMM', is_service_drop:true, is_existing_span:false, wire_count:2, aug_type:'New'});
  }
  selectNode(id);
  renderAll();
  saveState();
  toast('Consumer placed');
}

function addSpan(fromId, toId, extraProps={}) {
  const from = project.nodes.find(n => n.id === fromId);
  const to = project.nodes.find(n => n.id === toId);
  if (!from || !to) return;
  
  const isHT = (from.pole_type === 'HT' || to.pole_type === 'HT') ||
               (from.structure_type && to.structure_type);
  const isSD = to.type === 'SmartConsumer' || from.type === 'SmartConsumer';
  const conductor = isSD ? 'Service Drop' : (isHT ? 'ACSR' : 'AB Cable');
  const condSize = isSD ? (appDefaults.sd_cable || '10 SQMM') :
                   isHT  ? (appDefaults.acsr_size || '50SQMM') :
                            (appDefaults.ab_cable_size || '3CX70+1CX16+1CX50');
  
  const id = `span_${++_spanCounter}_${Date.now()}`;
  const span = {
    id, from_id: fromId, to_id: toId,
    conductor, conductor_size: condSize,
    length: extraProps.length || appDefaults.span_len || 40,
    wire_count: isHT ? 3 : 4,
    is_service_drop: isSD, is_existing_span: false,
    aug_type: 'New', has_cg: isHT && !isSD,
    is_lt_span: !isHT, is_ht_span: isHT,
    ...extraProps
  };
  project.spans.push(span);
  return span;
}

function placeStructure(stype) {
  closeModal('struct-modal');
  if (!pendingStructurePos) return;
  const earthMap = {DP:2, TP:3, '4P':4, DTR:5};
  const stayMap  = {DP:4, TP:6, '4P':8, DTR:4};
  
  const newNode = addNode('SmartStructure', pendingStructurePos.x, pendingStructurePos.y, {
    structure_type: stype, pole_type2:'PCC', height:9,
    earth_count: earthMap[stype]||2, stay_count: stayMap[stype]||4,
    has_extension: false,
    dtr_size: stype === 'DTR' ? '100KVA' : 'None',
    dtr_kiosk_required: stype === 'DTR',
  });
  
  if (lastAddedNodeId) { addSpan(lastAddedNodeId, newNode.id); renderAll(); }
  lastAddedNodeId = newNode.id;
  pendingStructurePos = null;
  saveState();
}

// ═══════════════════════════════════════════════════════════════════
//  SELECTION & PROPERTIES
// ═══════════════════════════════════════════════════════════════════
function selectNode(id) {
  selectedId = id;
  renderAll();
  buildPropStrip(id);
}

function buildPropStrip(id) {
  const strip = document.getElementById('prop-strip');
  if (!id) {
    strip.innerHTML = '<span id="prop-hint">Tap an object to edit properties</span>';
    return;
  }
  let obj = project.nodes.find(n => n.id === id);
  let isSpan = false;
  if (!obj) { obj = project.spans.find(s => s.id === id); isSpan = true; }
  if (!obj) { strip.innerHTML = '<span id="prop-hint">Tap an object to edit properties</span>'; return; }

  strip.innerHTML = '';
  const fields = isSpan ? getSpanFields(obj) : getNodeFields(obj);
  
  fields.forEach(f => {
    const div = document.createElement('div');
    div.className = 'prop-field';
    div.innerHTML = `<label>${f.label}</label>`;
    
    if (f.type === 'select') {
      const sel = document.createElement('select');
      f.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value !== undefined ? o.value : o;
        opt.textContent = o.label || o;
        if (String(obj[f.key]) === String(opt.value)) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => { 
        obj[f.key] = f.bool ? (sel.value === 'true') : (f.num ? Number(sel.value) : sel.value);
        if (f.cascade) f.cascade(obj, sel.value, strip, id);
        renderAll();
        saveState();
      };
      div.appendChild(sel);
    } else if (f.type === 'number') {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.value = obj[f.key] || 0;
      inp.min = f.min || 0; inp.max = f.max || 999;
      inp.onchange = () => { obj[f.key] = Number(inp.value); renderAll(); saveState(); };
      div.appendChild(inp);
    } else if (f.type === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.value = obj[f.key] || '';
      inp.onchange = () => { obj[f.key] = inp.value; renderAll(); saveState(); };
      div.appendChild(inp);
    }
    strip.appendChild(div);
  });

  const del = document.createElement('button');
  del.className = 'prop-del-btn';
  del.textContent = '🗑';
  del.title = 'Delete';
  del.onclick = () => deleteSelected(id, isSpan);
  strip.appendChild(del);
}

function getNodeFields(n) {
  const base = [];
  if (n.type === 'SmartPole') {
    if (!n.is_existing) base.push(
      {key:'sin_number', label:'SIN No.', type:'text'},
      {key:'pole_type', label:'Type', type:'select', options:['LT','HT']},
      {key:'pole_type2', label:'Material', type:'select', options:['PCC','STP','H-BEAM'],
        cascade:(obj, val, strip, id) => { obj.height = val==='PCC'?8:val==='STP'?9:13; buildPropStrip(id); }
      },
      {key:'height', label:'Height', type:'select', num:true,
        options: n.pole_type2==='PCC'?[{value:8,label:'8MTR'},{value:9,label:'9MTR'}]:
                 n.pole_type2==='STP'?[{value:9,label:'9MTR'},{value:9.5,label:'9.5MTR'},{value:11,label:'11MTR'}]:
                 [{value:13,label:'13MTR'}]},
      {key:'earth_count', label:'Earths', type:'select', num:true, options:[0,1,2,3].map(v=>({value:v,label:v}))},
      {key:'stay_count', label:'Stays', type:'select', num:true, options:[0,1,2,3,4].map(v=>({value:v,label:v}))},
    );
    else base.push(
      {key:'sin_number', label:'SIN No.', type:'text'},
      {key:'existing_subtype', label:'Ex. Type', type:'select', options:['LT','HT','DP','TP','4P','DTR']},
    );
    base.push({key:'is_existing', label:'Is Existing', type:'select', bool:true, options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]});
    base.push({key:'has_extension', label:'Extension', type:'select', bool:true, options:[{value:'false',label:'No'},{value:'true',label:'+3m Ext'}]});
  } else if (n.type === 'SmartStructure') {
    base.push(
      {key:'structure_type', label:'Type', type:'select', options:['DP','TP','4P','DTR']},
      {key:'pole_type2', label:'Material', type:'select', options:['PCC','STP','H-BEAM']},
      {key:'height', label:'Height', type:'select', num:true,
        options:[{value:9,label:'9MTR'},{value:9.5,label:'9.5MTR'},{value:11,label:'11MTR'},{value:13,label:'13MTR'}]},
      {key:'earth_count', label:'Earths', type:'select', num:true, options:[0,1,2,3,4,5,6].map(v=>({value:v,label:v}))},
      {key:'stay_count', label:'Stays', type:'select', num:true, options:[0,2,4,6,8].map(v=>({value:v,label:v}))},
    );
    if (n.structure_type === 'DTR') {
      base.push({key:'dtr_size', label:'DTR Size', type:'select', options:['10KVA','16KVA','25KVA','63KVA','100KVA','200KVA','315KVA','630KVA']});
    }
  } else if (n.type === 'SmartConsumer') {
    base.push(
      {key:'phase', label:'Phase', type:'select', options:['1 Phase','3 Phase']},
      {key:'cable_size', label:'Cable', type:'select',
        options: n.phase==='1 Phase'?['10 SQMM','16 SQMM']:['10 SQMM','16 SQMM','25 SQMM','50 SQMM']},
      {key:'agency_supply', label:'Agency Supply', type:'select', bool:true, options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]},
      {key:'consider_cable', label:'Include Cable', type:'select', bool:true, options:[{value:'true',label:'Yes'},{value:'false',label:'No'}]},
    );
  }
  return base;
}

function getSpanFields(s) {
  const conductorOpts = s.is_service_drop ? ['Service Drop'] :
    s.is_ht_span ? ['ACSR','AB Cable','PVC Cable'] : ['AB Cable','ACSR','PVC Cable'];
  
  const sizeMap = {
    'ACSR': ['30SQMM','50SQMM'],
    'AB Cable': s.is_ht_span ? ['3CX50+1CX150','3CX95+1CX70'] : ['3CX50+1CX35','3CX50+1CX16+1CX35','3CX70+1CX16+1CX50'],
    'PVC Cable': ['10 SQMM','16 SQMM','25 SQMM','50 SQMM','95 SQMM','120 SQMM'],
    'Service Drop': ['10 SQMM','16 SQMM','25 SQMM','50 SQMM'],
  };
  return [
    {key:'conductor', label:'Conductor', type:'select', options: conductorOpts,
      cascade:(obj, val, strip, id) => { obj.conductor_size = (sizeMap[val]||['10 SQMM'])[0]; buildPropStrip(id); }
    },
    {key:'conductor_size', label:'Size', type:'select', options: sizeMap[s.conductor]||['10 SQMM']},
    {key:'length', label:'Length(m)', type:'number', min:1, max:2000},
    {key:'wire_count', label:'Wires', type:'select', options:[{value:2,label:'2W'},{value:3,label:'3W'},{value:4,label:'4W'}], num:true},
    {key:'is_existing_span', label:'Existing', type:'select', bool:true, options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]},
    {key:'has_cg', label:'CG Bracket', type:'select', bool:true, options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]},
    {key:'aug_type', label:'Aug. Type', type:'select', options:['New','Add-on 2W','Replace 2W->4W']},
  ];
}

function deleteSelected(id, isSpan) {
  if (isSpan) {
    project.spans = project.spans.filter(s => s.id !== id);
  } else {
    project.nodes = project.nodes.filter(n => n.id !== id);
    project.spans = project.spans.filter(s => s.from_id !== id && s.to_id !== id);
  }
  selectNode(null);
  renderAll();
  saveState();
  toast('Deleted');
}

// ═══════════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════════
function renderAll() {
  renderSpans();
  renderNodes();
}

function nodeClass(n) {
  if (n.type === 'SmartConsumer') return 'node-consumer';
  if (n.is_existing) return 'node-ex';
  if (n.type === 'SmartStructure') {
    return {DP:'node-dp',TP:'node-tp','4P':'node-4p',DTR:'node-dtr'}[n.structure_type] || 'node-dp';
  }
  return n.pole_type === 'HT' ? 'node-ht' : 'node-lt';
}

function nodeLabel(n) {
  if (n.type === 'SmartConsumer') return '🏠';
  if (n.type === 'SmartStructure') return n.structure_type || 'S';
  if (n.is_existing) return 'EX';
  return n.pole_type || 'P';
}

function renderNodes() {
  const layer = document.getElementById('nodes-layer');
  const lblLayer = document.getElementById('labels-layer');
  layer.innerHTML = '';
  lblLayer.innerHTML = '';
  
  for (const n of project.nodes) {
    const cls = nodeClass(n);
    const r = nodeRadius(n);
    const isSel = n.id === selectedId;
    
    let shape = '';
    if (n.type === 'SmartConsumer') {
      shape = `<polygon class="${cls}" points="${n.x},${n.y-r} ${n.x+r},${n.y} ${n.x+r},${n.y+r} ${n.x-r},${n.y+r} ${n.x-r},${n.y}"/>
               <text class="node-label" x="${n.x}" y="${n.y+4}">C</text>`;
    } else if (n.type === 'SmartStructure') {
      const {structure_type:st} = n;
      if (st === 'DTR') {
        shape = `<rect class="${cls}" x="${n.x-r}" y="${n.y-r*.7}" width="${r*2}" height="${r*1.4}" rx="4"/>
                 <text class="node-label" x="${n.x}" y="${n.y}">DTR</text>`;
      } else {
        const offsets = st==='DP'?[[-8,0],[8,0]]:st==='TP'?[[0,-9],[8,6],[-8,6]]:[[-8,-8],[8,-8],[-8,8],[8,8]];
        shape = offsets.map(([ox,oy]) => `<circle class="${cls}" cx="${n.x+ox}" cy="${n.y+oy}" r="9"/>`).join('') + 
                `<text class="node-label" x="${n.x}" y="${n.y+3}" style="font-size:7px">${st}</text>`;
      }
    } else {
      shape = `<circle class="${cls}" cx="${n.x}" cy="${n.y}" r="${r}"/>
               <text class="node-label" x="${n.x}" y="${n.y+1}">${nodeLabel(n)}</text>`;
    }
    
    if (isSel) {
      layer.innerHTML += `<circle class="selected-ring" cx="${n.x}" cy="${n.y}" r="${r+5}"/>`;
    }
    if (n.id === spanFrom) {
      layer.innerHTML += `<circle fill="none" stroke="#2ecc71" stroke-width="3" stroke-dasharray="5,3" cx="${n.x}" cy="${n.y}" r="${r+5}"/>`;
    }
    
    layer.innerHTML += shape;
    
    if (n.sin_number && n.type !== 'SmartConsumer') {
      const [lx, ly] = n.label_offset || [0, -22];
      lblLayer.innerHTML += `<text class="pole-label" x="${n.x+lx}" y="${n.y+ly}">${n.sin_number}</text>`;
    }
    if (n.stay_count > 0 && n.type !== 'SmartConsumer') {
      lblLayer.innerHTML += `<text style="fill:#888;font-size:8px;text-anchor:middle" x="${n.x}" y="${n.y+r+9}">${n.stay_count}S</text>`;
    }
    if (n.has_extension) {
      lblLayer.innerHTML += `<line x1="${n.x}" y1="${n.y-r}" x2="${n.x}" y2="${n.y-r-10}" stroke="#e67e22" stroke-width="2"/>`;
    }
  }
}

function renderSpans() {
  const layer = document.getElementById('spans-layer');
  layer.innerHTML = '';
  
  for (const s of project.spans) {
    const from = project.nodes.find(n => n.id === s.from_id);
    const to   = project.nodes.find(n => n.id === s.to_id);
    if (!from || !to) continue;
    
    const isSel = s.id === selectedId;
    const cls = s.is_service_drop ? 'span-sd' : s.is_existing_span ? 'span-ex' : s.is_ht_span ? 'span-ht' : 'span-lt';
    
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    
    let line = `<line class="${cls}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" style="stroke-width:${isSel?5:s.is_ht_span?3:2.5}"/>`;
    
    if (isSel) {
      line = `<line stroke="#f39c12" stroke-width="8" stroke-opacity="0.4" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>` + line;
    }
    
    if (s.has_cg) {
      line += `<circle cx="${mx}" cy="${my}" r="5" fill="none" stroke="#e67e22" stroke-width="1.5"/>
               <text x="${mx}" y="${my+3}" style="fill:#e67e22;font-size:7px;text-anchor:middle">CG</text>`;
    }
    
    const len = s.length || 40;
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    const normAngle = (angle + 360) % 360;
    const loy = -6;
    line += `<text class="span-label" transform="translate(${mx},${my}) rotate(${angle > 90 || angle < -90 ? angle+180 : angle})" y="${loy}">${len}m ${s.conductor||''}</text>`;
    
    layer.innerHTML += line;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROJECT SETUP
// ═══════════════════════════════════════════════════════════════════
function showProjectSetup() {
  const m = project.project_meta;
  document.getElementById('p-subject').value = m.subject || '';
  document.getElementById('p-lat').value = m.lat || '';
  document.getElementById('p-lon').value = m.long || '';
  document.getElementById('p-division').value = m.division || '';
  document.getElementById('p-circle').value = m.circle || '';
  document.getElementById('p-type').value = m.project_type || 'NSC';
  document.getElementById('p-uh').value = m.use_uh ? 'true' : 'false';
  document.getElementById('proj-modal').style.display = 'flex';
}

function saveProject() {
  const subj = document.getElementById('p-subject').value.trim();
  if (!subj) { alert('Please enter a project name.'); return; }
  const ptype = document.getElementById('p-type').value;
  project.project_meta = {
    subject: subj,
    lat: document.getElementById('p-lat').value.trim(),
    long: document.getElementById('p-lon').value.trim(),
    division: document.getElementById('p-division').value.trim(),
    circle: document.getElementById('p-circle').value.trim(),
    project_type: ptype,
    use_uh: document.getElementById('p-uh').value === 'true',
    supervision_rate: ptype === 'NSC' ? 0.10 : 0.15,
  };
  closeModal('proj-modal');
  toast('Project settings saved ✓');
  updateTitle();
  saveState();
  autoSaveProject();
}

// ═══════════════════════════════════════════════════════════════════
//  SHARE / EXPORT / PDF BUNDLE
// ═══════════════════════════════════════════════════════════════════
// Internal save (keeps web format for autosave/reload)
function buildJSONForSave() {
  return {
    version: 7,
    project_meta: project.project_meta,
    overrides: project.overrides,
    nodes: project.nodes.map(n => { const e = {...n}; delete e.label_offset; return e; }),
    spans: project.spans.map(s => { const sp = {...s}; if (!sp.length || sp.length < 1) sp.length = 40; return sp; }),
  };
}

// Desktop-compatible JSON export — matches desktop app's parse_load_data() schema exactly
function buildJSON() {
  const nodeIdMap = {}; // web string id → integer index

  const exportNodes = project.nodes.map((n, idx) => {
    nodeIdMap[n.id] = idx;
    const heightStr = (v) => {
      const h = parseFloat(v);
      if (h === 8)   return '8MTR';
      if (h === 9)   return '9MTR';
      if (h === 9.5) return '9.5MTR';
      if (h === 11)  return '11MTR';
      if (h === 13)  return '13MTR';
      return `${h}MTR`;
    };
    const label = n.sin_number || `P${idx+1}`;
    const base = {
      id: idx,
      x: Math.round(n.x * 10) / 10,
      y: Math.round(n.y * 10) / 10,
      label_x: 0, label_y: -22,
      label_text: label,
      custom_note: '',
      dynamic_props: {},
    };
    if (n.type === 'SmartPole') {
      return { ...base,
        type: 'Pole',
        seq_id: idx + 1,
        pole_type: n.pole_type || 'LT',
        pole_type2: n.pole_type2 || 'PCC',
        is_existing: !!n.is_existing,
        existing_subtype: n.existing_subtype || n.pole_type || 'LT',
        existing_dtr_size: 'None',
        height: heightStr(n.height || (n.pole_type === 'HT' ? 9 : 8)),
        has_extension: !!n.has_extension,
        extension_height: 3.0,
        earth_count: n.earth_count ?? 1,
        stay_count: n.stay_count ?? 0,
        override_auto_stay: false,
        stay_angle_override: null,
        earth_angle_override: null,
        dist_box_required: !!n.dist_box_required,
        iron_recipe: 'None',
      };
    } else if (n.type === 'SmartStructure') {
      const ironMap = {DP:'DP_IRON', TP:'TP_IRON', '4P':'4P_IRON', DTR:'DTR_IRON'};
      return { ...base,
        type: 'Structure',
        seq_id: idx + 1,
        structure_type: n.structure_type || 'DP',
        pole_type2: n.pole_type2 || 'PCC',
        height: heightStr(n.height || 9),
        orientation: 'Horizontal',
        has_extension: !!n.has_extension,
        extension_height: 3.0,
        earth_count: n.earth_count ?? 2,
        stay_count: n.stay_count ?? 4,
        dtr_size: n.dtr_size || 'None',
        kiosk_required: !!n.dtr_kiosk_required,
        iron_recipe: ironMap[n.structure_type] || 'DP_IRON',
      };
    } else if (n.type === 'SmartConsumer') {
      return { ...base,
        type: 'Consumer',
        seq_id: idx + 1,
        phase: n.phase || '3 Phase',
        cable_size: n.cable_size || '10 SQMM',
        agency_supply: !!n.agency_supply,
        consider_cable: !!n.consider_cable,
      };
    }
    return base;
  });

  const exportSpans = project.spans.map(s => {
    const p1idx = nodeIdMap[s.from_id] ?? 0;
    const p2idx = nodeIdMap[s.to_id] ?? 0;
    return {
      p1_id: p1idx,
      p2_id: p2idx,
      length: s.length && s.length >= 1 ? s.length : 40,
      conductor: s.conductor || 'AB Cable',
      conductor_size: s.conductor_size || '3CX50+1CX16+1CX35',
      wire_count: String(s.wire_count || 4),
      aug_type: s.aug_type || 'New',
      has_cg: !!s.has_cg,
      is_service_drop: !!s.is_service_drop,
      consider_cable: !!s.consider_cable,
      phase: s.phase || '3 Phase',
      custom_note: '',
      dynamic_props: {},
      label_x: 0, label_y: 0, label_text: '',
    };
  });

  return {
    version: 7,
    project_meta: { ...project.project_meta },
    overrides: project.overrides || {},
    nodes: exportNodes,
    spans: exportSpans,
    annotations: [],
    _generated_by: 'ERP Field Companion (Web)',
    _generated_at: new Date().toISOString(),
  };
}

function showShare() {
  const newPoles = project.nodes.filter(n => n.type === 'SmartPole' && !n.is_existing).length;
  const exPoles  = project.nodes.filter(n => n.type === 'SmartPole' && n.is_existing).length;
  const structs  = project.nodes.filter(n => n.type === 'SmartStructure').length;
  const consumers = project.nodes.filter(n => n.type === 'SmartConsumer').length;
  const spans    = project.spans.filter(s => !s.is_service_drop).length;
  const sdCount  = project.spans.filter(s => s.is_service_drop).length;
  const meta = project.project_meta;
  document.getElementById('share-summary').innerHTML =
    `<strong>${meta.subject || '(No project name)'}</strong><br>` +
    `${meta.division||'—'} | ${meta.circle||'—'} | ${meta.project_type} | UH: ${meta.use_uh?'Yes':'No'}<br>` +
    `<span style="color:#185FA5">${newPoles} new poles</span> · ${exPoles} existing · ${structs} structures · ${consumers} consumers · ${spans} spans · ${sdCount} service drops`;
  document.getElementById('share-modal').style.display = 'flex';
}

function getFilename(ext) {
  const sub = (project.project_meta.subject || 'erp_project').replace(/[^a-z0-9]/gi,'_').substring(0,30);
  return `${sub}_${new Date().toISOString().slice(0,10)}${ext}`;
}

function downloadJSON() {
  const data = JSON.stringify(buildJSON(), null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = getFilename('.json'); a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded JSON ✓');
}

// Build legend data from current nodes/spans
function buildLegendData() {
  const ld = {
    'LT Pole': 0, 'HT Pole': 0,
    'DP': 0, 'TP': 0, '4P': 0, 'DTR': 0,
    'Existing': 0, 'Consumer': 0, 'Extension': 0,
    'Earthing': 0, 'Stay': 0,
    'AB Cable': 0, 'ACSR': 0, 'Service Drop': 0, 'Existing Span': 0,
  };
  for (const n of project.nodes) {
    if (n.type === 'SmartPole') {
      if (n.is_existing) ld['Existing']++;
      else if (n.pole_type === 'HT') ld['HT Pole']++;
      else ld['LT Pole']++;
      ld['Earthing'] += n.earth_count || 0;
      ld['Stay'] += n.stay_count || 0;
      if (n.has_extension) ld['Extension']++;
    } else if (n.type === 'SmartStructure') {
      const k = n.structure_type;
      if (ld[k] !== undefined) ld[k]++;
      ld['Earthing'] += n.earth_count || 0;
      ld['Stay'] += n.stay_count || 0;
      if (n.has_extension) ld['Extension']++;
    } else if (n.type === 'SmartConsumer') {
      ld['Consumer']++;
    }
  }
  for (const s of project.spans) {
    if (s.is_service_drop) { ld['Service Drop']++; continue; }
    if (s.is_existing_span) { ld['Existing Span'] += (s.length || 0); continue; }
    const cond = s.conductor || 'AB Cable';
    if (cond === 'ACSR') ld['ACSR'] += (s.length || 0);
    else ld['AB Cable'] += (s.length || 0);
  }
  return ld;
}

function buildLegendHTML(ld) {
  const SYMS = {
    'LT Pole':'🔵','HT Pole':'🔴','DP':'🟩 DP','TP':'🟩 TP','4P':'🟩 4P','DTR':'🟠',
    'Existing':'⚪','Consumer':'🏠','Extension':'[E]','Earthing':'⏚','Stay':'S',
    'AB Cable':'~~~','ACSR':'---','Service Drop':'--↘','Existing Span':'—·—',
  };
  let items = '';
  for (const [k, v] of Object.entries(ld)) {
    if (!v) continue;
    const isLen = ['AB Cable','ACSR','Existing Span'].includes(k);
    const val = isLen ? `${v}m` : `×${v}`;
    items += `<div class="leg-item"><span class="leg-sym">${SYMS[k]||'•'}</span><span>${k}</span><span class="leg-val">${val}</span></div>`;
  }
  return items;
}


// Draw the entire project directly onto a jsPDF instance as vector graphics.
// dx/dy = top-left of drawing area in PDF points; dw/dh = size in points.
function renderDrawingToJsPDF(pdf, dx, dy, dw, dh) {
  const sx = dw / A4W;
  const sy = dh / A4H;
  const px = (cx) => dx + cx * sx;
  const py = (cy) => dy + cy * sy;
  const pr = (r)  => r * Math.min(sx, sy);

  // White background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(dx, dy, dw, dh, 'F');

  // ── Spans (drawn first, behind nodes) ─────────────────────────
  for (const s of project.spans) {
    const f = project.nodes.find(n => n.id === s.from_id);
    const t = project.nodes.find(n => n.id === s.to_id);
    if (!f || !t) continue;
    let r, g, b;
    if      (s.is_service_drop)  { r=142; g=68;  b=173; }
    else if (s.is_existing_span) { r=153; g=153; b=153; }
    else if (s.is_ht_span)       { r=192; g=57;  b=43;  }
    else                         { r=41;  g=128; b=185; }
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(s.is_ht_span ? pr(3) : pr(2.5));
    if      (s.is_service_drop)  pdf.setLineDashPattern([pr(4), pr(3)], 0);
    else if (s.is_existing_span) pdf.setLineDashPattern([pr(6), pr(4)], 0);
    else                         pdf.setLineDashPattern([], 0);
    pdf.line(px(f.x), py(f.y), px(t.x), py(t.y));
    // span length label
    const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
    const angle = Math.atan2(t.y - f.y, t.x - f.x) * 180 / Math.PI;
    const labelAngle = (angle > 90 || angle < -90) ? angle + 180 : angle;
    pdf.setLineDashPattern([], 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(Math.max(4, pr(16)));
    pdf.setTextColor(106, 116, 149);
    pdf.text(`${s.length||40}m`, px(mx), py(my) - pr(7), { align: 'center', angle: labelAngle });
  }
  pdf.setLineDashPattern([], 0);

  // ── Nodes ──────────────────────────────────────────────────────
  for (const n of project.nodes) {
    const nx = px(n.x), ny = py(n.y);
    let fr, fg, fb, sr, sg, sb;
    if (n.type === 'SmartConsumer')      { fr=142; fg=68;  fb=173; sr=106; sg=32;  sb=144; }
    else if (n.is_existing)              { fr=153; fg=153; fb=153; sr=102; sg=102; sb=102; }
    else if (n.type === 'SmartStructure') {
      if      (n.structure_type==='DP') { fr=39;  fg=174; fb=96;  sr=26;  sg=107; sb=42;  }
      else if (n.structure_type==='TP') { fr=26;  fg=188; fb=156; sr=14;  sg=122; sb=98;  }
      else if (n.structure_type==='4P') { fr=22;  fg=160; fb=133; sr=10;  sg=80;  sb=64;  }
      else                              { fr=230; fg=126; fb=34;  sr=154; sg=69;  sb=0;   }
    } else if (n.pole_type === 'HT')     { fr=192; fg=57;  fb=43;  sr=139; sg=26;  sb=26;  }
    else                                 { fr=41;  fg=128; fb=185; sr=26;  sg=95;  sb=138; }

    pdf.setFillColor(fr, fg, fb);
    pdf.setDrawColor(sr, sg, sb);
    pdf.setLineWidth(pr(1.5));

    if (n.type === 'SmartConsumer') {
      pdf.circle(nx, ny, pr(10), 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(Math.max(4, pr(18)));
      pdf.setTextColor(255, 255, 255);
      pdf.text('C', nx, ny + pr(3.5), { align: 'center' });
    } else if (n.type === 'SmartStructure') {
      if (n.structure_type === 'DTR') {
        const rw = pr(36), rh = pr(25);
        pdf.rect(nx - rw/2, ny - rh/2, rw, rh, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(Math.max(4, pr(14)));
        pdf.setTextColor(255, 255, 255);
        pdf.text('DTR', nx, ny + pr(3), { align: 'center' });
      } else {
        const offs = n.structure_type==='DP' ? [[-8,0],[8,0]]
                   : n.structure_type==='TP' ? [[0,-9],[8,6],[-8,6]]
                   :                           [[-8,-8],[8,-8],[-8,8],[8,8]];
        for (const [ox, oy] of offs) pdf.circle(nx + pr(ox), ny + pr(oy), pr(9), 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(Math.max(4, pr(13)));
        pdf.setTextColor(255, 255, 255);
        pdf.text(n.structure_type, nx, ny + pr(3), { align: 'center' });
      }
    } else {
      pdf.circle(nx, ny, pr(14), 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(Math.max(4, pr(18)));
      pdf.setTextColor(255, 255, 255);
      pdf.text(n.is_existing ? 'EX' : (n.pole_type || 'P'), nx, ny + pr(3.5), { align: 'center' });
    }

    // SIN label above node
    if (n.sin_number && n.type !== 'SmartConsumer') {
      const [lx, ly] = n.label_offset || [0, -22];
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(Math.max(4, pr(17)));
      pdf.setTextColor(51, 51, 51);
      pdf.text(n.sin_number, px(n.x + lx), py(n.y + ly), { align: 'center' });
    }
  }
}

// Generate PDF: 100% vector — no rasterization, ~100-300 KB, perfect quality.
async function sharePDF() {
  closeModal('share-modal');
  toast('Generating PDF… please wait');

  try {
    const meta  = project.project_meta;
    const fname = getFilename('.pdf');

    const jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFLib) throw new Error('jsPDF library not loaded — check internet connection');

    const pdf  = new jsPDFLib({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();   // 595.28 pt
    const pdfH = pdf.internal.pageSize.getHeight();  // 841.89 pt
    const margin = 12;

    // ── Header ────────────────────────────────────────────────────
    const headerH = 44;
    pdf.setFillColor(12, 68, 124);
    pdf.rect(0, 0, pdfW, headerH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text((meta.subject || 'ERP Project').substring(0, 80), 16, 19);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(210, 225, 245);
    pdf.text(
      `${meta.division||'—'} | ${meta.circle||'—'} | ${meta.project_type||'NSC'} | UH: ${meta.use_uh?'Yes':'No'} | ${new Date().toLocaleDateString('en-IN')}`,
      16, 34
    );

    // ── Legend dimensions (computed first so we can size drawing area) ──
    const ld = buildLegendData();
    const LCOLS = {
      'LT Pole':[41,128,185],'HT Pole':[192,57,43],'DP':[39,174,96],'TP':[26,188,156],
      '4P':[22,160,133],'DTR':[230,126,34],'Existing':[153,153,153],'Consumer':[142,68,173],
      'Extension':[230,126,34],'Earthing':[80,80,80],'Stay':[80,80,80],
      'AB Cable':[41,128,185],'ACSR':[192,57,43],'Service Drop':[142,68,173],'Existing Span':[153,153,153],
    };
    const legEntries = [];
    for (const [k, v] of Object.entries(ld)) {
      if (!v) continue;
      const isLen = ['AB Cable','ACSR','Existing Span'].includes(k);
      legEntries.push({ label: k, col: LCOLS[k]||[60,60,60], val: isLen ? `${v} m` : `×${v}` });
    }
    const legLineH = 10, legPad = 7, legTitleH = 13, legW = 148;
    const legH = legEntries.length > 0 ? legTitleH + legPad * 2 + legEntries.length * legLineH : 0;
    const legX = pdfW - legW - margin;
    const legY = pdfH - legH - margin;

    // ── Drawing area (fills page below header, to bottom margin) ──
    const drawTop = headerH + margin;
    const drawW   = pdfW - margin * 2;
    const drawH   = pdfH - drawTop - margin;
    const ratio   = A4W / A4H;
    let dw = drawW, dh = drawW / ratio;
    if (dh > drawH) { dh = drawH; dw = drawH * ratio; }
    const dx = (pdfW - dw) / 2;
    const dy = drawTop;

    renderDrawingToJsPDF(pdf, dx, dy, dw, dh);

    // Drawing border
    pdf.setDrawColor(176, 188, 212);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([], 0);
    pdf.rect(dx, dy, dw, dh);

    // ── Legend box (bottom-right, over drawing) ───────────────────
    if (legEntries.length > 0) {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(12, 68, 124);
      pdf.setLineWidth(0.7);
      pdf.rect(legX, legY, legW, legH, 'FD');

      pdf.setFillColor(12, 68, 124);
      pdf.rect(legX, legY, legW, legTitleH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('LEGEND', legX + legPad, legY + legTitleH - 4);

      let ly = legY + legTitleH + legPad;
      for (const e of legEntries) {
        pdf.setFillColor(e.col[0], e.col[1], e.col[2]);
        pdf.circle(legX + legPad + 2.5, ly - 2.2, 2.5, 'F');
        pdf.setTextColor(30, 30, 30);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text(e.label, legX + legPad + 9, ly);
        pdf.setTextColor(80, 80, 80);
        pdf.text(e.val, legX + legW - legPad, ly, { align: 'right' });
        ly += legLineH;
      }
    }

    // ── Output ────────────────────────────────────────────────────
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fname, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: meta.subject || 'ERP Drawing' });
        toast('PDF shared ✓');
        return;
      } catch (_) { /* fall through to download */ }
    }

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('PDF downloaded ✓');

  } catch (err) {
    console.error('sharePDF error:', err);
    toast('PDF error: ' + (err.message || err));
  }
}

function shareJSON() {
  const data = JSON.stringify(buildJSON(), null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const file = new File([blob], getFilename('.json'), {type:'application/json'});
  if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
    navigator.share({ files:[file], title: project.project_meta.subject || 'ERP Project', text: 'ERP Project JSON' })
      .then(() => toast('JSON shared ✓'))
      .catch(() => { downloadJSON(); });
  } else { downloadJSON(); }
}

function copyJSONText() {
  const data = JSON.stringify(buildJSON(), null, 2);
  navigator.clipboard.writeText(data).then(() => toast('Copied to clipboard ✓')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = data; document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('Copied ✓');
  });
}

function newProject() {
  if (!confirm('Start a new project? Current drawing will be lost.')) return;
  const supRate = appDefaults.project_type === 'FDS / TURNKEY' ? 0.15 : 0.10;
  project = {version:7, project_meta:{
    subject:'', lat:'', long:'',
    division: appDefaults.division || '', circle: appDefaults.circle || '',
    project_type: appDefaults.project_type || 'NSC',
    use_uh: appDefaults.use_uh || false,
    supervision_rate: supRate
  }, overrides:{}, nodes:[], spans:[]};
  _nodeCounter = 0; _spanCounter = 0; selectedId = null; spanFrom = null; lastAddedNodeId = null;
  historyStack = []; historyIndex = -1;
  renderAll(); buildPropStrip(null);
  saveState();
  closeModal('share-modal');
  showProjectSetup();
}

// ═══════════════════════════════════════════════════════════════════
//  IMPORT
// ═══════════════════════════════════════════════════════════════════
function importJSON() {
  document.getElementById('import-modal').style.display = 'flex';
}

function loadJSONFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.nodes || !data.spans) throw new Error('Invalid file — missing nodes/spans');

      const isDesktopFormat = data.nodes.length > 0 && typeof data.nodes[0].id === 'number';

      if (isDesktopFormat) {
        // Convert desktop format → web format
        const nodeIdMap = {};
        project.nodes = data.nodes.map((nd, idx) => {
          const webId = `node_${idx+1}_imported`;
          nodeIdMap[nd.id] = webId;
          const heightNum = (hs) => parseFloat((hs||'').replace('MTR','')) || 8;
          const base = { id: webId, sin_number: nd.label_text || nd.sin_number || `P${idx+1}`, label_offset:[0,-18] };
          if (nd.type === 'Pole') {
            return { ...base, type:'SmartPole',
              x: nd.x, y: nd.y,
              pole_type: nd.pole_type || 'LT',
              pole_type2: nd.pole_type2 || 'PCC',
              height: heightNum(nd.height),
              is_existing: !!nd.is_existing,
              existing_subtype: nd.existing_subtype || nd.pole_type || 'LT',
              earth_count: nd.earth_count ?? 1,
              stay_count: nd.stay_count ?? 0,
              has_extension: !!nd.has_extension,
              dist_box_required: !!nd.dist_box_required,
            };
          } else if (nd.type === 'Structure') {
            return { ...base, type:'SmartStructure',
              x: nd.x, y: nd.y,
              structure_type: nd.structure_type || 'DP',
              pole_type2: nd.pole_type2 || 'PCC',
              height: heightNum(nd.height),
              earth_count: nd.earth_count ?? 2,
              stay_count: nd.stay_count ?? 4,
              has_extension: !!nd.has_extension,
              dtr_size: nd.dtr_size || 'None',
              dtr_kiosk_required: !!nd.kiosk_required,
            };
          } else if (nd.type === 'Consumer' || nd.type === 'Home') {
            return { ...base, type:'SmartConsumer',
              x: nd.x, y: nd.y,
              phase: nd.phase || '3 Phase',
              cable_size: nd.cable_size || '10 SQMM',
              agency_supply: !!nd.agency_supply,
              consider_cable: !!nd.consider_cable,
              parent_id: null,
            };
          }
          return { ...base, type:'SmartPole', x:nd.x, y:nd.y, pole_type:'LT', pole_type2:'PCC', height:8, is_existing:false };
        });
        project.spans = data.spans.map((sd, idx) => {
          const fromId = nodeIdMap[sd.p1_id];
          const toId   = nodeIdMap[sd.p2_id];
          if (!fromId || !toId) return null;
          return {
            id: `span_${idx+1}_imported`,
            from_id: fromId, to_id: toId,
            conductor: sd.conductor || 'AB Cable',
            conductor_size: sd.conductor_size || '3CX50+1CX16+1CX35',
            length: sd.length || 40,
            wire_count: parseInt(sd.wire_count) || 4,
            is_service_drop: !!sd.is_service_drop,
            is_existing_span: false,
            aug_type: sd.aug_type || 'New',
            has_cg: !!sd.has_cg,
            is_lt_span: true, is_ht_span: false,
          };
        }).filter(Boolean);
        _nodeCounter = project.nodes.length;
        _spanCounter = project.spans.length;
      } else {
        // Web format — load directly
        project.nodes = data.nodes || [];
        project.spans = data.spans || [];
        let maxNode = 0, maxSpan = 0;
        project.nodes.forEach(n => { const m = parseInt(n.id?.split('_')[1])||0; if(m>maxNode) maxNode=m; });
        project.spans.forEach(s => { const m = parseInt(s.id?.split('_')[1])||0; if(m>maxSpan) maxSpan=m; });
        _nodeCounter = maxNode; _spanCounter = maxSpan;
      }

      project.project_meta = data.project_meta || project.project_meta;
      project.overrides = data.overrides || {};
      historyStack = []; historyIndex = -1;
      renderAll(); buildPropStrip(null); updateTitle();
      saveState(); autoSaveProject();
      closeModal('import-modal');
      toast(`Loaded: ${project.nodes.length} nodes, ${project.spans.length} spans`);
    } catch(err) {
      alert('Could not load file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function showSpanHint() { document.getElementById('span-hint').style.display = 'block'; }
function hideSpaHint() { document.getElementById('span-hint').style.display = 'none'; }


// ═══════════════════════════════════════════════════════════════════
//  EMBEDDED RATES & RULES (Phase 2)
// ═══════════════════════════════════════════════════════════════════
function evalFormula(formula, ctx) {
  const RECIPE_KEYS = ['recipe','AB_CABLE_CLAMP','LT_ACSR_BRACKET','CG_BRACKET','POLE_HT_EXT','POLE_LT_EXT','HT_JUNCTION'];
  if (RECIPE_KEYS.includes(formula)) return -2; // Signal: use iron fallback (not -1 placeholder)
  try {
    const js = formula.replace(/\bTrue\b/g,'true').replace(/\bFalse\b/g,'false').replace(/\bint\(/g,'Math.trunc(');
    const fn = new Function(...Object.keys(ctx), `return (${js});`);
    const r = fn(...Object.values(ctx));
    return typeof r === 'number' ? Math.round(r * 10000) / 10000 : 0;
  } catch(e) { return 0; }
}

function runRuleEngine() {
  const bom = {}; // code/name -> {code, name, type, qty, rate, unit}
  function addItem(code, name, type, qty) {
    if (qty <= 0) return;
    const key = code || name;
    if (bom[key]) { bom[key].qty = Math.round((bom[key].qty + qty) * 10000) / 10000; }
    else {
      const ri = RATES_DB[code] || {};
      bom[key] = { code, name: ri.n || name, type, qty: Math.round(qty * 10000) / 10000, rate: ri.r || 0, unit: ri.u || 'MT' };
    }
  }
  const allObjs = [
    ...project.nodes.map(n => ({ obj: n, objType: n.type })),
    ...project.spans.map(s => ({ obj: s, objType: 'SmartSpan' })),
  ];
  for (const {obj, objType} of allObjs) {
    const ctx = buildContext(obj, objType);
    for (const rule of RULES_DB) {
      if (rule.object !== objType) continue;
      if (!evalCond(rule.condition, ctx)) continue;
      for (const item of rule.items) {
        const qty = evalFormula(item.formula, ctx);
        if (qty === -2) {
          // Iron recipe — use estimated fallback quantities
          const formula = item.formula;
          let fb = null;
          if (formula === 'recipe') {
            // Determine context: SmartPole LT/HT or SmartStructure
            if (objType === 'SmartPole') {
              const key = (obj.pole_type === 'HT') ? 'HT_PCC' : (obj.pole_type2 === 'STP' ? 'LT_STP' : 'LT_PCC');
              fb = IRON_RECIPE_FALLBACK.recipe[key];
            } else if (objType === 'SmartStructure') {
              fb = IRON_RECIPE_FALLBACK.recipe[obj.structure_type] || IRON_RECIPE_FALLBACK.recipe['DP'];
            }
          } else {
            fb = IRON_RECIPE_FALLBACK[formula];
          }
          if (fb) addItem(fb.code, fb.name, 'M', fb.qty);
        } else if (qty > 0) {
          addItem(item.item_code, item.item_name, item.type === 'Labor' ? 'L' : 'M', qty);
        }
      }
    }
  }
  return Object.values(bom);
}

function calcTotals(bom) {
  const meta = project.project_meta;
  const matSub  = bom.filter(i=>i.type==='M').reduce((s,i)=>s+i.qty*i.rate, 0);
  const labSub  = bom.filter(i=>i.type==='L').reduce((s,i)=>s+i.qty*i.rate, 0);
  const sup     = (matSub + labSub) * (meta.supervision_rate || 0.10);
  const gst     = labSub * 0.18;        // GST @ 18% on Labour only (materials are GST-inclusive)
  const subTotal = matSub + labSub + sup + gst;
  const cess    = (matSub + labSub + sup) * 0.01; // Cess @ 1% on (Mat+Lab+Sup)
  const grand   = subTotal + cess;
  return { matSub, labSub, sup, gst, subTotal, cess, grand };
}

// ── Estimate panel ──
function showEstimatePanel() {
  const overlay = document.getElementById('est-overlay');
  overlay.classList.add('open');
  renderEstimate();
}
function hideEstimatePanel() {
  document.getElementById('est-overlay').classList.remove('open');
}

function fmt(n) { return '₹' + n.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function renderEstimate() {
  const bom = runRuleEngine();
  const body = document.getElementById('est-body');
  const meta = project.project_meta;

  if (!project.nodes.length) {
    body.innerHTML = '<div class="est-empty">No objects on canvas yet.<br>Place poles and spans to see the estimate.</div>';
    return;
  }

  const t = calcTotals(bom);
  const mats = bom.filter(i=>i.type==='M');
  const labs  = bom.filter(i=>i.type==='L');

  let html = `<div class="est-meta">
    <strong>${meta.subject || 'Untitled'}</strong><br>
    ${meta.division||'—'} | ${meta.circle||'—'} | ${meta.project_type} | UH: ${meta.use_uh?'Yes':'No'}<br>
    ${project.nodes.filter(n=>n.type==='SmartPole'&&!n.is_existing).length} new poles · 
    ${project.nodes.filter(n=>n.type==='SmartStructure').length} structures · 
    ${project.spans.filter(s=>!s.is_service_drop).length} spans
  </div>`;

  function rows(items) {
    return items.map(i => {
      const amt = i.qty * i.rate;
      return `<div class="est-row">
        <span class="est-badge ${i.type}">${i.type}</span>
        <div class="est-name">${i.name}<div class="est-code">${i.code||''}</div></div>
        <div class="est-right">
          <div class="est-qty">${i.qty} ${i.unit||''}</div>
          <div class="est-amt">${i.rate>0?fmt(amt):'—'}</div>
        </div>
      </div>`;
    }).join('');
  }

  html += `<div class="est-section-hdr">A. MATERIALS</div>${rows(mats)}`;
  html += `<div class="est-subtotal"><span>Total Material Cost (A)</span><span>${fmt(t.matSub)}</span></div>`;
  html += `<div class="est-section-hdr">B. LABOUR</div>${rows(labs)}`;
  html += `<div class="est-subtotal"><span>Total Labour Cost (B)</span><span>${fmt(t.labSub)}</span></div>`;
  html += `<div class="est-section-hdr">C. OVERHEADS & TAXES</div>`;
  html += `<div class="est-tax"><span>Supervision @ ${Math.round((meta.supervision_rate||0.10)*100)}% on (A+B)</span><span>${fmt(t.sup)}</span></div>`;
  html += `<div class="est-tax"><span>GST @ 18% on Labour (B) only</span><span>${fmt(t.gst)}</span></div>`;
  html += `<div class="est-subtotal"><span>Sub-Total (A+B+Sup+GST)</span><span>${fmt(t.subTotal)}</span></div>`;
  html += `<div class="est-tax"><span>Cess @ 1% on (A+B+Supervision)</span><span>${fmt(t.cess)}</span></div>`;
  html += `<div class="est-total"><span>GRAND TOTAL</span><span>${fmt(t.grand)}</span></div>`;
  html += `<div style="padding:10px 14px;font-size:10px;color:var(--muted);text-align:center;">
    Material rates are GST-inclusive. GST @ 18% applied on labour only.<br>
    Iron/structural fittings are approximate — full breakup in desktop ERP app.<br>
    Rates source: CED/36 FY2025-26
  </div>`;

  body.innerHTML = html;
}

// ── Estimate CSV export ──
function shareEstimateXLSX() {
  if (typeof XLSX === 'undefined') {
    toast('Excel library not loaded — check connection');
    return;
  }
  const bom  = runRuleEngine();
  const t    = calcTotals(bom);
  const meta = project.project_meta;
  const mats = bom.filter(i => i.type === 'M');
  const labs  = bom.filter(i => i.type === 'L');
  const supRate = Math.round((meta.supervision_rate || 0.10) * 100);

  const wb = XLSX.utils.book_new();

  // ─ Sheet 1: Estimate ─
  const rows = [];
  // Header info block
  rows.push(['ERP ESTIMATE', '', '', '', '', '', '']);
  rows.push(['Project:', meta.subject || '—', '', '', '', '', '']);
  rows.push(['Division:', meta.division || '—', 'Circle:', meta.circle || '—', '', '', '']);
  rows.push(['Type:', meta.project_type, 'UH Materials:', meta.use_uh ? 'Yes (Readymade)' : 'No (Raw Steel)', '', '', '']);
  rows.push(['Date:', new Date().toLocaleDateString('en-IN'), '', '', '', '', '']);
  rows.push([]);
  rows.push(['Sl.No.', 'Code', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)']);

  // ── A. MATERIALS ──
  rows.push(['A. MATERIALS', '', '', '', '', '', '']);
  let sl = 1;
  for (const i of mats) {
    rows.push([sl++, i.code || '—', i.name, i.unit || 'MT', +i.qty.toFixed(4), +i.rate.toFixed(2), +(i.qty * i.rate).toFixed(2)]);
  }
  rows.push(['', '', 'Total Material Cost (A)', '', '', '', +t.matSub.toFixed(2)]);
  rows.push([]);

  // ── B. LABOUR ──
  rows.push(['B. LABOUR', '', '', '', '', '', '']);
  sl = 1;
  for (const i of labs) {
    rows.push([sl++, i.code || '—', i.name, i.unit || 'NOS', +i.qty.toFixed(0), +i.rate.toFixed(2), +(i.qty * i.rate).toFixed(2)]);
  }
  rows.push(['', '', 'Total Labour Cost (B)', '', '', '', +t.labSub.toFixed(2)]);
  rows.push([]);

  // ── C. OVERHEADS ──
  rows.push(['C. OVERHEADS & TAXES', '', '', '', '', '', '']);
  rows.push(['', '', `Supervision @ ${supRate}% on (A+B)`, '', '', '', +t.sup.toFixed(2)]);
  rows.push(['', '', 'GST @ 18% on Labour (B) only', '', '', '', +t.gst.toFixed(2)]);
  rows.push(['', '', `Sub-Total (A+B+Sup+GST)`, '', '', '', +t.subTotal.toFixed(2)]);
  rows.push(['', '', 'Cess @ 1% on (A+B+Supervision)', '', '', '', +t.cess.toFixed(2)]);
  rows.push(['', '', 'GRAND TOTAL', '', '', '', +t.grand.toFixed(2)]);
  rows.push([]);
  rows.push(['', '', 'Note: Material rates are GST-inclusive. Iron/structural fittings are estimated weights.', '', '', '', '']);
  rows.push(['', '', 'Rates source: CED/36 FY2025-26. Generated by ERP Field Companion (Web).', '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    {wch:6}, {wch:18}, {wch:52}, {wch:8}, {wch:10}, {wch:14}, {wch:16}
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Estimate');

  // ─ Sheet 2: Materials only ─
  const matRows = [
    ['Code', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)'],
  ];
  for (const i of mats) {
    matRows.push([i.code||'—', i.name, i.unit||'MT', +i.qty.toFixed(4), +i.rate.toFixed(2), +(i.qty*i.rate).toFixed(2)]);
  }
  matRows.push(['', 'Total Material Cost (A)', '', '', '', +t.matSub.toFixed(2)]);
  const wsM = XLSX.utils.aoa_to_sheet(matRows);
  wsM['!cols'] = [{wch:18},{wch:52},{wch:8},{wch:10},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsM, 'Materials');

  // ─ Sheet 3: Labour only ─
  const labRows = [
    ['Code', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)'],
  ];
  for (const i of labs) {
    labRows.push([i.code||'—', i.name, i.unit||'NOS', +i.qty.toFixed(0), +i.rate.toFixed(2), +(i.qty*i.rate).toFixed(2)]);
  }
  labRows.push(['', 'Total Labour Cost (B)', '', '', '', +t.labSub.toFixed(2)]);
  const wsL = XLSX.utils.aoa_to_sheet(labRows);
  wsL['!cols'] = [{wch:18},{wch:52},{wch:8},{wch:10},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsL, 'Labour');

  const xlsxBuf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  const blob = new Blob([xlsxBuf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fname = getFilename('_estimate.xlsx');
  const file = new File([blob], fname, { type: blob.type });

  if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
    navigator.share({ files:[file], title:'ERP Estimate', text: meta.subject || 'ERP Estimate' })
      .then(() => toast('Excel shared ✓'))
      .catch(() => _downloadBlob(blob, fname));
  } else {
    _downloadBlob(blob, fname);
  }
}

function _downloadBlob(blob, fname) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded: ' + fname);
}

// ── App Settings functions ──
function showAppSettings() {
  const d = appDefaults;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = String(val ?? ''); };
  set('s-division',  d.division || '');
  set('s-circle',    d.circle || '');
  set('s-proj-type', d.project_type || 'NSC');
  set('s-uh',        d.use_uh ? 'true' : 'false');
  set('s-lt-mat',    d.lt_mat || 'PCC');
  set('s-lt-h',      d.lt_h || 8);
  set('s-ht-mat',    d.ht_mat || 'PCC');
  set('s-ht-h',      d.ht_h || 9);
  set('s-lt-earth',  d.lt_earth ?? 1);
  set('s-lt-stay',   d.lt_stay ?? 0);
  set('s-span-len',  d.span_len || 40);
  set('s-ab-size',   d.ab_cable_size || '3CX70+1CX16+1CX50');
  set('s-acsr-size', d.acsr_size || '50SQMM');
  set('s-sd-phase',  d.sd_phase || '1 Phase');
  set('s-sd-cable',  d.sd_cable || '10 SQMM');
  document.getElementById('settings-modal').style.display = 'flex';
}

function saveAppSettings() {
  const get = (id, fallback) => { const el = document.getElementById(id); return el ? el.value : fallback; };
  appDefaults = {
    division:      get('s-division','').trim(),
    circle:        get('s-circle','').trim(),
    project_type:  get('s-proj-type','NSC'),
    use_uh:        get('s-uh','false') === 'true',
    lt_mat:        get('s-lt-mat','PCC'),
    lt_h:          parseFloat(get('s-lt-h','8')) || 8,
    ht_mat:        get('s-ht-mat','PCC'),
    ht_h:          parseFloat(get('s-ht-h','9')) || 9,
    lt_earth:      parseInt(get('s-lt-earth','1')) ?? 1,
    lt_stay:       parseInt(get('s-lt-stay','0')) ?? 0,
    span_len:      parseFloat(get('s-span-len','40')) || 40,
    ab_cable_size: get('s-ab-size','3CX70+1CX16+1CX50'),
    acsr_size:     get('s-acsr-size','50SQMM'),
    sd_phase:      get('s-sd-phase','1 Phase'),
    sd_cable:      get('s-sd-cable','10 SQMM'),
  };
  saveAppDefaultsToStorage();
  closeModal('settings-modal');
  toast('App defaults saved ✓');
}

// ── Update title helper ──
function updateTitle() {
  const sub = project.project_meta.subject;
  const h1 = document.getElementById('app-title');
  if (h1) h1.innerHTML = `⚡ Field <span>${sub ? sub.substring(0,28) : 'Companion'}</span>`;
}

window.addEventListener('load', init);
window.addEventListener('resize', () => { checkLandscape(); resizePage(); renderAll(); });
window.addEventListener('orientationchange', () => { setTimeout(() => { checkLandscape(); resizePage(); renderAll(); }, 300); });
