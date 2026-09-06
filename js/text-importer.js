function cleanLine(line) {
  return line.replace(/\r/g, '').trim();
}

function isHeading(line) {
  const value = cleanLine(line).replace(/^[-•*–—]+\s*/, '').replace(/[:：]\s*$/, '').trim();
  if (!value || value.length > 90) return false;
  if (/^(zutaten|ingredients?|zubereitung|anleitung|so geht['’]s|so gehts|zubereitungsschritte|methode|steps?)\b/i.test(value)) return true;
  return /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß &'’/-]{2,60}$/.test(value) && !/[.!?]/.test(value);
}

function looksLikeIngredient(line) {
  const s = cleanLine(line).replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '');
  return /^(\d+(?:[.,]\d+)?|\d+\/\d+|ein paar|eine?\s|etwas|ca\.?\s*\d|nach\s+geschmack|nach\s+belieben|wenig|reichlich)\b/i.test(s)
    || /\b(g|kg|ml|l|cl|tl|el|teelöffel|esslöffel|prise|prisen|stück|st7ck|bund|packung|päckchen|dose|dosen|becher|scheibe|scheiben|zehe|zehen)\b/i.test(s);
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

export function parseRecipeText(input) {
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
