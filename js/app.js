/* Recipe Book v5 - classic script bundle for file://, local server and GitHub Pages */

const DB_NAME = 'recipe-book-db';
const DB_VERSION = 2;
const STORE = 'recipes';
const CATEGORY_STORE = 'categories';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CATEGORY_STORE)) db.createObjectStore(CATEGORY_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecipes() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putRecipe(recipe) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(recipe);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecipe(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceAll(recipes) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    recipes.forEach(r => store.put(r));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}


async function getAllCategories() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CATEGORY_STORE, 'readonly');
    const req = tx.objectStore(CATEGORY_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putCategory(category) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CATEGORY_STORE, 'readwrite');
    tx.objectStore(CATEGORY_STORE).put(category);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

const EXPORT_FORMAT = 'recipe-book';
const EXPORT_VERSION = 1;

function newId() {
  return '01' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function emptyRecipe() {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: '',
    description: '',
    servings: 2,
    rating: 0,
    favorite: false,
    image: null,
    source: { url: '', name: '' },
    notes: '',
    categories: [],
    tags: [],
    sections: [emptySection('Zutaten')],
    preparationSteps: [emptyStep()],
    createdAt: now,
    updatedAt: now
  };
}

function emptySection(name = 'Zutaten') {
  return { id: newId(), name, sortOrder: 1, ingredients: [emptyIngredient()] };
}

function emptyIngredient() {
  return { id: newId(), amount: '', unit: '', name: '', note: '', sortOrder: 1 };
}

function emptyStep() { return { id: newId(), step: 1, text: '' }; }

function normalizeRecipe(input) {
  const r = structuredClone(input || {});
  r.id ||= newId();
  r.name = String(r.name || 'Unbenanntes Rezept');
  r.description = String(r.description || '');
  r.servings = Math.max(1, Number(r.servings) || 1);
  r.rating = Math.max(0, Math.min(5, Number(r.rating) || 0));
  r.favorite = Boolean(r.favorite);
  r.source = { url: String(r.source?.url || ''), name: String(r.source?.name || '') };
  r.notes = String(r.notes || '');
  r.categories = Array.isArray(r.categories) ? r.categories.map(String) : [];
  r.tags = Array.isArray(r.tags) ? r.tags.map(String) : [];
  r.sections = (Array.isArray(r.sections) && r.sections.length ? r.sections : [emptySection('Zutaten')]).map((s, si) => ({
    id: s.id || newId(), name: String(s.name || `Bereich ${si + 1}`), sortOrder: si + 1,
    ingredients: (Array.isArray(s.ingredients) ? s.ingredients : []).map((i, ii) => ({
      id: i.id || newId(), amount: i.amount ?? '', unit: String(i.unit || ''), name: String(i.name || ''), note: String(i.note || ''), sortOrder: ii + 1
    }))
  }));
  r.preparationSteps = (Array.isArray(r.preparationSteps) ? r.preparationSteps : []).map((s, i) => ({ id: s.id || newId(), step: i + 1, text: String(s.text || '') }));
  r.createdAt ||= new Date().toISOString();
  r.updatedAt ||= r.createdAt;
  return r;
}

function buildExport(recipes) {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), categories: state.categories, recipes: recipes.map(normalizeRecipe) };
}


function cleanLine(line) {
  return line.replace(/\r/g, '').trim();
}

