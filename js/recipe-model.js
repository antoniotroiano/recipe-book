/* Recipe data model, normalization, backup format, and plain-text parser. */

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

function cloneData(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(value) {
  const id = String(value || '');
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id) ? id : newId();
}

function safeImageSource(value) {
  const source = String(value || '');
  return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(source) ? source : null;
}

function normalizeRecipe(input) {
  const r = cloneData(input || {});
  r.id = normalizeId(r.id);
  r.name = String(r.name || 'Unbenanntes Rezept');
  r.description = String(r.description || '');
  r.servings = Math.min(100, Math.max(1, Math.round(Number(r.servings) || 1)));
  r.rating = Math.round(Math.max(0, Math.min(5, Number(r.rating) || 0)));
  r.favorite = Boolean(r.favorite);
  r.image = safeImageSource(r.image);
  r.source = { url: String(r.source?.url || ''), name: String(r.source?.name || '') };
  r.notes = String(r.notes || '');
  r.categories = Array.isArray(r.categories) ? r.categories.map(String) : [];
  r.tags = Array.isArray(r.tags) ? r.tags.map(String) : [];
  r.sections = (Array.isArray(r.sections) && r.sections.length ? r.sections : [emptySection('Zutaten')]).map((s, si) => ({
    id: normalizeId(s.id), name: String(s.name || `Bereich ${si + 1}`), sortOrder: si + 1,
    ingredients: (Array.isArray(s.ingredients) ? s.ingredients : []).map((i, ii) => ({
      id: normalizeId(i.id), amount: i.amount ?? '', unit: String(i.unit || ''), name: String(i.name || ''), note: String(i.note || ''), sortOrder: ii + 1
    }))
  }));
  r.preparationSteps = (Array.isArray(r.preparationSteps) ? r.preparationSteps : []).map((s, i) => ({ id: normalizeId(s.id), step: i + 1, text: String(s.text || '') }));
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

const RECIPE_UNIT_PATTERN = '(?:kg|g|mg|ml|cl|dl|l|tl|el|teelöffel|esslöffel|prise|prisen|stück|stk\\.?|bund|packung|päckchen|dose|dosen|becher|scheibe|scheiben|zehe|zehen|tasse|tassen|glas|gläser|cup|cups|oz|lb|handvoll|scoop|pkg\\.?)';
const RECIPE_AMOUNT_PATTERN = '(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])';

function looksLikeIngredient(line) {
  const s = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s+/, '');
  // A sentence like "Ein saftiger Kuchen." is description text, not an ingredient.
  if (/^(?:ein|eine|einen|einem|einer|eines)\s+/i.test(s) && /[.!?]$/.test(s)
      && !/^(?:ein|eine|einen|einem|einer|eines)\s+(?:paar|prise|prisen|bund|stück|packung|päckchen|dose|becher|scheibe|zehe|tasse|glas)\b/i.test(s)) return false;
  const measuredAmount = new RegExp('^' + RECIPE_AMOUNT_PATTERN + '(?:\\s*' + RECIPE_UNIT_PATTERN + ')?\\s+\\S', 'i');
  if (measuredAmount.test(s)) return true;
  return /^(?:ein paar|eine?\s|einen?\s|einem?\s|einer\s|etwas|ca\.?\s*\d|nach\s+geschmack|nach\s+belieben|wenig|reichlich)\b/i.test(s)
    || /\b(nach geschmack|nach belieben|nach bedarf|zum braten|zum bestreichen|zum einfetten|zum einreiben)\b/i.test(s)
    || /\b(g|kg|mg|ml|l|cl|dl|tl|el|teelöffel|esslöffel|prise|prisen|stück|stk\.?|bund|packung|päckchen|dose|dosen|becher|scheibe|scheiben|zehe|zehen)\b/i.test(s);
}

function isIngredientSectionTitle(line, blankBefore, currentSection) {
  const value = cleanLine(line).replace(/^[-•*–—]+\s*/, '').trim();
  if (/[:：]\s*$/.test(value) || /^(?:für|for)\s+/i.test(value)) return true;
  if (/^(?:teig|boden|glasur|füllung|fuellung|topping|frosting|ganache|creme|crème|soße|sosse|sauce|marinade|belag|streusel|deko|dekoration|sirup|kruste|dressing|dip|salsa|buttercreme|cremefüllung|cremefuellung)(?:\s|$)/i.test(value)) return true;
  return Boolean(blankBefore && currentSection && currentSection.ingredients.length && value.length <= 55 && isHeading(value) && !looksLikeIngredient(value));
}

