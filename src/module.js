import { registerSettings, MODULE_ID } from "./settings.js";
import { exportActorToPdf } from "./pdf-filler.js";
import { listPdfFields, debugAnnotateFieldNames } from "./debug.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  module.api = { exportActorToPdf, listPdfFields, debugAnnotateFieldNames };
});

function injectExportButton(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.documentName !== "Actor" || actor.type !== "character") return;

  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  const header = root.classList?.contains("window-header") ? root : root.querySelector(".window-header");
  if (!header || header.querySelector(".pdf-exporter-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("header-control", "icon", "fa-solid", "fa-file-pdf", "pdf-exporter-button");
  button.title = game.i18n.localize("PDFEXPORT.ButtonTitle");
  button.addEventListener("click", event => {
    event.preventDefault();
    exportActorToPdf(actor);
  });

  const closeControl = header.querySelector(".header-control.icon.fa-times, .close");
  if (closeControl) closeControl.before(button);
  else header.appendChild(button);
}

// Registered on multiple render hooks so the button appears on both legacy
// (AppV1) and current ApplicationV2-based dnd5e character sheets; the
// duplicate-guard above keeps this safe even if more than one hook fires.
for (const hookName of ["renderActorSheet", "renderApplicationV2", "renderActorSheetV2"]) {
  Hooks.on(hookName, injectExportButton);
}
