import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Función para leer/cargar los comandos del archivo JSON
const loadCommands = (fileName: string, context: vscode.ExtensionContext): any => {
    console.log(`⚡ Cargando JSON: ${fileName}`);
    const filePath = path.join(context.extensionPath, 'src', 'commands', fileName);

    console.log(`📂 Intentando cargar el archivo JSON desde: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`❌ No se encontró el archivo: ${filePath}`);
        return {};
    }

    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        console.log(`📄 JSON cargado (${fileName}):`, rawData);
        return JSON.parse(rawData);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error al leer ${fileName}: ${error}`);
        return {};
    }
};

// Este método se llama cuando se activa la extensión.
export function activate(context: vscode.ExtensionContext) {
    console.log('Runix extension activated!');

    // Cargar los JSON individualmente.
    const systemCommands = loadCommands('system-commands.json', context);
    const dockerCommands = loadCommands('docker-commands.json', context);
    const gitCommands = loadCommands('git-commands.json', context);

    console.log("🔍 System Commands:", systemCommands);
    console.log("🐳 Docker Commands:", dockerCommands);
    console.log("🛠 Git Commands:", gitCommands);

    // Función para seleccionar un comando de una lista
    async function selectCommand(commandList: any[]): Promise<any | undefined> {
        return await vscode.window.showQuickPick(
            commandList.map(cmd => ({
                label: cmd.description || cmd.command,
                detail: cmd.command,
                description: cmd.category ? `[${cmd.category}]` : ''
            })),
            { 
                placeHolder: 'Selecciona un comando',
                matchOnDescription: true,
                matchOnDetail: true
            }
        );
    }

    // Función para ejecutar el comando seleccionado
    function executeCommand(commandItem: any): void {
        const terminal = vscode.window.createTerminal('Runix Terminal');
        terminal.show();
        terminal.sendText(commandItem.detail);
    }

    // Registramos el comando
    const disposable = vscode.commands.registerCommand('runix.pruebavarioscomandos', async () => {
        vscode.window.showInformationMessage('¡¡Welcome to Runix!!');

        // Seleccionamos el tipo de comandos
        const commandType = await vscode.window.showQuickPick(
            ['Comandos del System', 'Comandos de Docker', 'Comandos de Git'],
            { placeHolder: 'Selecciona una categoría de comandos' }
        );
        
        if (!commandType) { return; }

        // Seleccionamos la estructura correcta según el tipo
        let commandsRoot: any;
        if (commandType === 'Comandos del System') {
            commandsRoot = systemCommands;
        } else if (commandType === 'Comandos de Docker') {
            commandsRoot = dockerCommands;
        } else if (commandType === 'Comandos de Git') {
            commandsRoot = gitCommands;
        } else {
            return;
        }

        // 1. Seleccionar la categoría principal (docker, registry, deployment, etc.)
        const mainCategories = Object.keys(commandsRoot);
        const selectedMainCategory = await vscode.window.showQuickPick(
            mainCategories,
            { placeHolder: `Selecciona una categoría principal` }
        );

        if (!selectedMainCategory) { return; }
        const mainCategoryContent = commandsRoot[selectedMainCategory];

        // 2. Seleccionar la subcategoría (basic_operations, redis_operations, etc.)
        const subCategories = Object.keys(mainCategoryContent);
        const selectedSubCategory = await vscode.window.showQuickPick(
            subCategories,
            { placeHolder: `Selecciona una subcategoría` }
        );

        if (!selectedSubCategory) { return; }
        const subCategoryContent = mainCategoryContent[selectedSubCategory];

        // 3. Si la subcategoría contiene directamente un array de comandos
        if (Array.isArray(subCategoryContent)) {
            // Seleccionar directamente de la lista de comandos
            const selectedCommand = await selectCommand(subCategoryContent);
            if (selectedCommand) {
                executeCommand(selectedCommand);
            }
            return;
        }

        // 4. Si la subcategoría contiene otra capa de categorías
        const commandGroups = Object.keys(subCategoryContent);
        const selectedCommandGroup = await vscode.window.showQuickPick(
            commandGroups,
            { placeHolder: `Selecciona un grupo de comandos` }
        );

        if (!selectedCommandGroup) { return; }
        const commandList = subCategoryContent[selectedCommandGroup];

        if (!Array.isArray(commandList)) {
            vscode.window.showErrorMessage(`❌ Formato incorrecto: se esperaba un array de comandos`);
            return;
        }

        // Seleccionar de la lista final de comandos
        const selectedCommand = await selectCommand(commandList);
        if (selectedCommand) {
            executeCommand(selectedCommand);
        }
    });

    context.subscriptions.push(disposable);
}

// método para cuando la función está desactivada.
export function deactivate() {
    console.log('❌ Runix extension deactivated.');
}