function isPrepHeading(line) {
  return /^(zubereitung|anleitung|so geht['’]s|so gehts|zubereitungsschritte|methode|steps?)\s*:?\s*$/i.test(
    cleanLine(line).replace(/^[-•*]\s*/, '')
  );
}

function isIngredientHeading(line) {
  return /^(?:zutaten|ingredients?)\b/i.test(cleanLine(line).replace(/^[-•*]\s*/, ''));
}

function ingredientSectionNameFromHeading(line) {
  const value = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/[:：]\s*$/, '').trim();
  const match = value.match(/^(?:zutaten|ingredients?)\s+(?:für|for)\s+(.+)$/i);
  if (!match) return '';
  return normalizeSectionName(match[1]);
}

function normalizeSectionName(value) {
  return String(value || '')
    .replace(/^(?:(?:für|for)\s+)?(?:(?:den|die|das|der|dem|des|ein|eine|einen|einem|einer|the)\s+)/i, '')
    .replace(/[:：]\s*$/, '')
    .trim();
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
  const s = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s+/, '').trim();
  const match = s.match(new RegExp('^(' + RECIPE_AMOUNT_PATTERN + ')(?:\\s*(' + RECIPE_UNIT_PATTERN + '))?\\s+(.+)$', 'i'));
  if (match) {
    return { amount: match[1].replace(',', '.'), unit: match[2] || '', name: match[3].trim(), note: '' };
  }
  const qualitative = s.match(/^(ein paar|eine?|einer|eines|einem|etwas|nach geschmack|nach belieben|wenig|reichlich)\s+(.+)$/i);
  if (qualitative) return { amount: qualitative[1], unit: '', name: qualitative[2].trim(), note: '' };
  return { amount: '', unit: '', name: s, note: '' };
}

function parseRecipeText(input) {
  const normalized = normalizeBulletSeparators(String(input || '').replace(/\r\n?/g, '\n')).trim();
  if (!normalized) throw new Error('Bitte zuerst einen Rezepttext einfügen.');

  const lines = normalized.split('\n').map(cleanLine);
  while (lines.length && !lines[0]) lines.shift();
  const name = (lines.shift() || 'Importiertes Rezept').replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s+/, '').trim();

  const descriptionLines = [];
  const sections = [];
  const preparationLines = [];
  let mode = 'intro';
  let currentSection = null;
  let blankBefore = false;

  const startSection = (sectionName = 'Zutaten') => {
    currentSection = { name: sectionName || 'Zutaten', ingredients: [] };
    sections.push(currentSection);
    return currentSection;
  };

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) {
      if (mode === 'intro' && descriptionLines.length && descriptionLines[descriptionLines.length - 1] !== '') descriptionLines.push('');
      blankBefore = true;
      continue;
    }
    const wasBlankBefore = blankBefore;
    blankBefore = false;

    if (isPrepHeading(line)) {
      mode = 'prep';
      currentSection = null;
      continue;
    }

    if (isIngredientHeading(line)) {
      mode = 'ingredients';
      const namedSection = ingredientSectionNameFromHeading(line);
      currentSection = namedSection ? startSection(namedSection) : null;
      continue;
    }

    if (mode === 'intro') {
      // Captions without an explicit "Zutaten" heading are supported as well.
      if (looksLikeIngredient(line)) {
        mode = 'ingredients';
        currentSection = startSection('Zutaten');
        currentSection.ingredients.push(parseIngredientLine(line));
      } else {
        descriptionLines.push(line);
      }
      continue;
    }

    if (mode === 'ingredients') {
      const sectionTitle = normalizeSectionName(line);
      if (!looksLikeIngredient(line) && isIngredientSectionTitle(line, wasBlankBefore, currentSection)) {
        currentSection = startSection(sectionTitle || `Bereich ${sections.length + 1}`);
        continue;
      }
      if (!currentSection) currentSection = startSection('Zutaten');
      currentSection.ingredients.push(parseIngredientLine(line));
      continue;
    }

    if (mode === 'prep') preparationLines.push(line);
  }

  const description = descriptionLines.join('\n').replace(/^\n+|\n+$/g, '');
  const cleanedSections = sections.map(section => ({
    ...section,
    ingredients: section.ingredients.filter(i => i.name).slice(0, 100)
  })).filter(section => section.ingredients.length || section.name);

  return {
    name,
    description,
    sections: cleanedSections.length ? cleanedSections : [{ name: 'Zutaten', ingredients: [] }],
    preparationSteps: splitPreparationLines(preparationLines).slice(0, 100),
  };
}



