import { extractCharacterData } from "./actor-data.js";
import { MODULE_ID } from "./settings.js";

// pdf-lib is loaded as a plain script (scripts/vendor/pdf-lib.min.js) and
// exposes itself as the global `PDFLib`, so no bundler is required.
const { PDFDocument, ParseSpeeds } = PDFLib;

// Default parsing is thorough but can take many seconds on real-world
// fillable forms; Fastest is safe for well-formed PDFs like official
// character sheets and cuts load time drastically.
const LOAD_OPTIONS = { parseSpeed: ParseSpeeds.Fastest };

async function loadBundledMap(profile) {
  const url = new URL(`./field-map/${profile}.json`, import.meta.url);
  const response = await fetch(url);
  return response.json();
}

function flattenData(data, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenData(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

async function loadFieldMap() {
  const customPath = game.settings.get(MODULE_ID, "customFieldMapPath");
  if (customPath) {
    try {
      const res = await fetch(customPath);
      if (res.ok) return res.json();
      ui.notifications.warn(game.i18n.localize("PDFEXPORT.WarnCustomMapFailed"));
    } catch (err) {
      console.warn(`${MODULE_ID} | Konnte eigenes Feld-Mapping nicht laden:`, err);
      ui.notifications.warn(game.i18n.localize("PDFEXPORT.WarnCustomMapFailed"));
    }
  }
  const profile = game.settings.get(MODULE_ID, "sheetProfile");
  return loadBundledMap(profile === "2014" ? "2014" : "2024");
}

async function fetchTemplateBytes() {
  const path = game.settings.get(MODULE_ID, "pdfTemplatePath");
  if (!path) {
    ui.notifications.error(game.i18n.localize("PDFEXPORT.ErrorNoTemplate"));
    return null;
  }
  const response = await fetch(path);
  if (!response.ok) {
    ui.notifications.error(game.i18n.format("PDFEXPORT.ErrorTemplateFetch", { status: response.status }));
    return null;
  }
  return response.arrayBuffer();
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportActorToPdf(actor) {
  const templateBytes = await fetchTemplateBytes();
  if (!templateBytes) return;

  const data = flattenData(extractCharacterData(actor));
  const fieldMap = await loadFieldMap();

  const pdfDoc = await PDFDocument.load(templateBytes, LOAD_OPTIONS);
  const form = pdfDoc.getForm();

  for (const [dataKey, fieldName] of Object.entries(fieldMap)) {
    if (dataKey.startsWith("_") || !fieldName) continue;
    const value = data[dataKey];
    if (value === undefined || value === null || value === "") continue;
    try {
      if (typeof value === "boolean") {
        const checkbox = form.getCheckBox(fieldName);
        value ? checkbox.check() : checkbox.uncheck();
      } else {
        const field = form.getTextField(fieldName);
        field.setText(String(value));
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | Feld "${fieldName}" (${dataKey}) konnte nicht befuellt werden:`, err);
    }
  }

  if (game.settings.get(MODULE_ID, "flattenPdf")) form.flatten();

  const pdfBytes = await pdfDoc.save();
  downloadBytes(pdfBytes, `${actor.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  ui.notifications.info(game.i18n.format("PDFEXPORT.InfoExportDone", { name: actor.name }));
}

export async function listPdfFields() {
  const templateBytes = await fetchTemplateBytes();
  if (!templateBytes) return [];
  const pdfDoc = await PDFDocument.load(templateBytes, LOAD_OPTIONS);
  const form = pdfDoc.getForm();
  const fields = form.getFields().map(f => ({ name: f.getName(), type: f.constructor.name }));
  console.table(fields);
  return fields;
}
