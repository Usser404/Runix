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
var HistoryManager = class _HistoryManager {
  context;
  static HISTORY_KEY = "runixHistory";
  static MAX_HISTORY = 20;
  // Máximo número de comandos en el historial
  constructor(context) {
    this.context = context;
  }
  // Obtener historial
  getHistory() {
    return this.context.globalState.get(_HistoryManager.HISTORY_KEY, []);
  }
  // Agregar al historial
  async addToHistory(command, description, category, source) {
    let history = this.getHistory();
    const newCommand = {
      command,
      description,
      category,
      timestamp: Date.now(),
      source
    };
    history = history.filter((h) => h.command !== command);
    history.unshift(newCommand);
    history = history.slice(0, _HistoryManager.MAX_HISTORY);
    await this.context.globalState.update(_HistoryManager.HISTORY_KEY, history);
  }
  // Limpiar historial
  async clearHistory() {
    await this.context.globalState.update(_HistoryManager.HISTORY_KEY, []);
  }
};
var loadCommands = (fileName, context) => {
  console.log(`\u26A1 Cargando JSON: ${fileName}`);
  const filePath = path.join(context.extensionPath, "src", "commands", fileName);
  console.log(`\u{1F4C2} Intentando cargar el archivo JSON desde: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`\u274C No se encontr\xF3 el archivo: ${fileName}`);
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
  console.log("\u2705 Runix extension activated!");
  const historyManager = new HistoryManager(context);
  const systemCommands = loadCommands("system-commands.json", context);
  const dockerCommands = loadCommands("docker-commands.json", context);
  const gitCommands = loadCommands("git-commands.json", context);
  console.log("\u{1F50D} System Commands:", systemCommands);
  console.log("\u{1F433} Docker Commands:", dockerCommands);
  console.log("\u{1F6E0} Git Commands:", gitCommands);
  async function selectCommand(commandList) {
    let history = historyManager.getHistory();
    commandList.sort((a, b) => {
      const aIndex = history.findIndex((h) => h.command === a.command);
      const bIndex = history.findIndex((h) => h.command === b.command);
      return (bIndex === -1 ? Infinity : bIndex) - (aIndex === -1 ? Infinity : aIndex);
    });
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
  async function executeCommand(commandItem, category, source) {
    const terminal = vscode.window.createTerminal("Runix Terminal");
    terminal.show();
    terminal.sendText(commandItem.detail);
    await historyManager.addToHistory(commandItem.detail, commandItem.label, category, source);
  }
  const disposable = vscode.commands.registerCommand("runix.pruebavarioscomandos", async () => {
    vscode.window.showInformationMessage("\xA1\xA1Welcome to Runix!!");
    let history = historyManager.getHistory();
    const commandType = await vscode.window.showQuickPick(
      ["\u{1F4DC} Historial de M\xE1s Usados", "Comandos del System", "Comandos de Docker", "Comandos de Git"],
      { placeHolder: "Selecciona una categor\xEDa de comandos" }
    );
    if (!commandType) {
      return;
    }
    if (commandType === "\u{1F4DC} Historial de M\xE1s Usados") {
      if (history.length === 0) {
        vscode.window.showInformationMessage("\u{1F4DC} No hay comandos en el historial.");
        return;
      }
      const selectedCommand2 = await vscode.window.showQuickPick(
        history.map((cmd) => ({
          label: cmd.description || cmd.command,
          detail: cmd.command,
          description: `[${cmd.category}] - ${new Date(cmd.timestamp).toLocaleString()}`
        })),
        { placeHolder: "\u{1F4DC} Selecciona un comando del historial" }
      );
      if (!selectedCommand2) {
        return;
      }
      const terminal = vscode.window.createTerminal("Runix Terminal");
      terminal.show();
      terminal.sendText(selectedCommand2.detail);
      await historyManager.addToHistory(selectedCommand2.detail, selectedCommand2.label, selectedCommand2.description, "Historial");
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
    const selectedCommand = await selectCommand(mainCategoryContent);
    if (selectedCommand) {
      await executeCommand(selectedCommand, selectedMainCategory, commandType);
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
