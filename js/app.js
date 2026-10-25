/* Recipe Book application controller and initialization. */

const APP_VERSION = '1.1.0';
document.documentElement.dataset.appVersion = APP_VERSION;

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
      <button type="button" class="import-choice" id="importTextChoice"><span class="import-choice-icon">¶</span><strong>Rezepttext übernehmen</strong><span>Caption oder Rezepttext einfügen und automatisch in Felder aufteilen.</span></button>
      <button type="button" class="import-choice" id="importBackupChoice"><span class="import-choice-icon">↧</span><strong>Backup importieren</strong><span>Eine JSON- oder ZIP-Sicherung deiner Rezepte wiederherstellen.</span></button>
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
function updateImagePreview(){const source=safeImageSource(state.image);if(source){$('imagePreview').src=source;$('imagePreview').style.display='block';$('imagePlaceholder').style.display='none';}else{$('imagePreview').removeAttribute('src');$('imagePreview').style.display='none';$('imagePlaceholder').style.display='grid';}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}

function openDetail(id){const r=state.recipes.find(x=>x.id===id);if(!r)return;state.view='detail';$('viewTitle').textContent=r.name;$('viewSubtitle').textContent='Rezeptdetails';const imageSource=safeImageSource(r.image);const image=imageSource?`<img src="${imageSource}" alt="${escapeHtml(r.name)}">`:'<div class="card-placeholder"><span aria-hidden="true">✳</span><small>DEIN REZEPT</small></div>';$('detailView').innerHTML=`<button class="back-to-recipes" id="backToRecipesBtn" type="button">← Alle Rezepte</button><div class="detail-header"><div class="detail-image">${image}</div><div class="detail-main"><p class="eyebrow">REZEPT</p><h2>${escapeHtml(r.name)} ${r.favorite?'<span class="title-favorite" aria-label="Favorit">♥</span>':''}</h2><div class="detail-sub"><span class="stars">${stars(r.rating)}</span><span>·</span><span>${r.servings} Portionen</span>${r.categories?.length?`<span>·</span><span>${escapeHtml(r.categories.join(', '))}</span>`:''}</div><div class="detail-description">${renderMultilineText(r.description)}</div><div class="detail-actions"><button class="primary-button" id="detailEdit">Bearbeiten</button><button class="secondary-button" id="detailFav">${r.favorite?'♥ Favorit':'♡ Favorit'}</button><button class="secondary-button" id="detailExport">↧ Exportieren</button><button class="secondary-button" id="detailDelete">Löschen</button></div></div></div><div class="detail-layout"><section class="detail-panel"><h3>Zutaten</h3>${r.sections.map(s=>`<div class="ingredient-group"><h4>${escapeHtml(s.name)}</h4>${s.ingredients.map(i=>`<div class="ingredient-item"><strong>${escapeHtml(String(i.amount))} ${escapeHtml(i.unit)}</strong><span>${escapeHtml(i.name)}${i.note?` – ${escapeHtml(i.note)}`:''}</span></div>`).join('')}</div>`).join('')}</section><section class="detail-panel"><h3>Zubereitung</h3>${r.preparationSteps.map((s,i)=>`<div class="prep-step"><div class="step-number">${i+1}</div><div class="prep-step-text">${renderMultilineText(s.text)}</div></div>`).join('')||'<p class="muted">Noch keine Schritte hinterlegt.</p>'}${r.notes?`<div class="notes-box"><strong>Eigene Notiz</strong><div class="rich-text">${renderMultilineText(r.notes)}</div></div>`:''}${safeHttpUrl(r.source.url)?`<div class="notes-box"><strong>Originalquelle</strong><p><a class="source-link" href="${escapeHtml(safeHttpUrl(r.source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.source.name||r.source.url)}</a></p></div>`:''}</section></div>`;
  $('backToRecipesBtn').onclick=()=>{state.view='recipes';render();};$('detailEdit').onclick=()=>openModal(r);$('detailFav').onclick=async()=>{r.favorite=!r.favorite;r.updatedAt=new Date().toISOString();await putRecipe(r);openDetail(r.id);toast(r.favorite?'Zu Favoriten hinzugefügt':'Aus Favoriten entfernt');};$('detailDelete').onclick=async()=>{if(confirm(`„${r.name}“ wirklich löschen?`)){await deleteRecipe(r.id);state.recipes=state.recipes.filter(x=>x.id!==r.id);state.view='recipes';render();toast('Rezept gelöscht');}};$('detailExport').onclick=()=>exportRecipes([r],`${slugify(r.name)}.zip`);render();}