function isHeading(line) {
  const value = cleanLine(line).replace(/^[-•*–—]+\s*/, '').replace(/[:：]\s*$/, '').trim();
  if (!value || value.length > 90) return false;
  if (/^(zutaten(?:\s+für)?|ingredients?|zubereitung|anleitung|so geht['’]s|so gehts|zubereitungsschritte|methode|steps?)\b/i.test(value)) return true;
  return /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß &'’/-]{2,60}$/.test(value) && !/[.!?]/.test(value);
}

function looksLikeIngredient(line) {
  const s = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '');
  return /^(\d+(?:[.,]\d+)?|\d+\/\d+|ein paar|eine?\s|etwas|ca\.?\s*\d|nach\s+geschmack|nach\s+belieben|wenig|reichlich)\b/i.test(s)
    || /\b(g|kg|ml|l|cl|tl|el|teelöffel|esslöffel|prise|prisen|stück|stück|bund|packung|päckchen|dose|dosen|becher|scheibe|scheiben|zehe|zehen)\b/i.test(s);
}

function isPrepHeading(line) {
  return /^(zubereitung|anleitung|so geht['’]s|so gehts|zubereitungsschritte|methode|steps?)\s*:??$/i.test(
    cleanLine(line).replace(/^[-•*]\s*/, '')
  );
}

function isIngredientHeading(line) {
  return /^zutaten\b/i.test(cleanLine(line).replace(/^[-•*]\s*/, '')) || /^ingredients?\b/i.test(cleanLine(line));
}

function normalizeBulletSeparators(text) {
  return text
    .replace(/\u2022/g, '•')
    .replace(/\s+[-–—]\s+/g, '\n- ')
    .replace(/\s+•\s+/g, '\n• ')
    .replace(/\s+\*\s+/g, '\n* ')
    .replace(/\s+(\d+[.)])\s+/g, '\n$1 ');
}

function splitPreparationLines(lines) {
  const result = [];
  let buffer = '';
  const flush = () => {
    const value = buffer.trim();
    if (value) result.push(value);
    buffer = '';
  };

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) {
      flush();
      continue;
    }
    const marker = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (marker) {
      flush();
      buffer = marker[1];
    } else {
      buffer = buffer ? `${buffer} ${line}` : line;
    }
  }
  flush();
  return result.length ? result : lines.map(cleanLine).filter(Boolean);
}

function parseIngredientLine(line) {
  let s = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  const match = s.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*([A-Za-zÄÖÜäöüß./-]+)?\s+(.+)$/);
  if (match) {
    return { amount: match[1].replace(',', '.'), unit: match[2] || '', name: match[3].trim(), note: '', };
  }
  const fraction = s.match(/^(ein|eine|einer|eines|etwas|ein paar|nach geschmack|nach belieben)\s+(.+)$/i);
  if (fraction) return { amount: fraction[1], unit: '', name: fraction[2].trim(), note: '' };
  return { amount: '', unit: '', name: s, note: '' };
}

function parseRecipeText(input) {
  const normalized = normalizeBulletSeparators(String(input || '').replace(/\r\n?/g, '\n')).trim();
  if (!normalized) throw new Error('Bitte zuerst einen Rezepttext einfügen.');

  const lines = normalized.split('\n').map(cleanLine);
  while (lines.length && !lines[0]) lines.shift();
  const name = (lines.shift() || 'Importiertes Rezept').replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();

  let descriptionLines = [];
  let sections = [];
  let preparationLines = [];
  let mode = 'intro';
  let currentSection = null;

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (isPrepHeading(line)) {
      mode = 'prep';
      currentSection = null;
      continue;
    }
    if (isIngredientHeading(line)) {
      mode = 'ingredients';
      currentSection = null;
      continue;
    }

    if (mode === 'intro') {
      descriptionLines.push(line);
      if (isHeading(line) && !isIngredientHeading(line)) {
        // Treat a short standalone line after the title as a potential ingredient section only
        // when the following content looks like ingredients.
        mode = 'ingredients';
        currentSection = { name: line.replace(/[:：]$/, ''), ingredients: [] };
        sections.push(currentSection);
      }
      continue;
    }

    if (mode === 'ingredients') {
      const potentialHeading = line.replace(/[:：]$/, '');
      if (isHeading(line) && !looksLikeIngredient(line) && !isIngredientHeading(line)) {
        currentSection = { name: potentialHeading, ingredients: [] };
        sections.push(currentSection);
        continue;
      }
      if (!currentSection) {
        currentSection = { name: 'Zutaten', ingredients: [] };
        sections.push(currentSection);
      }
      currentSection.ingredients.push(parseIngredientLine(line));
      continue;
    }

    if (mode === 'prep') preparationLines.push(line);
  }

  if (!sections.length) {
    // Fall back to a simple split when a source has no explicit "Zutaten" heading.
    const ingredientStart = lines.findIndex(looksLikeIngredient);
    if (ingredientStart >= 0) {
      const intro = lines.slice(0, ingredientStart);
      descriptionLines = intro;
      const ingredients = [];
      let prepIndex = -1;
      for (let i = ingredientStart; i < lines.length; i += 1) {
        if (isPrepHeading(lines[i])) { prepIndex = i; break; }
        ingredients.push(parseIngredientLine(lines[i]));
      }
      sections = [{ name: 'Zutaten', ingredients }];
      preparationLines = prepIndex >= 0 ? lines.slice(prepIndex + 1) : [];
    }
  }

  // Filter out accidental pseudo-ingredients that are really intro text.
  sections = sections.map(section => ({
    ...section,
    ingredients: section.ingredients.filter(i => i.name).slice(0, 100)
  })).filter(section => section.ingredients.length || section.name);

  if (!sections.length) sections = [{ name: 'Zutaten', ingredients: [] }];

  const steps = splitPreparationLines(preparationLines);
  return {
    name,
    description: descriptionLines.filter((line, index) => !(index === 0 && /^zutaten\b/i.test(line))).join('\n'),
    sections,
    preparationSteps: steps,
  };
}



