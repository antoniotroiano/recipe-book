export const EXPORT_FORMAT = 'recipe-book';
export const EXPORT_VERSION = 1;

export function newId() {
  return '01' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function emptyRecipe() {
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

export function emptySection(name = 'Zutaten') {
  return { id: newId(), name, sortOrder: 1, ingredients: [emptyIngredient()] };
}

export function emptyIngredient() {
  return { id: newId(), amount: '', unit: '', name: '', note: '', sortOrder: 1 };
}

export function emptyStep() { return { id: newId(), step: 1, text: '' }; }

export function normalizeRecipe(input) {
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

export function buildExport(recipes) {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), recipes: recipes.map(normalizeRecipe) };
}