function slugify(s){return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9äöüß]+/gi,'-').replace(/^-|-$/g,'')||'rezept';}

async function exportRecipes(recipes,filename='Meine-Rezepte.zip'){
  const bundle=buildExport(recipes);if(window.JSZip){const zip=new JSZip();zip.file('recipes.json',JSON.stringify(bundle,null,2));const folder=zip.folder('images');for(const r of recipes){if(r.image&&r.image.includes(',')){const [header,data]=r.image.split(',');const ext=(header.match(/data:image\/(\w+)/)||[])[1]||'jpeg';folder.file(`${r.id}.${ext}`,data,{base64:true});}}const blob=await zip.generateAsync({type:'blob'});download(blob,filename);}else download(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),filename.replace(/\.zip$/i,'.json'));toast('Export erstellt');}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

async function importFile(file){
  if(!file)return;let parsed;try{if(file.name.toLowerCase().endsWith('.zip')){if(!window.JSZip)throw new Error('ZIP-Unterstützung nicht geladen');const zip=await JSZip.loadAsync(file);const json=zip.file('recipes.json');if(!json)throw new Error('recipes.json fehlt');parsed=JSON.parse(await json.async('text'));for(const r of parsed.recipes||[]){const match=Object.keys(zip.files).find(k=>k.startsWith('images/'+r.id+'.'));if(match){const blob=await zip.file(match).async('blob');r.image=await readFile(blob);}}}else{parsed=JSON.parse(await file.text());}
  if(parsed.format!=='recipe-book')throw new Error('Unbekanntes Rezeptformat');const incoming=(parsed.recipes||[]).map(normalizeRecipe);if(!incoming.length)throw new Error('Keine Rezepte enthalten');const mode=confirm(`Import gefunden: ${incoming.length} Rezept(e).\n\nOK = vorhandene Rezepte anhand der ID aktualisieren\nAbbrechen = Importvorgang abbrechen`);if(!mode)return;const map=new Map(state.recipes.map(r=>[r.id,r]));incoming.forEach(r=>map.set(r.id,r));state.recipes=[...map.values()];
  const importedCategories=Array.isArray(parsed.categories)?parsed.categories.map(c=>typeof c==='string'?{id:newId(),name:c}:{id:normalizeId(c.id),name:String(c.name||'').trim(),createdAt:c.createdAt||new Date().toISOString()}).filter(c=>c.name):[];
  const catMap=new Map(state.categories.map(c=>[c.name.toLowerCase(),c]));
  importedCategories.forEach(c=>{if(!catMap.has(c.name.toLowerCase()))catMap.set(c.name.toLowerCase(),c);});
  state.recipes.flatMap(r=>r.categories||[]).forEach(name=>{if(!catMap.has(name.toLowerCase()))catMap.set(name.toLowerCase(),{id:newId(),name,createdAt:new Date().toISOString()});});
  state.categories=[...catMap.values()];
  await replaceAll(state.recipes);
  for(const c of state.categories) await putCategory(c);
  state.view='recipes';state.category='Alle';render();toast(`${incoming.length} Rezept(e) importiert`);
  }catch(err){console.error(err);alert(`Import fehlgeschlagen: ${err.message}`);}}

