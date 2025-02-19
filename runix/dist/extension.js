"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var loadCommands = (fileName, context) => {
  console.log(`\u26A1 Cargando JSON: ${fileName}`);
  const filePath = path.join(context.extensionPath, "src", "commands", fileName);
  console.log(`\u{1F4C2} Intentando cargar el archivo JSON desde: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`\u274C No se encontr\xF3 el archivo: ${filePath}`);
    return {};
  }
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    console.log(`\u{1F4C4} JSON cargado (${fileName}):`, rawData);
    return JSON.parse(rawData);
  } catch (error) {
    vscode.window.showErrorMessage(`\u274C Error al leer ${fileName}: ${error}`);
    return {};
  }
};
function activate(context) {
  console.log("Runix extension activated!");
  const systemCommands = loadCommands("system-commands.json", context);
  const dockerCommands = loadCommands("docker-commands.json", context);
  const gitCommands = loadCommands("git-commands.json", context);
  console.log("\u{1F50D} System Commands:", systemCommands);
  console.log("\u{1F433} Docker Commands:", dockerCommands);
  console.log("\u{1F6E0} Git Commands:", gitCommands);
  async function selectCommand(commandList) {
    return await vscode.window.showQuickPick(
      commandList.map((cmd) => ({
        label: cmd.description || cmd.command,
        detail: cmd.command,
        description: cmd.category ? `[${cmd.category}]` : ""
      })),
      {
        placeHolder: "Selecciona un comando",
        matchOnDescription: true,
        matchOnDetail: true
      }
    );
  }
  function executeCommand(commandItem) {
    const terminal = vscode.window.createTerminal("Runix Terminal");
    terminal.show();
    terminal.sendText(commandItem.detail);
  }
  const disposable = vscode.commands.registerCommand("runix.pruebavarioscomandos", async () => {
    vscode.window.showInformationMessage("\xA1\xA1Welcome to Runix!!");
    const commandType = await vscode.window.showQuickPick(
      ["Comandos del System", "Comandos de Docker", "Comandos de Git"],
      { placeHolder: "Selecciona una categor\xEDa de comandos" }
    );
    if (!commandType) {
      return;
    }
    let commandsRoot;
    if (commandType === "Comandos del System") {
      commandsRoot = systemCommands;
    } else if (commandType === "Comandos de Docker") {
      commandsRoot = dockerCommands;
    } else if (commandType === "Comandos de Git") {
      commandsRoot = gitCommands;
    } else {
      return;
    }
    const mainCategories = Object.keys(commandsRoot);
    const selectedMainCategory = await vscode.window.showQuickPick(
      mainCategories,
      { placeHolder: `Selecciona una categor\xEDa principal` }
    );
    if (!selectedMainCategory) {
      return;
    }
    const mainCategoryContent = commandsRoot[selectedMainCategory];
    const subCategories = Object.keys(mainCategoryContent);
    const selectedSubCategory = await vscode.window.showQuickPick(
      subCategories,
      { placeHolder: `Selecciona una subcategor\xEDa` }
    );
    if (!selectedSubCategory) {
      return;
    }
    const subCategoryContent = mainCategoryContent[selectedSubCategory];
    if (Array.isArray(subCategoryContent)) {
      const selectedCommand2 = await selectCommand(subCategoryContent);
      if (selectedCommand2) {
        executeCommand(selectedCommand2);
      }
      return;
    }
    const commandGroups = Object.keys(subCategoryContent);
    const selectedCommandGroup = await vscode.window.showQuickPick(
      commandGroups,
      { placeHolder: `Selecciona un grupo de comandos` }
    );
    if (!selectedCommandGroup) {
      return;
    }
    const commandList = subCategoryContent[selectedCommandGroup];
    if (!Array.isArray(commandList)) {
      vscode.window.showErrorMessage(`\u274C Formato incorrecto: se esperaba un array de comandos`);
      return;
    }
    const selectedCommand = await selectCommand(commandList);
    if (selectedCommand) {
      executeCommand(selectedCommand);
    }
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
  console.log("\u274C Runix extension deactivated.");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
