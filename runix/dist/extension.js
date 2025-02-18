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
  const filePath = path.join(context.extensionPath, "src", "commands", fileName);
  if (!fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`\u274C No se encontr\xF3 el archivo: ${fileName}`);
    return {};
  }
  const rawData = fs.readFileSync(filePath, "utf8");
  return JSON.parse(rawData);
};
function activate(context) {
  console.log("\u2705 Runix extension activated!");
  const disposable = vscode.commands.registerCommand("runix.pruebacon1", async () => {
    vscode.window.showInformationMessage("\xA1\xA1Welcome to Runix!!");
    const dockerCommands = loadCommands("docker-commands.json", context);
    if (!dockerCommands || !dockerCommands.docker || !dockerCommands.docker.basic_operations) {
      vscode.window.showErrorMessage("\u274C Error: No se pudieron cargar los comandos.");
      return;
    }
    const categories = Object.keys(dockerCommands.docker.basic_operations);
    const selectedCategory = await vscode.window.showQuickPick(categories, {
      placeHolder: "Selecciona una categor\xEDa de comandos (Docker)"
    });
    if (!selectedCategory) {
      return;
    }
    const commandsInCategory = dockerCommands.docker.basic_operations[selectedCategory];
    const selectedCommand = await vscode.window.showQuickPick(
      commandsInCategory.map((cmd) => cmd.command),
      { placeHolder: `Selecciona un comando de ${selectedCategory}` }
    );
    if (!selectedCommand) {
      return;
    }
    const command = commandsInCategory.find((cmd) => cmd.command === selectedCommand);
    if (command) {
      const terminal = vscode.window.createTerminal("Runix Terminal");
      terminal.show();
      terminal.sendText(command.command);
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
