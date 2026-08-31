'use strict';

const path = require('node:path');
const express = require('express');
const { createHv6NativeEditorFixture } = require('./hv6-native-editor-fixture');

const EDITOR_PATH = '/__hv6/grapesjs';
const VENDOR_PATH = '/__hv6/vendor/grapesjs';
const GRAPES_DIST = path.join(__dirname, 'hv6-grapesjs-eval-package', 'node_modules', 'grapesjs', 'dist');

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function label(pointer) {
  const exact = {
    '/venueContext/displayName': 'Venue name',
    '/venueContext/business/phone': 'Phone',
    '/venuePackage/home/hero/lede': 'Hero introduction',
    '/venuePackage/home/hero/image/src': 'Hero image path',
    '/venuePackage/home/hero/image/alt': 'Hero image alternative text',
    '/venuePackage/home/hero/image/caption': 'Hero image caption',
    '/venuePackage/onboarding/operatorNoun': 'Venue noun',
    '/venuePackage/onboarding/staffRole': 'Staff role',
  };
  if (exact[pointer]) return exact[pointer];
  const gallery = pointer.match(/^\/venuePackage\/home\/gallery\/items\/(\d+)\/(src|alt|caption)$/);
  if (gallery) return `Gallery item ${Number(gallery[1]) + 1} ${gallery[2]}`;
  return (pointer.split('/').at(-1) || 'field').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function sectionLabel(section) {
  return section.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function input(field, id) {
  const common = `id="${id}" name="value" required maxlength="1200"`;
  if (field.controlKind === 'multiline-text') return `<textarea ${common} rows="3">${esc(field.value)}</textarea>`;
  return `<input ${common} type="${field.controlKind === 'url' ? 'url' : 'text'}" value="${esc(field.value)}">`;
}

function canvasProjection(session) {
  const groups = new Map();
  for (const field of session.listEditableFields()) {
    if (!groups.has(field.semanticSection)) groups.set(field.semanticSection, []);
    groups.get(field.semanticSection).push({ label: label(field.pointer), value: field.value });
  }
  return Array.from(groups, ([id, fields]) => ({ id, label: sectionLabel(id), fields }));
}

function render({ native, notice }) {
  const session = native.session;
  const fields = session.listEditableFields();
  const groups = new Map();
  for (const field of fields) {
    if (!groups.has(field.semanticSection)) groups.set(field.semanticSection, []);
    groups.get(field.semanticSection).push(field);
  }
  const sections = Array.from(groups.entries()).map(([section, sectionFields], sectionIndex) => {
    const controls = sectionFields.map((field, fieldIndex) => {
      const id = `gjs-field-${sectionIndex}-${fieldIndex}`;
      return `<form class="field" method="post" action="${EDITOR_PATH}/proposal" data-field-pointer="${esc(field.pointer)}">
        <input type="hidden" name="pointer" value="${esc(field.pointer)}">
        <label for="${id}">${esc(label(field.pointer))}</label>${input(field, id)}
        <button type="submit">Update working preview</button></form>`;
    }).join('');
    return `<section class="section" data-semantic-section="${esc(section)}"><h2>${esc(sectionLabel(section))}</h2>${controls}</section>`;
  }).join('');
  const projection = Buffer.from(JSON.stringify(canvasProjection(session)), 'utf8').toString('base64');
  const status = session.status();
  const noticeHtml = notice ? `<p role="status" class="notice">${esc(notice)}</p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>HV-6 GrapesJS Core evaluation</title><link rel="stylesheet" href="${VENDOR_PATH}/css/grapes.min.css">
    <style>
    :root{font-family:system-ui,sans-serif;color:#18181b;background:#f5f5f4}*{box-sizing:border-box}body{margin:0}button,input,textarea{font:inherit;min-height:44px}button{padding:10px 13px;border:1px solid #292524;border-radius:10px;background:#292524;color:white}input,textarea{width:100%;padding:10px;border:1px solid #a8a29e;border-radius:9px}button:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid currentColor;outline-offset:3px}.skip{position:absolute;top:-60px;left:10px}.skip:focus{top:10px}.shell{max-width:1680px;margin:auto;padding:16px}.top{display:flex;justify-content:space-between;gap:14px}.top h1{margin:.2rem 0}.top p{margin:0;max-width:75ch}.status,.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.status span{background:white;border:1px solid #d6d3d1;border-radius:999px;padding:8px}.workspace{display:grid;grid-template-columns:minmax(330px,.72fr) minmax(0,1.28fr);gap:16px;margin-top:14px}.inspector{min-width:0}.section{background:white;border:1px solid #d6d3d1;border-radius:12px;padding:12px;margin-bottom:12px}.section h2{margin:0 0 10px}.field{display:grid;gap:6px;padding:10px;background:#fafaf9;border-radius:10px;margin:8px 0}.visuals{display:grid;gap:12px;position:sticky;top:12px}.card{background:white;border:1px solid #d6d3d1;border-radius:12px;overflow:hidden}.card header{padding:10px 12px;border-bottom:1px solid #e7e5e4}.card header p{margin:2px 0;color:#57534e}.notice{padding:10px;background:white;border:1px solid #a8a29e;border-radius:9px}#gjs{height:470px}.review{display:block;width:100%;height:min(48vh,560px);min-height:360px;border:0}.gjs-pn-panels,.gjs-blocks-c,.gjs-sm-sectors{display:none!important}@media(max-width:900px){.top{display:block}.workspace{display:flex;flex-direction:column-reverse}.visuals{position:static}#gjs{height:400px}.review{height:58vh;min-height:480px}}
    </style></head><body><a class="skip" href="#fields">Skip to editable fields</a><main class="shell">
    <header class="top"><div><p>HV-6 Candidate A · evaluation only</p><h1>Constrained GrapesJS spatial context + HV-5 inspector</h1><p>The GrapesJS canvas is a transient read-only context aid. It cannot add blocks, select or mutate semantic components, style the page, run scripts, persist project state, or become preview truth. All editing happens through HV-5-owned inspector fields.</p></div><div class="status"><span data-session-state>${esc(status.state)}</span><span>${status.dirty ? 'Unsaved proposal' : 'Accepted state'}</span><div class="actions"><form method="post" action="${EDITOR_PATH}/apply"><button data-action="apply">Apply proposal</button></form><form method="post" action="${EDITOR_PATH}/discard"><button data-action="discard">Discard changes</button></form></div></div></header>${noticeHtml}
    <div class="workspace"><div class="inspector" id="fields">${sections}</div><aside class="visuals"><section class="card"><header><strong>Read-only semantic canvas</strong><p>Spatial context only; use the owned inspector fields to edit.</p></header><div id="gjs"></div></section><section class="card"><header><strong>Real application review</strong><p>This existing renderer—not GrapesJS—is review truth.</p></header><iframe class="review" title="Real Hive-Venues review preview" src="${native.previewPath}"></iframe></section></aside></div></main>
    <script id="hv6-gjs-projection" type="application/octet-stream">${projection}</script><script src="${VENDOR_PATH}/grapes.min.js"></script><script>(()=>{'use strict';const sections=JSON.parse(atob(document.querySelector('#hv6-gjs-projection').textContent.trim()));const text=(tag,content,cls)=>({tagName:tag,attributes:{class:cls},components:[{type:'textnode',content:String(content),editable:false}],draggable:false,droppable:false,removable:false,copyable:false,stylable:false,editable:false,selectable:false,hoverable:false,toolbar:[]});const components=sections.map(s=>({tagName:'section',attributes:{'data-hv6-section':s.id,class:'hv6-card'},components:[text('p',s.label,'hv6-kicker'),...s.fields.slice(0,4).map(f=>text('p',f.value,'hv6-value'))],draggable:false,droppable:false,removable:false,copyable:false,stylable:false,editable:false,selectable:false,hoverable:false,toolbar:[]}));const editor=grapesjs.init({container:'#gjs',height:'470px',storageManager:false,panels:{defaults:[]},blockManager:{blocks:[]},styleManager:{sectors:[]},allowScripts:0,parser:{optionsHtml:{allowScripts:false}},components,style:'.hv6-card{padding:18px;margin:0 0 12px;border:1px solid #d6d3d1;border-radius:14px;background:#fff}.hv6-kicker{font:700 13px system-ui;text-transform:uppercase;letter-spacing:.08em;color:#57534e}.hv6-value{font:16px/1.45 system-ui;color:#18181b}'});window.__HV6_GRAPESJS_EVAL__={editor,policy:Object.freeze({storageManager:false,autosaveAuthority:false,projectPersistence:false,blocks:false,styleAuthority:false,scriptAuthority:false,componentSelection:false,realRendererIsReviewTruth:true})};const ready=()=>{const frame=editor.Canvas.getFrameEl();if(frame)frame.title='Read-only GrapesJS semantic venue canvas';const doc=editor.Canvas.getDocument();if(doc){doc.documentElement.lang='en';doc.title='HV-6 read-only semantic venue canvas'}document.body.dataset.grapesReady='true'};editor.on('load',ready);if(editor.Canvas.getDocument())ready()})();</script></body></html>`;
}

function createHv6GrapesJsEditorFixture(authoringInput) {
  const native = createHv6NativeEditorFixture(authoringInput);
  const app = express();
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(VENDOR_PATH, express.static(GRAPES_DIST));
  let notice = null;
  app.get(EDITOR_PATH, (req, res) => { const current = notice; notice = null; res.set('Cache-Control', 'no-store').type('html').send(render({ native, notice: current })); });
  app.post(`${EDITOR_PATH}/proposal`, (req, res) => { try { native.session.edit(String(req.body.pointer || ''), String(req.body.value || '')); notice = 'Working preview updated; accepted HV-5 document unchanged.'; } catch (error) { notice = error instanceof Error ? error.message : String(error); } res.redirect(303, EDITOR_PATH); });
  app.post(`${EDITOR_PATH}/apply`, (req, res) => { try { native.session.apply(); notice = 'Proposal accepted through the HV-5 ordinary-operator gate.'; } catch (error) { notice = error instanceof Error ? error.message : String(error); } res.redirect(303, EDITOR_PATH); });
  app.post(`${EDITOR_PATH}/discard`, (req, res) => { native.session.discard(); notice = 'Unsaved proposal discarded.'; res.redirect(303, EDITOR_PATH); });
  app.use(native.app);
  return { ...native, app, editorPath: EDITOR_PATH };
}

module.exports = { createHv6GrapesJsEditorFixture };