const state = { recipes: [], categories: [], view: 'recipes', category: 'Alle', search: '', sort: 'newest', editing: null, rating: 0, image: null };
const $ = (id) => document.getElementById(id);
const recipeGrid = $('recipeGrid');

function escapeHtml(value='') { return value.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch])); }
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2200); }
function stars(rating) { return '★'.repeat(rating) + '☆'.repeat(5-rating); }
function categories() {
  const names = [...state.categories.map(c=>c.name), ...state.recipes.flatMap(r=>r.categories || [])];
  return [...new Set(names)].filter(Boolean).sort((a,b)=>a.localeCompare(b,'de'));
}
function filteredRecipes() {
  let list = state.recipes.filter(r => state.view==='favorites' ? r.favorite : true);
  if (state.category!=='Alle') list=list.filter(r=>(r.categories||[]).includes(state.category));
  const q=state.search.trim().toLowerCase();
  if(q) list=list.filter(r=>[r.name,r.description,r.notes,...(r.tags||[]),...(r.categories||[]),...(r.sections||[]).flatMap(s=>s.ingredients.map(i=>i.name))].join(' ').toLowerCase().includes(q));
  return list.sort((a,b)=> state.sort==='name'?a.name.localeCompare(b.name,'de'):state.sort==='rating'?b.rating-a.rating || b.updatedAt.localeCompare(a.updatedAt):b.updatedAt.localeCompare(a.updatedAt));
}

