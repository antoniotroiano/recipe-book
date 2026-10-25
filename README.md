# Mein Rezeptbuch

**Aktuelle Version:** `1.1.0`  
**Live-Anwendung:** [antoniotroiano.github.io/recipe-book](https://antoniotroiano.github.io/recipe-book/)

Eine responsive Web-App zum Sammeln und Organisieren persönlicher Rezepte. Sie ist für die Nutzung auf Desktop und Smartphone ausgelegt und kann ohne eigenes Backend betrieben werden.

## Design

Die Oberfläche verwendet einen „Modern Editorial Cookbook“-Stil: warme Papierfarben, zurückhaltende Salbei-Akzente, Terrakotta für wichtige Aktionen, Serifenschriften für Rezeptüberschriften und großzügige Rezeptbilder. Das Layout passt sich Desktop, Tablet und Smartphone an; die Eingabefelder und Touch-Ziele bleiben auf kleinen Bildschirmen gut bedienbar. Es werden keine zusätzlichen Build-Schritte oder CSS-Frameworks benötigt.

## Funktionen

- Rezepte mit Bild, Beschreibung, Portionen, Bewertung, Favoriten, Notizen und Originalquelle speichern
- Zutaten in getrennte Bereiche gliedern, zum Beispiel **Teig**, **Füllung** und **Glasur**
- Zubereitung in einzelne Schritte aufteilen
- Kategorien verwalten, Rezepte suchen, filtern und sortieren
- Rezepttext aus Instagram-Captions oder anderen Quellen einfügen und automatisch strukturieren lassen
- Einzelne Rezepte oder die gesamte Sammlung als ZIP sichern; versionierte JSON-Daten importieren und wiederherstellen
- Mobilfreundliche Eingabefelder und Bedienelemente

## Anwendung öffnen

Die einfachste Variante ist die [Live-Version auf GitHub Pages](https://antoniotroiano.github.io/recipe-book/).

Für eine lokale Kopie kannst du den Projektordner über einen lokalen HTTP-Server starten:

```bash
python3 -m http.server 8080
```

Führe den Befehl im Projektordner aus, in dem `index.html` liegt, und öffne dann <http://localhost:8080>.

> Hinweis: Die Anwendung nutzt IndexedDB. Ein Start über `file://` per Doppelklick wird deshalb nicht in jedem Browser zuverlässig unterstützt; ein lokaler HTTP-Server oder GitHub Pages ist besser geeignet.

## Datenspeicherung und Backups

- Rezepte und Kategorien werden in **IndexedDB des jeweiligen Browsers** gespeichert.
- Die Anwendung hat derzeit **kein Backend und keine automatische Synchronisierung**. Die Sammlung auf dem iPhone ist daher getrennt von der Sammlung auf dem Desktop.
- Exportiere regelmäßig ein Backup und bewahre es zusätzlich außerhalb des Browsers auf.
- Der Backup-Export enthält das versionierte Rezept-JSON sowie die Rezeptbilder. Vor einem größeren Import oder Austausch der Anwendung empfiehlt sich ein aktueller Export.

## Projektstruktur

```text
recipe-book/
├── index.html                 # HTML-Gerüst und Einbindung der Assets
├── css/
│   └── style.css              # Layout, Komponenten und responsive Darstellung
├── js/
│   ├── storage.js             # IndexedDB-Zugriff für Rezepte und Kategorien
│   ├── recipe-model.js        # Datenmodell, Normalisierung und Textparser
│   ├── ui.js                  # UI-Zustand, Rendering und Anzeigehilfen
│   └── app.js                 # Benutzeraktionen, Dialoge, Import/Export und Start
├── data/
│   └── schema-example.json    # Beispiel des versionierten JSON-Datenformats
├── VERSION                   # Aktuelle Anwendungs-Version
├── CHANGELOG.md              # Änderungen je Version
└── README.md                 # Projektübersicht und Anleitung
```

Die JavaScript-Dateien sind absichtlich als klassische Skripte eingebunden und werden in der Reihenfolge **Storage → Datenmodell → UI → App** geladen. So bleiben die Verantwortlichkeiten getrennt, ohne ein Build-System oder zusätzliche Installationsschritte vorauszusetzen. Alle Dateien werden relativ zur `index.html` referenziert, damit die App auch unter dem GitHub-Pages-Unterpfad `/recipe-book/` funktioniert.

## Exportformat und spätere Datenbank

Der Export verwendet das Format `recipe-book` mit einer eigenen Datenformat-Version. Diese Datenformat-Version ist unabhängig von der Anwendungs-Version. Die Struktur ist auf eine spätere Migration in relationale Tabellen ausgelegt, etwa für Rezepte, Zutatenbereiche, Zutaten, Zubereitungsschritte, Kategorien und Zuordnungen.

Ein Beispielexport bzw. eine Schema-Illustration liegt unter `data/schema-example.json`. Sie ist ein Beispiel zur Orientierung und kein Live-Datenbestand.

## Versionierung

Die Anwendung folgt semantischer Versionierung (`MAJOR.MINOR.PATCH`):

- **MAJOR** – inkompatible Änderungen
- **MINOR** – neue, abwärtskompatible Funktionen
- **PATCH** – Fehlerkorrekturen, Dokumentation oder interne Verbesserungen ohne neue Funktionalität

Die aktuelle Release-Historie steht in [`CHANGELOG.md`](CHANGELOG.md).

## Favicon und App-Symbol

Das Projekt enthält ein SVG-Favicon sowie PNG-Varianten für Browser-Tabs und iOS-Home-Bildschirme. Die Dateien werden relativ zu `index.html` eingebunden und funktionieren damit auch unter dem GitHub-Pages-Projektpfad `/recipe-book/`.
