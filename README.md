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

## Feld-Mapping kalibrieren

Die Feldnamen offizieller PDF-Formulare unterscheiden sich je nach Auflage/Revision. Das mitgelieferte Mapping für 2014 basiert auf den seit Jahren dokumentierten Standard-Feldnamen; das 2024-Mapping (`src/field-map/2024.json`) ist **unverifiziert** und muss vor der ersten Nutzung befüllt werden.

So findest du die echten Feldnamen deines PDFs:

```js
await game.modules.get("dnd5e-pdf-exporter").api.listPdfFields();
```

Das listet in der Konsole alle Formularfelder (Name + Typ) des aktuell konfigurierten PDFs auf.

**Falls die Feldnamen wie `text_1imkp` oder `checkbox_78ywrl` aussehen:** Das PDF wurde nicht mit den originalen WotC-Feldnamen erstellt, sondern per Auto-Erkennung fillable gemacht — die Namen sind bedeutungslose IDs, nur ihre Position im Dokument zählt. In dem Fall hilft `listPdfFields()` allein nicht viel weiter; stattdessen:

```js
await game.modules.get("dnd5e-pdf-exporter").api.debugAnnotateFieldNames();
```

Das erzeugt ein PDF, in dem jedes Textfeld mit seinem eigenen internen Namen befüllt und jede Checkbox angehakt ist. Öffne die heruntergeladene Datei und lies direkt an jeder Position im Bogen ab, welcher interne Name dazugehört (z. B. steht im STR-Feld dann `text_9efgi`).

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

## Lizenz

MIT (Modul-Code). `scripts/vendor/pdf-lib.min.js` ist die unveränderte, MIT-lizenzierte Browser-Bundle-Datei von [pdf-lib](https://github.com/Hopding/pdf-lib) (Lizenztext liegt daneben in `pdf-lib.LICENSE.md`). Das WotC-Charakterbogen-PDF selbst unterliegt eigenem Copyright und ist nicht Teil dieses Repos.