function showCategoryModal(options = {}){
  const existing=document.getElementById('categoryModal');
  if(existing) existing.remove();
  const wrapper=document.createElement('div');
  wrapper.id='categoryModal';
  wrapper.className='modal-backdrop';
  wrapper.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="categoryModalTitle">
    <div class="modal-header"><div><p class="eyebrow">KATEGORIE</p><h2 id="categoryModalTitle">Kategorie hinzufügen</h2></div><button type="button" class="icon-button" data-close-category>×</button></div>
    <label>Kategoriename<input id="newCategoryInput" maxlength="80" placeholder="z. B. Pasta, Dessert, Backen"></label>
    <div class="modal-footer"><button type="button" class="secondary-button" data-close-category>Abbrechen</button><button type="button" class="primary-button" id="saveNewCategoryBtn">Kategorie anlegen</button></div>
  </div>`;
  document.body.appendChild(wrapper);
  const close=()=>wrapper.remove();
  wrapper.querySelectorAll('[data-close-category]').forEach(btn=>btn.addEventListener('click',close));
  wrapper.addEventListener('click',e=>{if(e.target===wrapper)close();});
  const input=wrapper.querySelector('#newCategoryInput');
  const save=async()=>{
    const name=input.value.trim();
    if(!name){input.focus();return;}
    if(categories().some(c=>c.toLowerCase()===name.toLowerCase())){toast('Diese Kategorie gibt es bereits.');input.focus();return;}
    const category={id:newId(),name,createdAt:new Date().toISOString()};
    state.categories.push(category);
    await putCategory(category);
    close();
    if (options.selectInRecipe && !$('recipeModal').classList.contains('hidden')) {
      populateCategorySelect(name);
      if (state.editing) state.editing.categories = [name];
      toast('Kategorie angelegt und dem Rezept zugeordnet');
      return;
    }
    state.category=name;state.view='recipes';render();toast('Kategorie angelegt');
  };
  wrapper.querySelector('#saveNewCategoryBtn').addEventListener('click',save);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
  setTimeout(()=>input.focus(),30);
}
function bindAction(id, handler){const el=$(id);if(!el)return;el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();Promise.resolve(handler(e)).catch(err=>{console.error(err);alert(err.message||String(err));});},{passive:false});}
bindAction('newRecipeBtn',()=>openModal());bindAction('emptyNewBtn',()=>openModal());const emptyImport=$('emptyImportBtn');if(emptyImport)emptyImport.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showTextImportModal();});bindAction('closeModalBtn',closeModal);bindAction('cancelModalBtn',closeModal);$('recipeModal').onclick=e=>{if(e.target===$('recipeModal'))closeModal()};$('searchInput').oninput=e=>{state.search=e.target.value;renderCards();};$('sortSelect').onchange=e=>{state.sort=e.target.value;renderCards();};
// Desktop controls use direct handlers; mobile toolbar controls use one delegated handler below.
bindAction('addCategoryBtn',()=>showCategoryModal());
$('ratingInput').addEventListener('click', e => {
  const button = e.target.closest('button[data-rate]');
  if (!button || button.disabled) return;
  e.preventDefault();
  state.rating = Math.max(0, Math.min(5, Number(button.dataset.rate) || 0));
  if (state.editing) state.editing.rating = state.rating;
  renderRating();
});
bindAction('addSectionBtn',()=>{state.editing.sections.push(emptySection(`Bereich ${state.editing.sections.length+1}`));renderSections(state.editing);});
bindAction('addStepBtn',()=>{state.editing.preparationSteps.push(emptyStep());renderSteps(state.editing);});
$('imageInput').onchange=async e=>{if(e.target.files[0]){state.image=await readFile(e.target.files[0]);updateImagePreview();}};bindAction('removeImageBtn',()=>{state.image=null;updateImagePreview();});$('categoryInput').onchange=e=>{if(e.target.value==='__new__'){showCategoryModal({selectInRecipe:true});e.target.value='';}};const textImportBtn = $('textImportBtn'); if (textImportBtn) textImportBtn.addEventListener('click',showTextImportModal);bindAction('exportBtn',()=>exportRecipes(state.recipes));bindAction('importBtn',showImportChooser);$('fileImportInput').onchange=e=>importFile(e.target.files[0]);

// Mobile toolbar uses one capture-phase delegate to keep touch and click behavior consistent on iOS.
document.addEventListener('click', e => {
  const target = e.target.closest?.('#mobileCategoryBtn,#mobileImportBtn,#mobileExportBtn');
  if (!target) return;
  e.preventDefault(); e.stopPropagation();
  try {
    if (target.id === 'mobileCategoryBtn') showCategoryModal();
    else if (target.id === 'mobileImportBtn') showImportChooser();
    else if (target.id === 'mobileExportBtn') exportRecipes(state.recipes).catch(err => { console.error(err); alert(err.message || String(err)); });
  } catch (err) {
    console.error(err); alert(err.message || String(err));
  }
}, { capture: true });
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
