/* StatusOS v4.6.0 Knowledge Engine Foundation */
(function () {
  'use strict';
  const KEY = 'statusos_knowledge_timeline_v1';
  const LEGACY_KEY = 'statusos_timeline_manual_v1';
  const MAX_EVENTS = 5000;
  const nowIso = () => new Date().toISOString();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const clean = value => String(value ?? '').trim();
  const dateValue = value => {
    const d = value ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };
  function load() {
    try { const rows = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch { return []; }
  }
  function save(rows) {
    const normalized = rows.slice(0, MAX_EVENTS);
    localStorage.setItem(KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('statusos:timeline-updated', { detail: { count: normalized.length } }));
    return normalized;
  }
  function normalize(input = {}) {
    const entity = input.entity || {};
    const date = dateValue(input.date || input.createdAt);
    return {
      id: clean(input.id) || uid(),
      fingerprint: clean(input.fingerprint),
      category: clean(input.category) || 'notes',
      kind: clean(input.kind) || 'Activity',
      title: clean(input.title) || 'StatusOS activity',
      detail: clean(input.detail),
      date: date.toISOString(),
      createdAt: clean(input.createdAt) || nowIso(),
      source: clean(input.source) || 'statusos',
      manual: Boolean(input.manual),
      entity: {
        type: clean(entity.type || input.entityType),
        id: clean(entity.id || input.entityId),
        name: clean(entity.name || input.entityName || (typeof input.entity === 'string' ? input.entity : ''))
      },
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }
  function record(input) {
    const event = normalize(input);
    const rows = load();
    const duplicate = event.fingerprint && rows.some(row => row.fingerprint === event.fingerprint);
    if (duplicate) return rows.find(row => row.fingerprint === event.fingerprint);
    rows.unshift(event);
    save(rows.sort((a,b) => new Date(b.date) - new Date(a.date)));
    return event;
  }
  function recordMany(inputs = []) {
    const rows = load();
    const seen = new Set(rows.map(row => row.fingerprint).filter(Boolean));
    let changed = false;
    inputs.forEach(input => {
      const event = normalize(input);
      if (event.fingerprint && seen.has(event.fingerprint)) return;
      if (event.fingerprint) seen.add(event.fingerprint);
      rows.push(event); changed = true;
    });
    if (changed) save(rows.sort((a,b) => new Date(b.date) - new Date(a.date)));
    return rows;
  }
  function remove(id) { save(load().filter(row => row.id !== id)); }
  function query(options = {}) {
    const text = clean(options.query).toLowerCase();
    const cutoff = options.days && options.days !== 'all' ? Date.now() - Number(options.days) * 864e5 : null;
    return load().filter(row => {
      if (options.category && options.category !== 'all' && row.category !== options.category) return false;
      if (options.entityType && row.entity?.type !== options.entityType) return false;
      if (options.entityId && row.entity?.id !== String(options.entityId)) return false;
      if (cutoff && new Date(row.date).getTime() < cutoff) return false;
      if (text && !`${row.title} ${row.detail} ${row.kind} ${row.entity?.name || ''}`.toLowerCase().includes(text)) return false;
      return true;
    });
  }
  function contextFor(entityType, entityId, limit = 40) {
    return query({ entityType, entityId }).slice(0, limit).map(row => ({
      date: row.date, kind: row.kind, title: row.title, detail: row.detail, category: row.category
    }));
  }
  function snapshotFromState() {
    const out = [], s = window.state || {};
    const push = e => out.push(e);
    (s.artists || []).forEach(a => {
      if (a.createdAt) push({ fingerprint:`artist-created-${a.id}`, category:'artists', kind:'Artist added', title:a.name || 'Artist added', detail:a.status || '', date:a.createdAt, source:'artist-os', entity:{type:'artist',id:a.id,name:a.name} });
      (a.activities || a.activity || []).forEach(x => push({ fingerprint:`artist-${a.id}-${x.id || x.date || x.createdAt}-${x.type || x.title}`, category:'artists', kind:x.type || 'Artist activity', title:x.title || x.type || 'Artist update', detail:x.details || x.detail || '', date:x.date || x.createdAt || a.updatedAt, source:'artist-os', entity:{type:'artist',id:a.id,name:a.name} }));
    });
    (s.projects || []).forEach(p => {
      push({ fingerprint:`project-created-${p.id}`, category:'projects', kind:'Project created', title:p.name || p.title || 'Project', detail:[p.artist || p.client,p.status].filter(Boolean).join(' · '), date:p.createdAt || p.date || p.updatedAt, source:'projects', entity:{type:'project',id:p.id,name:p.name || p.title} });
      (p.activity || []).forEach(x => push({ fingerprint:`project-${p.id}-${x.id || x.date}-${x.type || x.detail}`, category:x.type === 'Payment Received' ? 'finance' : 'projects', kind:x.type || 'Project update', title:p.name || p.title || 'Project', detail:x.detail || '', date:x.date, source:'projects', entity:{type:'project',id:p.id,name:p.name || p.title} }));
    });
    (s.tasks || []).forEach(t => { const done=t.completedAt || (t.done ? t.updatedAt || t.date : null); if(done) push({ fingerprint:`task-${t.id}-${done}`, category:'tasks', kind:'Task completed', title:t.text || t.title || 'Task completed', detail:[t.project,t.artist].filter(Boolean).join(' · '), date:done, source:'tasks', entity:{type:t.project ? 'project' : t.artist ? 'artist' : 'task',id:t.projectId || t.artistId || t.id,name:t.project || t.artist || ''} }); });
    (s.revenue || []).forEach(r => push({ fingerprint:`revenue-${r.id}`, category:'finance', kind:'Payment received', title:`$${Number(r.amount || 0).toLocaleString('en-CA')} received`, detail:[r.source,r.name || r.client].filter(Boolean).join(' · '), date:r.date || r.createdAt, source:'finance', entity:{type:r.projectId ? 'project' : 'artist',id:r.projectId || r.artistId || '',name:r.name || r.client || ''}, metadata:{amount:Number(r.amount || 0),currency:'CAD'} }));
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      legacy.forEach(x => push({ ...x, fingerprint:`legacy-manual-${x.id}`, source:'legacy', manual:true, entity:{type:'note',id:x.id,name:''} }));
    } catch {}
    recordMany(out);
    return out.length;
  }
  function bind() {
    window.addEventListener('statusos:timeline-record', e => { if (e.detail) record(e.detail); });
    ['statusos:artists-updated','statusos:projects-updated','statusos:tasks-updated','statusos:success-updated','statusos:app-ready'].forEach(name => window.addEventListener(name, snapshotFromState));
    snapshotFromState();
  }
  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Knowledge = { record, recordMany, remove, query, all:load, contextFor, snapshotFromState, version:'4.6.0' };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
})();
