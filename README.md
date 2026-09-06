# Mein Rezeptbuch – Prototyp v5

Lokale Web-App für die persönliche Rezeptverwaltung.

## Start
`index.html` kann direkt per Doppelklick geöffnet werden. Alternativ funktioniert ein lokaler Webserver oder GitHub Pages.

## Import
Der Button **Import** bietet zwei Möglichkeiten:
- **Rezepttext übernehmen**: Instagram-Caption/Rezepttext einfügen und automatisch in Rezeptfelder aufteilen.
- **Backup importieren**: zuvor exportierte JSON-/ZIP-Datei wiederherstellen.

## Speicherung
Rezepte werden lokal in IndexedDB gespeichert. Bilder werden als Teil des Backups berücksichtigt.

## Exportformat
Das Datenformat ist versioniert (`format: recipe-book`, `version: 1`) und relational strukturiert, damit es später auf ein Backend mit SQL-Datenbank migriert werden kann.
