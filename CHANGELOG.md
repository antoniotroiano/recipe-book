# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten. Die aktuelle Version bleibt **1.1.0**, bis eine neue Version ausdrücklich freigegeben wird.

## 1.1.0 — noch nicht deployed

### Fixed
- Rating selection uses a dedicated group rather than placing multiple buttons inside a `<label>`, with large touch targets and a clear-rating control.
- Rating state is retained while editing and persisted when saving the recipe.
- Mobile controls use a single delegated click path.
- Recipe detail heading no longer resets to “Meine Rezepte”.
- New categories created from the recipe editor are selected for the recipe.
- Original-source links are restricted to HTTP/HTTPS URLs.
- Imported IDs and image sources are validated before rendering.

### Improved
- Text import recognizes sections such as “Zutaten für den Teig” and “Zutaten für die Glasur”.
- Ingredient parser uses known measurement units so words such as “große” and “kleine” are not mistaken for units; decimals, compact quantities (e.g. `250g`) and fractions are supported.
- Mobile star buttons have larger tap targets and accessible names/states.
- Documentation was organized and now links to the live GitHub Pages URL.
- JavaScript responsibilities are separated into persistence, recipe model/parser, UI rendering, and application control.
- HTML, CSS and JavaScript cache-busting identifiers are standardized to 1.1.0.

### Design refinement (not deployed yet)
- Updated the visual style to a modern editorial cookbook look, with warm paper tones, sage accents, refined typography and clearer recipe cards.
- Improved responsive spacing, card imagery, search controls, dialogs, details and touch targets.
- Replaced several emoji UI symbols with more consistent line and text symbols.
- Kept the application version at 1.1.0 as requested.

### Compatibility
- Database name, IndexedDB store names and versioned export format remain unchanged so existing local recipe data can continue to be used.