function renderSidebar(){
  $('categoryList').innerHTML = categories().map(c=>`<button class="category-item ${state.category===c?'active':''}" data-category="${escapeHtml(c)}"><span>${escapeHtml(c)}</span><span class="count">${state.recipes.filter(r=>(r.categories||[]).includes(c)).length}</span></button>`).join('');
  document.querySelectorAll('[data-category]').forEach(btn=>btn.onclick=()=>{state.category=btn.dataset.category;state.view='recipes';render();});
}
function renderChips(){
  $('filterChips').innerHTML=['Alle',...categories()].map(c=>`<button class="chip ${state.category===c?'active':''}" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  document.querySelectorAll('[data-chip]').forEach(btn=>btn.onclick=()=>{state.category=btn.dataset.chip;render();});
}
function renderCards(){
  const list=filteredRecipes();
  recipeGrid.innerHTML=list.map(r=>`<article class="recipe-card" data-id="${r.id}">
    <div class="card-image">${r.image?`<img src="${r.image}" alt="${escapeHtml(r.name)}">`:'<div class="card-placeholder">🍲</div>'}<button class="favorite-button" data-fav="${r.id}" title="Favorit">${r.favorite?'❤️':'🤍'}</button></div>
    <div class="card-body"><h3 class="card-title">${escapeHtml(r.name)}</h3><div class="card-meta"><span class="stars">${stars(r.rating)}</span><span>·</span><span>${r.servings} Portionen</span></div><div class="card-tags">${(r.categories||[]).slice(0,2).map(c=>`<span class="mini-tag">${escapeHtml(c)}</span>`).join('')}</div></div></article>`).join('');
  $('emptyState').classList.toggle('hidden',list.length!==0); recipeGrid.classList.toggle('hidden',list.length===0);
  document.querySelectorAll('.recipe-card').forEach(card=>card.onclick=(e)=>{if(e.target.closest('.favorite-button'))return; openDetail(card.dataset.id);});
  document.querySelectorAll('[data-fav]').forEach(btn=>btn.onclick=async(e)=>{e.stopPropagation();const r=state.recipes.find(x=>x.id===btn.dataset.fav);r.favorite=!r.favorite;r.updatedAt=new Date().toISOString();await putRecipe(r);render();toast(r.favorite?'Zu Favoriten hinzugefügt':'Aus Favoriten entfernt');});
}
function render(){
  $('recipeView').classList.toggle('hidden', state.view==='detail'); $('detailView').classList.toggle('hidden', state.view!=='detail');
  $('viewTitle').textContent=state.view==='favorites'?'Favoriten':'Meine Rezepte'; $('viewSubtitle').textContent=state.view==='favorites'?'Deine Lieblingsrezepte an einem Ort.':'Alles, was du gern wiederkochst.';
  if(state.view!=='detail'){renderSidebar();renderChips();renderCards();}
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));
}

function renderRating(){ $('ratingInput').innerHTML=Array.from({length:5},(_,i)=>`<button type="button" data-rate="${i+1}" class="${i<state.rating?'active':''}">★</button>`).join('');document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{state.rating=Number(b.dataset.rate);renderRating();}); }
function renderSections(recipe){
  $('ingredientSections').innerHTML=recipe.sections.map((s,si)=>`<div class="ingredient-section" data-section="${s.id}"><div class="section-title-row"><input data-section-name value="${escapeHtml(s.name)}" placeholder="z. B. Teig"><button type="button" class="small-button" data-remove-section="${s.id}" title="Bereich entfernen">🗑</button></div>${s.ingredients.map((i,ii)=>`<div class="ingredient-row"><input data-ing="amount" value="${escapeHtml(String(i.amount))}" placeholder="250"><input data-ing="unit" value="${escapeHtml(i.unit)}" placeholder="g"><input data-ing="name" value="${escapeHtml(i.name)}" placeholder="Mehl"><button type="button" class="small-button" data-remove-ing="${i.id}" title="Zutat entfernen">×</button></div>`).join('')}<button type="button" class="add-row" data-add-ing="${s.id}">＋ Zutat</button></div>`).join('');
  document.querySelectorAll('[data-remove-section]').forEach(b=>b.onclick=()=>{if(recipe.sections.length===1){toast('Mindestens ein Zutatenbereich bleibt erhalten.');return;}recipe.sections=recipe.sections.filter(s=>s.id!==b.dataset.removeSection);renderSections(recipe);});
  document.querySelectorAll('[data-add-ing]').forEach(b=>b.onclick=()=>{const s=recipe.sections.find(x=>x.id===b.dataset.addIng);s.ingredients.push(emptyIngredient());renderSections(recipe);});
  document.querySelectorAll('[data-remove-ing]').forEach(b=>b.onclick=()=>{const s=recipe.sections.find(x=>x.ingredients.some(i=>i.id===b.dataset.removeIng));if(!s)return;s.ingredients=s.ingredients.filter(i=>i.id!==b.dataset.removeIng);if(!s.ingredients.length)s.ingredients.push(emptyIngredient());renderSections(recipe);});
  document.querySelectorAll('[data-section]').forEach(el=>{const s=recipe.sections.find(x=>x.id===el.dataset.section);el.querySelector('[data-section-name]').oninput=e=>s.name=e.target.value;el.querySelectorAll('[data-ing]').forEach((inp,idx)=>{const row=[...el.querySelectorAll('.ingredient-row')][Math.floor(idx/3)];const ing=s.ingredients[Math.floor(idx/3)];inp.oninput=e=>ing[inp.dataset.ing]=e.target.value;});});
}
function renderSteps(recipe){
  $('stepsList').innerHTML=recipe.preparationSteps.map((s,i)=>`<div class="step-row"><div class="step-number">${i+1}</div><textarea data-step="${s.id}" placeholder="Zubereitungsschritt…">${escapeHtml(s.text)}</textarea><button type="button" class="small-button" data-remove-step="${s.id}" title="Schritt entfernen">🗑</button></div>`).join('');
  document.querySelectorAll('[data-step]').forEach(t=>t.oninput=e=>{const s=recipe.preparationSteps.find(x=>x.id===t.dataset.step);s.text=e.target.value;});
  document.querySelectorAll('[data-remove-step]').forEach(b=>b.onclick=()=>{recipe.preparationSteps=recipe.preparationSteps.filter(s=>s.id!==b.dataset.removeStep);renderSteps(recipe);});
}
function populateCategorySelect(selected){
  const cats=categories(); $('categoryInput').innerHTML=['','＋ Neue Kategorie',...cats].map((c,i)=>i===0?'<option value="">Keine Kategorie</option>':i===1?'<option value="__new__">＋ Neue Kategorie…</option>':`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');$('categoryInput').value=selected||'';
}
function renderMultilineText(value='') {
  const prepared = String(value).replace(/\s+-\s+/g, '\n- ');
  const lines = prepared.split(/\r?\n/);
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(/^[-•*]\s+(.*)$/);
    if (match) {
      if (!inList) { html += '<ul class="detail-list">'; inList = true; }
      html += `<li>${escapeHtml(match[1])}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (line) html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html || '<p class="muted">—</p>';
}


function showImportChooser() {
  const existing = document.getElementById('importChooserModal');
  if (existing) existing.remove();
  const wrapper = document.createElement('div');
  wrapper.id = 'importChooserModal';
  wrapper.className = 'modal-backdrop';
  wrapper.innerHTML = `<div class="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="importChooserTitle">
    <div class="modal-header"><div><p class="eyebrow">IMPORT</p><h2 id="importChooserTitle">Was möchtest du importieren?</h2></div><button type="button" class="icon-button" data-close-import>×</button></div>
    <p class="muted import-intro">Du kannst entweder einen Rezepttext aus Instagram übernehmen oder eine zuvor exportierte Rezept-Sicherung wiederherstellen.</p>
    <div class="import-choice-grid">
      <button type="button" class="import-choice" id="importTextChoice"><span class="import-choice-icon">📝</span><strong>Rezepttext übernehmen</strong><span>Caption oder Rezepttext einfügen und automatisch in Felder aufteilen.</span></button>
      <button type="button" class="import-choice" id="importBackupChoice"><span class="import-choice-icon">💾</span><strong>Backup importieren</strong><span>Eine JSON- oder ZIP-Sicherung deiner Rezepte wiederherstellen.</span></button>
    </div>
    <div class="modal-footer"><button type="button" class="secondary-button" data-close-import>Abbrechen</button></div>
  </div>`;
  document.body.appendChild(wrapper);
  wrapper.querySelectorAll('[data-close-import]').forEach(btn => btn.onclick = () => wrapper.remove());
  wrapper.addEventListener('click', e => { if (e.target === wrapper) wrapper.remove(); });
  wrapper.querySelector('#importTextChoice').onclick = () => { wrapper.remove(); showTextImportModal(); };
  wrapper.querySelector('#importBackupChoice').onclick = () => { wrapper.remove(); $('fileImportInput').value = ''; $('fileImportInput').click(); };
}

function showTextImportModal() {
  const existing = document.getElementById('textImportModal');
  if (existing) existing.remove();
  const wrapper = document.createElement('div');
  wrapper.id = 'textImportModal';
  wrapper.className = 'modal-backdrop';
  wrapper.innerHTML = `<div class="modal import-modal" role="dialog" aria-modal="true">
    <div class="modal-header"><div><p class="eyebrow">SCHNELLER IMPORT</p><h2>Rezepttext einfügen</h2></div><button type="button" class="icon-button" data-close-import>×</button></div>
    <p class="muted import-intro">Kopiere die Rezeptbeschreibung aus Instagram oder einer anderen Quelle hier hinein. Die App erkennt Zutatenbereiche und Zubereitungsschritte automatisch. Du kannst alles anschließend im normalen Formular prüfen und anpassen.</p>
    <textarea id="recipeTextImport" class="import-textarea" rows="18" placeholder="z. B.\nSchokoladenkuchen\n\nZutaten für den Teig\n250 g Mehl\n200 g Zucker\n3 Eier\n\nZutaten für die Glasur\n100 g Schokolade\n50 ml Sahne\n\nZubereitung\n- Mehl und Zucker mischen\n- Eier hinzufügen..."></textarea>
    <div class="modal-footer"><button type="button" class="secondary-button" data-close-import>Abbrechen</button><button type="button" class="primary-button" id="parseRecipeTextBtn">Rezept übernehmen</button></div>
  </div>`;
  document.body.appendChild(wrapper);
  wrapper.querySelectorAll('[data-close-import]').forEach(btn => btn.onclick = () => wrapper.remove());
  wrapper.addEventListener('click', e => { if (e.target === wrapper) wrapper.remove(); });
  const textarea = wrapper.querySelector('#recipeTextImport');
  textarea.focus();
  wrapper.querySelector('#parseRecipeTextBtn').onclick = () => {
    try {
      const parsed = parseRecipeText(textarea.value);
      const recipe = emptyRecipe();
      recipe.name = parsed.name;
      recipe.description = parsed.description;
      recipe.sections = parsed.sections.map((section, index) => ({
        id: newIdSafe(),
        name: section.name || `Bereich ${index + 1}`,
        sortOrder: index + 1,
        ingredients: section.ingredients.map((ingredient, ii) => ({
          ...emptyIngredient(), id: newIdSafe(), amount: ingredient.amount || '', unit: ingredient.unit || '', name: ingredient.name || '', note: ingredient.note || '', sortOrder: ii + 1
        }))
      }));
      recipe.preparationSteps = parsed.preparationSteps.length
        ? parsed.preparationSteps.map((text, i) => ({ ...emptyStep(), id: newIdSafe(), step: i + 1, text }))
        : [emptyStep()];
      wrapper.remove();
      openModal(recipe);
      toast('Rezepttext übernommen – bitte kurz prüfen.');
    } catch (err) {
      alert(err.message);
    }
  };
}

function newIdSafe() {
  return '01' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function openModal(recipe=null){
  state.editing=recipe?normalizeRecipe(recipe):emptyRecipe();state.rating=state.editing.rating||0;state.image=state.editing.image||null;$('modalTitle').textContent=recipe?'Rezept bearbeiten':'Rezept hinzufügen';$('recipeId').value=state.editing.id;$('nameInput').value=state.editing.name;$('servingsInput').value=state.editing.servings;$('descriptionInput').value=state.editing.description;$('sourceUrlInput').value=state.editing.source.url;$('sourceNameInput').value=state.editing.source.name;$('notesInput').value=state.editing.notes;populateCategorySelect(state.editing.categories[0]||'');renderRating();renderSections(state.editing);renderSteps(state.editing);updateImagePreview();$('recipeModal').classList.remove('hidden');setTimeout(()=>$('nameInput').focus(),30);
}
function closeModal(){ $('recipeModal').classList.add('hidden');state.editing=null; }
function updateImagePreview(){if(state.image){$('imagePreview').src=state.image;$('imagePreview').style.display='block';$('imagePlaceholder').style.display='none';}else{$('imagePreview').removeAttribute('src');$('imagePreview').style.display='none';$('imagePlaceholder').style.display='grid';}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}

function openDetail(id){const r=state.recipes.find(x=>x.id===id);if(!r)return;state.view='detail';$('viewTitle').textContent=r.name;$('viewSubtitle').textContent='Rezeptdetails';const image=r.image?`<img src="${r.image}" alt="${escapeHtml(r.name)}">`:'<div class="card-placeholder">🍲</div>';$('detailView').innerHTML=`<div class="detail-header"><div class="detail-image">${image}</div><div class="detail-main"><p class="eyebrow">REZEPT</p><h2>${escapeHtml(r.name)} ${r.favorite?'❤️':''}</h2><div class="detail-sub"><span class="stars">${stars(r.rating)}</span><span>·</span><span>${r.servings} Portionen</span>${r.categories?.length?`<span>·</span><span>${escapeHtml(r.categories.join(', '))}</span>`:''}</div><div class="detail-description">${renderMultilineText(r.description)}</div><div class="detail-actions"><button class="primary-button" id="detailEdit">✎ Bearbeiten</button><button class="secondary-button" id="detailFav">${r.favorite?'♥ Favorit':'♡ Favorit'}</button><button class="secondary-button" id="detailExport">⬇ Exportieren</button><button class="secondary-button" id="detailDelete">🗑 Löschen</button></div></div></div><div class="detail-layout"><section class="detail-panel"><h3>Zutaten</h3>${r.sections.map(s=>`<div class="ingredient-group"><h4>${escapeHtml(s.name)}</h4>${s.ingredients.map(i=>`<div class="ingredient-item"><strong>${escapeHtml(String(i.amount))} ${escapeHtml(i.unit)}</strong><span>${escapeHtml(i.name)}${i.note?` – ${escapeHtml(i.note)}`:''}</span></div>`).join('')}</div>`).join('')}</section><section class="detail-panel"><h3>Zubereitung</h3>${r.preparationSteps.map((s,i)=>`<div class="prep-step"><div class="step-number">${i+1}</div><div class="prep-step-text">${renderMultilineText(s.text)}</div></div>`).join('')||'<p class="muted">Noch keine Schritte hinterlegt.</p>'}${r.notes?`<div class="notes-box"><strong>📝 Eigene Notiz</strong><div class="rich-text">${renderMultilineText(r.notes)}</div></div>`:''}${r.source.url?`<div class="notes-box"><strong>🔗 Originalquelle</strong><p><a class="source-link" href="${escapeHtml(r.source.url)}" target="_blank" rel="noopener">${escapeHtml(r.source.name||r.source.url)}</a></p></div>`:''}</section></div>`;
  $('detailEdit').onclick=()=>openModal(r);$('detailFav').onclick=async()=>{r.favorite=!r.favorite;r.updatedAt=new Date().toISOString();await putRecipe(r);openDetail(r.id);toast(r.favorite?'Zu Favoriten hinzugefügt':'Aus Favoriten entfernt');};$('detailDelete').onclick=async()=>{if(confirm(`„${r.name}“ wirklich löschen?`)){await deleteRecipe(r.id);state.recipes=state.recipes.filter(x=>x.id!==r.id);state.view='recipes';render();toast('Rezept gelöscht');}};$('detailExport').onclick=()=>exportRecipes([r],`${slugify(r.name)}.zip`);render();}
function slugify(s){return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9äöüß]+/gi,'-').replace(/^-|-$/g,'')||'rezept';}

async function exportRecipes(recipes,filename='Meine-Rezepte.zip'){
  const bundle=buildExport(recipes);if(window.JSZip){const zip=new JSZip();zip.file('recipes.json',JSON.stringify(bundle,null,2));const folder=zip.folder('images');for(const r of recipes){if(r.image&&r.image.includes(',')){const [header,data]=r.image.split(',');const ext=(header.match(/data:image\/(\w+)/)||[])[1]||'jpeg';folder.file(`${r.id}.${ext}`,data,{base64:true});}}const blob=await zip.generateAsync({type:'blob'});download(blob,filename);}else download(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),filename.replace(/\.zip$/i,'.json'));toast('Export erstellt');}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

async function importFile(file){
  if(!file)return;let parsed;try{if(file.name.toLowerCase().endsWith('.zip')){if(!window.JSZip)throw new Error('ZIP-Unterstützung nicht geladen');const zip=await JSZip.loadAsync(file);const json=zip.file('recipes.json');if(!json)throw new Error('recipes.json fehlt');parsed=JSON.parse(await json.async('text'));for(const r of parsed.recipes||[]){const match=Object.keys(zip.files).find(k=>k.startsWith('images/'+r.id+'.'));if(match){const blob=await zip.file(match).async('blob');r.image=await readFile(blob);}}}else{parsed=JSON.parse(await file.text());}
  if(parsed.format!=='recipe-book')throw new Error('Unbekanntes Rezeptformat');const incoming=(parsed.recipes||[]).map(normalizeRecipe);if(!incoming.length)throw new Error('Keine Rezepte enthalten');const mode=confirm(`Import gefunden: ${incoming.length} Rezept(e).\n\nOK = vorhandene Rezepte anhand der ID aktualisieren\nAbbrechen = Importvorgang abbrechen`);if(!mode)return;const map=new Map(state.recipes.map(r=>[r.id,r]));incoming.forEach(r=>map.set(r.id,r));state.recipes=[...map.values()];
  const importedCategories=Array.isArray(parsed.categories)?parsed.categories.map(c=>typeof c==='string'?{id:newId(),name:c}:{id:c.id||newId(),name:String(c.name||'').trim(),createdAt:c.createdAt||new Date().toISOString()}).filter(c=>c.name):[];
  const catMap=new Map(state.categories.map(c=>[c.name.toLowerCase(),c]));
  importedCategories.forEach(c=>{if(!catMap.has(c.name.toLowerCase()))catMap.set(c.name.toLowerCase(),c);});
  state.recipes.flatMap(r=>r.categories||[]).forEach(name=>{if(!catMap.has(name.toLowerCase()))catMap.set(name.toLowerCase(),{id:newId(),name,createdAt:new Date().toISOString()});});
  state.categories=[...catMap.values()];
  await replaceAll(state.recipes);
  for(const c of state.categories) await putCategory(c);
  state.view='recipes';state.category='Alle';render();toast(`${incoming.length} Rezept(e) importiert`);
  }catch(err){console.error(err);alert(`Import fehlgeschlagen: ${err.message}`);}}

async function addCategory(){const raw=prompt('Wie soll die neue Kategorie heißen?');const name=(raw||'').trim();if(!name)return;if(categories().some(c=>c.toLowerCase()===name.toLowerCase())){toast('Diese Kategorie gibt es bereits.');return;}const category={id:newId(),name,createdAt:new Date().toISOString()};state.categories.push(category);await putCategory(category);state.category=name;state.view='recipes';render();toast('Kategorie angelegt');}
$('newRecipeBtn').onclick=()=>openModal();$('emptyNewBtn').onclick=()=>openModal();const emptyImport=$('emptyImportBtn');if(emptyImport)emptyImport.onclick=showTextImportModal;$('closeModalBtn').onclick=closeModal;$('cancelModalBtn').onclick=closeModal;$('recipeModal').onclick=e=>{if(e.target===$('recipeModal'))closeModal()};$('searchInput').oninput=e=>{state.search=e.target.value;renderCards();};$('sortSelect').onchange=e=>{state.sort=e.target.value;renderCards();};$('addCategoryBtn').onclick=addCategory;$('mobileCategoryBtn').onclick=addCategory;$('mobileImportBtn').onclick=showImportChooser;$('mobileExportBtn').onclick=()=>exportRecipes(state.recipes);$('addSectionBtn').onclick=()=>{state.editing.sections.push(emptySection(`Bereich ${state.editing.sections.length+1}`));renderSections(state.editing);};$('addStepBtn').onclick=()=>{state.editing.preparationSteps.push(emptyStep());renderSteps(state.editing);};$('imageInput').onchange=async e=>{if(e.target.files[0]){state.image=await readFile(e.target.files[0]);updateImagePreview();}};$('removeImageBtn').onclick=()=>{state.image=null;updateImagePreview();};$('categoryInput').onchange=e=>{if(e.target.value==='__new__'){const c=prompt('Neue Kategorie');if(c){e.target.innerHTML+=`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;e.target.value=c;}}};const textImportBtn = $('textImportBtn'); if (textImportBtn) textImportBtn.onclick = showTextImportModal;$('exportBtn').onclick=()=>exportRecipes(state.recipes);$('importBtn').onclick=showImportChooser;$('fileImportInput').onchange=e=>importFile(e.target.files[0]);
$('recipeForm').onsubmit=async e=>{e.preventDefault();const r=normalizeRecipe(state.editing);r.name=$('nameInput').value.trim();r.servings=Math.max(1,Number($('servingsInput').value)||1);r.description=$('descriptionInput').value.trim();r.rating=state.rating;r.image=state.image;r.favorite=state.editing.favorite;r.source={url:$('sourceUrlInput').value.trim(),name:$('sourceNameInput').value.trim()};r.notes=$('notesInput').value.trim();const cat=$('categoryInput').value; r.categories=cat&&cat!=='__new__'?[cat]:[];r.updatedAt=new Date().toISOString();if(r.categories[0]&&!state.categories.some(c=>c.name.toLowerCase()===r.categories[0].toLowerCase())){const category={id:newId(),name:r.categories[0],createdAt:new Date().toISOString()};state.categories.push(category);await putCategory(category);}await putRecipe(r);const idx=state.recipes.findIndex(x=>x.id===r.id);if(idx>=0)state.recipes[idx]=r;else state.recipes.push(r);closeModal();state.view='recipes';render();toast('Rezept gespeichert');};

