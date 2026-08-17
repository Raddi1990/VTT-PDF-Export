# D&D 5e PDF Character Exporter

Foundry-VTT-Modul (läuft auch auf [Forge VTT](https://forge-vtt.com/), da Forge ein gehosteter Foundry-Server ist), das im Charakterbogen eines `dnd5e`-Actors (2024-Regelwerk) einen Button hinzufügt, der die Charakterwerte in das offizielle ausfüllbare WotC-PDF-Formular einträgt und herunterlädt.

## ⚠️ Rechtlicher Hinweis

Das offizielle WotC-Charakterbogen-PDF ist urheberrechtlich geschützt und liegt **nicht** diesem Modul bei. Du musst deine eigene, legal beschaffte Kopie des Formulars besorgen (z. B. von der offiziellen D&D-Website) und den Pfad dazu in den Moduleinstellungen hinterlegen.

## Setup

Kein Build-Schritt nötig — `pdf-lib` liegt als fertiges Browser-Bundle unter `scripts/vendor/pdf-lib.min.js` bei, das Modul lädt seinen eigenen Code direkt als ES-Module (`src/module.js`).

1. Modul-Ordner (bzw. das ganze Repo) nach `Data/modules/dnd5e-pdf-exporter` deiner Foundry-Instanz kopieren, oder als Manifest-URL installieren (siehe unten).
2. Modul in Foundry aktivieren (Welt mit `dnd5e`-System, 2024-Regeln).
3. Deine eigene PDF-Kopie irgendwo in Foundrys Data-Verzeichnis ablegen (z. B. per Datei-Browser hochladen).
4. In den Moduleinstellungen:
   - **Pfad zur PDF-Vorlage** auf die hochgeladene Datei setzen.
   - **Charakterbogen-Edition** auf `2014` oder `2024` setzen, je nachdem welches Formular du hast.
5. Charakterbogen eines PCs öffnen → neuer PDF-Icon-Button im Fenster-Header → klicken.

**Hinweis für Forge VTT:** Forge lädt die Spielsitzung in einem iframe, das automatisch ausgelöste Datei-Downloads teilweise blockiert. Das Modul versucht trotzdem einen normalen Download, öffnet das fertige PDF aber zusätzlich immer in einem Fenster innerhalb von Foundry — darin hat der eingebaute PDF-Viewer deines Browsers ein eigenes Download-/Speichern-Symbol in der Werkzeugleiste, das von dieser Einschränkung nicht betroffen ist.

## Feld-Mapping kalibrieren

Die Feldnamen offizieller PDF-Formulare unterscheiden sich je nach Auflage/Revision. Das mitgelieferte Mapping für 2014 basiert auf den seit Jahren dokumentierten Standard-Feldnamen. Das 2024-Mapping (`src/field-map/2024.json`) wurde am 2026-08-17 anhand eines konkreten `debugAnnotateFieldNames()`-Exports (Formularversion `670D3898000001`) befüllt und deckt bereits alle Text- und Freitextfelder ab (Name, Werte, Attribute, Waffentabelle, Zauber-Header, Geld, Sprachen, Hintergrundtext, …).

**Noch nicht enthalten sind alle Checkboxen** (Rettungswurf-/Fertigkeiten-Proficiency, Todesrettungswürfe, Rüstungstraining, Zaubervorbereitung/-plätze) sowie die große Zauberliste und drei Freitext-Boxen auf Seite 1 (Class Features, Species Traits, Feats) — Details dazu steht im `_note`-Feld von `src/field-map/2024.json`.

So findest du die echten Feldnamen deines PDFs, falls du das Mapping erweitern oder für eine andere PDF-Version neu aufbauen willst:

```js
await game.modules.get("dnd5e-pdf-exporter").api.listPdfFields();
```

Das listet in der Konsole alle Formularfelder (Name + Typ) des aktuell konfigurierten PDFs auf.

**Falls die Feldnamen wie `text_1imkp` oder `checkbox_78ywrl` aussehen:** Das PDF wurde nicht mit den originalen WotC-Feldnamen erstellt, sondern per Auto-Erkennung fillable gemacht — die Namen sind bedeutungslose IDs, nur ihre Position im Dokument zählt. In dem Fall hilft `listPdfFields()` allein nicht viel weiter; stattdessen:

```js
await game.modules.get("dnd5e-pdf-exporter").api.debugAnnotateFieldNames();
```

Das zeichnet den internen Namen jedes Feldes direkt an dessen Position auf die Seite (funktioniert dadurch auch für Checkboxen, die sonst alle gleich aussehen) und öffnet das Ergebnis in einem Fenster in Foundry (siehe Hinweis oben, falls der automatische Download nicht anspringt). Lies direkt an jeder Position im Bogen ab, welcher interne Name dazugehört.

Trage die passenden Namen anschließend in `src/field-map/2024.json` ein (kein Build-Schritt nötig, einfach speichern und den Charakterbogen in Foundry neu öffnen).

Alternativ kannst du in den Moduleinstellungen unter **Eigenes Feld-Mapping** eine eigene JSON-Datei (gleiches Format wie `src/field-map/2014.json`) hinterlegen.

## Entwicklung

- Datenextraktion aus dem Actor: `src/actor-data.js`.
- PDF-Befüllung (pdf-lib): `src/pdf-filler.js`.
- Button-Injection in den Sheet-Header: `src/module.js`.

**Bekannte offene Baustelle:** Der Button wird über die Render-Hooks `renderActorSheet`, `renderApplicationV2` und `renderActorSheetV2` per DOM-Injection eingefügt, um sowohl mit alten (AppV1) als auch mit den aktuellen ApplicationV2-Charakterbögen von dnd5e kompatibel zu sein. Das wurde noch nicht gegen eine echte dnd5e-v4-Installation getestet — bei Bedarf Hook-Namen/Selektoren (`.window-header`) anpassen.

## Installation in Forge VTT

Manifest-URL (`module.json` direkt aus dem `main`-Branch):

```
https://raw.githubusercontent.com/Raddi1990/VTT-PDF-Export/main/module.json
```

In Forge: **Setup → Install Module → Manifest URL** → obige URL eintragen.

Neue Versionen werden als GitHub-Release (mit `module.zip`) veröffentlicht; die `download`-URL in der `module.json` zeigt jeweils auf das zum aktuellen `version`-Feld passende Tag, siehe [Releases](https://github.com/Raddi1990/VTT-PDF-Export/releases).

### Release-Skript

`tools/release.ps1` erledigt einen kompletten Release in einem Rutsch: `module.json`-Version hochzählen, committen/pushen, `module.zip` bauen, GitHub-Release anlegen und das Zip hochladen.

```powershell
.\tools\release.ps1 -Token "github_pat_..." 
# oder mit expliziter Version und Release-Notes:
.\tools\release.ps1 -Token "github_pat_..." -Version 1.0.0 -Notes "Erste stabile Version." -Prerelease:$false
```

Ohne `-Version` wird die Patch-Version aus `module.json` automatisch um 1 erhöht. Der Token braucht "Contents: Read and write" für dieses Repo (siehe oben) und wird nirgends gespeichert.

## Lizenz

MIT (Modul-Code). `scripts/vendor/pdf-lib.min.js` ist die unveränderte, MIT-lizenzierte Browser-Bundle-Datei von [pdf-lib](https://github.com/Hopding/pdf-lib) (Lizenztext liegt daneben in `pdf-lib.LICENSE.md`). Das WotC-Charakterbogen-PDF selbst unterliegt eigenem Copyright und ist nicht Teil dieses Repos.
