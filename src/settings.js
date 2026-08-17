export const MODULE_ID = "dnd5e-pdf-exporter";

export function registerSettings() {
  game.settings.register(MODULE_ID, "pdfTemplatePath", {
    name: "PDFEXPORT.SettingTemplatePathName",
    hint: "PDFEXPORT.SettingTemplatePathHint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    filePicker: "any"
  });

  game.settings.register(MODULE_ID, "sheetProfile", {
    name: "PDFEXPORT.SettingProfileName",
    hint: "PDFEXPORT.SettingProfileHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "2014": "PDFEXPORT.Profile2014",
      "2024": "PDFEXPORT.Profile2024"
    },
    default: "2024"
  });

  game.settings.register(MODULE_ID, "customFieldMapPath", {
    name: "PDFEXPORT.SettingCustomMapName",
    hint: "PDFEXPORT.SettingCustomMapHint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    filePicker: "any"
  });

  game.settings.register(MODULE_ID, "flattenPdf", {
    name: "PDFEXPORT.SettingFlattenName",
    hint: "PDFEXPORT.SettingFlattenHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
}