document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{state.view=btn.dataset.view;state.category='Alle';render();});

async function initRecipeBook(){
  state.recipes=await getAllRecipes();
  state.categories=await getAllCategories();
  const known=new Set(state.categories.map(c=>c.name.toLowerCase()));
  const missing=state.recipes.flatMap(r=>r.categories||[]).filter(n=>n&&!known.has(n.toLowerCase()));
  for(const name of [...new Set(missing)]){const category={id:newId(),name,createdAt:new Date().toISOString()};state.categories.push(category);await putCategory(category);known.add(name.toLowerCase());}
  if(state.recipes.length===0){
    const demo=normalizeRecipe({ ...emptyRecipe(), name:'Cremige Tomatenpasta', description:'Schnelle Pasta mit Tomaten und Sahne.', servings:2, rating:5, favorite:true, categories:['Pasta'], sections:[{...emptySection('Sauce'),ingredients:[{...emptyIngredient(),amount:400,unit:'g',name:'Pasta',sortOrder:1},{...emptyIngredient(),amount:250,unit:'g',name:'Tomaten',sortOrder:2},{...emptyIngredient(),amount:200,unit:'ml',name:'Sahne',sortOrder:3},{...emptyIngredient(),amount:2,unit:'Stück',name:'Knoblauchzehen',sortOrder:4}]}], preparationSteps:[{...emptyStep(),step:1,text:'Pasta nach Packungsanleitung kochen.'},{...emptyStep(),step:2,text:'Tomaten und Knoblauch anbraten und die Sahne hinzufügen.'},{...emptyStep(),step:3,text:'Pasta unterheben und mit Parmesan servieren.'}] });
    await putRecipe(demo);state.recipes=[demo];
  }
  render();
}

initRecipeBook().catch(err => {
  console.error(err);
  const toastEl = $('toast');
  if (toastEl) { toastEl.textContent = 'Die Rezeptdaten konnten nicht geladen werden.'; toastEl.classList.add('show'); }
});
