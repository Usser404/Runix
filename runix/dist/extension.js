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
  constructor(context) {
    this.context = context;
  }
  getHistory() {
    return this.context.globalState.get(_HistoryManager.HISTORY_KEY, []);
  }
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
  async clearHistory() {
    await this.context.globalState.update(_HistoryManager.HISTORY_KEY, []);
  }
};
function getCurrentWorkspaceFolder() {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return void 0;
}
function getAllCategories(commandRoot) {
  const categories = [];
  function traverse(obj, prefix = "") {
    Object.keys(obj).forEach((key) => {
      if (Array.isArray(obj[key])) {
        categories.push(prefix ? `${prefix} > ${key}` : key);
      } else if (typeof obj[key] === "object") {
        traverse(obj[key], prefix ? `${prefix} > ${key}` : key);
      }
    });
  }
  traverse(commandRoot);
  return categories;
}
function getCommandsFromPath(commandRoot, path2) {
  const parts = path2.split(" > ");
  let current = commandRoot;
  for (const part of parts) {
    if (current[part] === void 0) {
      return [];
    }
    current = current[part];
  }
  return Array.isArray(current) ? current : [];
}
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
async function selectCommand(commandList) {
  if (!Array.isArray(commandList)) {
    console.error("commandList no es un array:", commandList);
    return void 0;
  }
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
function activate(context) {
  console.log("\u2705 Runix extension activated!");
  const historyManager = new HistoryManager(context);
  const systemCommands = loadCommands("system-commands.json", context);
  const dockerCommands = loadCommands("docker-commands.json", context);
  const gitCommands = loadCommands("git-commands.json", context);
  async function executeCommand(commandItem, category, source) {
    const terminal = vscode.window.createTerminal("Runix Terminal");
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (workspaceFolder) {
      terminal.sendText(`cd "${workspaceFolder}"`);
      terminal.sendText('echo "\u{1F4C2} Directorio actual: $(pwd)"');
      terminal.sendText('echo "\u26A1 Ejecutando comando..."');
    } else {
      terminal.sendText('echo "\u26A0\uFE0F No se detect\xF3 un workspace activo"');
    }
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
      await executeCommand(selectedCommand2, selectedCommand2.description, "Historial");
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
    const availableCategories = getAllCategories(commandsRoot);
    const selectedCategory = await vscode.window.showQuickPick(
      availableCategories,
      { placeHolder: "Selecciona una categor\xEDa" }
    );
    if (!selectedCategory) {
      return;
    }
    const commandList = getCommandsFromPath(commandsRoot, selectedCategory);
    const selectedCommand = await selectCommand(commandList);
    if (selectedCommand) {
      await executeCommand(selectedCommand, selectedCategory, commandType);
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
