/* Shared UI state, rendering, and presentation helpers. */

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
  recipeGrid.innerHTML=list.map(r=>{
    const image = safeImageSource(r.image);
    return `<article class="recipe-card" data-id="${escapeHtml(r.id)}">
      <div class="card-image">${image?`<img src="${image}" alt="${escapeHtml(r.name)}">`:'<div class="card-placeholder"><span aria-hidden="true">✳</span><small>DEIN REZEPT</small></div>'}<button class="favorite-button" data-fav="${escapeHtml(r.id)}" title="Favorit" aria-label="Favorit" aria-pressed="${r.favorite}">${r.favorite?'♥':'♡'}</button></div>
      <div class="card-body"><h3 class="card-title">${escapeHtml(r.name)}</h3><div class="card-meta"><span class="stars">${stars(r.rating)}</span><span>·</span><span>${r.servings} Portionen</span></div><div class="card-tags">${(r.categories||[]).slice(0,2).map(c=>`<span class="mini-tag">${escapeHtml(c)}</span>`).join('')}</div></div></article>`;
  }).join('');
  $('emptyState').classList.toggle('hidden',list.length!==0); recipeGrid.classList.toggle('hidden',list.length===0);
  document.querySelectorAll('.recipe-card').forEach(card=>card.onclick=(e)=>{if(e.target.closest('.favorite-button'))return; openDetail(card.dataset.id);});
  document.querySelectorAll('[data-fav]').forEach(btn=>btn.onclick=async(e)=>{e.stopPropagation();const r=state.recipes.find(x=>x.id===btn.dataset.fav);if(!r)return;r.favorite=!r.favorite;r.updatedAt=new Date().toISOString();await putRecipe(r);render();toast(r.favorite?'Zu Favoriten hinzugefügt':'Aus Favoriten entfernt');});
}

function render(){
  $('recipeView').classList.toggle('hidden', state.view==='detail');
  $('detailView').classList.toggle('hidden', state.view!=='detail');
  if (state.view !== 'detail') {
    $('viewTitle').textContent=state.view==='favorites'?'Favoriten':'Meine Rezepte';
    $('viewSubtitle').textContent=state.view==='favorites'?'Deine Lieblingsrezepte an einem Ort.':'Alles, was du gern wiederkochst.';
    renderSidebar(); renderChips(); renderCards();
  }
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));
}

function renderRating(){
  const selected = Number(state.rating) || 0;
  $('ratingInput').innerHTML = Array.from({length:5},(_,i)=>{
    const value=i+1;
    return `<button type="button" class="rating-star ${value<=selected?'active':''}" data-rate="${value}" aria-label="${value} von 5 Sternen" aria-pressed="${value===selected}" title="${value} von 5 Sternen">★</button>`;
  }).join('') + `<button type="button" class="rating-clear" data-rate="0" aria-label="Bewertung entfernen" title="Bewertung entfernen" ${selected===0?'disabled':''}>×</button>`;
}
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
function safeHttpUrl(value='') {
  try {
    const url = new URL(String(value || ''), window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
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


