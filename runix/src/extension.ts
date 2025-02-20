/*---------------------------------------------------------------------------
                            IMPORTACIONES
---------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Interfaz para el comando almacenado con timestamp
interface StoredCommand {
    command: string;
    description: string;
    category: string;
    timestamp: number;
    source: string;
}
/*---------------------------------------------------------------------------
                    FUNCIONAMIENTO DEL HISTORIAL
---------------------------------------------------------------------------*/
class HistoryManager {
    private context: vscode.ExtensionContext;
    private static readonly HISTORY_KEY = 'runixHistory';
    private static readonly MAX_HISTORY = 20;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    getHistory(): StoredCommand[] {
        return this.context.globalState.get<StoredCommand[]>(HistoryManager.HISTORY_KEY, []);
    }

    async addToHistory(command: string, description: string, category: string, source: string): Promise<void> {
        let history = this.getHistory();
        const newCommand: StoredCommand = {
            command,
            description,
            category,
            timestamp: Date.now(),
            source
        };

        history = history.filter(h => h.command !== command);
        history.unshift(newCommand);
        history = history.slice(0, HistoryManager.MAX_HISTORY);
        await this.context.globalState.update(HistoryManager.HISTORY_KEY, history);
    }

    async clearHistory(): Promise<void> {
        await this.context.globalState.update(HistoryManager.HISTORY_KEY, []);
    }
}

// Agregamos una funcion para obtener el directorio de trabajo (actual)
function getCurrentWorkspaceFolder(): string | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}

/*---------------------------------------------------------------------------
                      UTILIDADES PARA MANEJO DE COMANDOS
---------------------------------------------------------------------------*/
function getAllCategories(commandRoot: any): string[] {
    const categories: string[] = [];
    
    function traverse(obj: any, prefix: string = '') {
        Object.keys(obj).forEach(key => {
            if (Array.isArray(obj[key])) {
                categories.push(prefix ? `${prefix} > ${key}` : key);
            } else if (typeof obj[key] === 'object') {
                traverse(obj[key], prefix ? `${prefix} > ${key}` : key);
            }
        });
    }
    
    traverse(commandRoot);
    return categories;
}

function getCommandsFromPath(commandRoot: any, path: string): any[] {
    const parts = path.split(' > ');
    let current = commandRoot;
    
    for (const part of parts) {
        if (current[part] === undefined) {
            return [];
        }
        current = current[part];
    }
    
    return Array.isArray(current) ? current : [];
}
/*---------------------------------------------------------------------------
                         FUNCIONAMIENTO DEL PLUGIN
---------------------------------------------------------------------------*/
const loadCommands = (fileName: string, context: vscode.ExtensionContext): any => {
    console.log(`⚡ Cargando JSON: ${fileName}`);
    const filePath = path.join(context.extensionPath, 'src', 'commands', fileName);

    console.log(`📂 Intentando cargar el archivo JSON desde: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`❌ No se encontró el archivo: ${fileName}`);
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

async function selectCommand(commandList: any[]): Promise<any | undefined> {
    if (!Array.isArray(commandList)) {
        console.error('commandList no es un array:', commandList);
        return undefined;
    }

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

export function activate(context: vscode.ExtensionContext) {
    console.log('✅ Runix extension activated!');

    const historyManager = new HistoryManager(context);
    const systemCommands = loadCommands('system-commands.json', context);
    const dockerCommands = loadCommands('docker-commands.json', context);
    const gitCommands = loadCommands('git-commands.json', context);

    async function executeCommand(commandItem: any, category: string, source: string): Promise<void> {
        const terminal = vscode.window.createTerminal('Runix Terminal');
        
        // Obtener el directorio de trabajo actual
        const workspaceFolder = getCurrentWorkspaceFolder();
        
        if (workspaceFolder) {
            // Primero navegamos al directorio del workspace.
            terminal.sendText(`cd "${workspaceFolder}"`);
            
            // Mostramos el directorio actual para confirmar.
            terminal.sendText('echo "📂 Directorio actual: $(pwd)"');
            
            // Agregamos una pequeña pausa visual.
            terminal.sendText('echo "⚡ Ejecutando comando..."');
        } else {
            terminal.sendText('echo "⚠️ No se detectó un workspace activo"');
        }
        
        terminal.show();
        terminal.sendText(commandItem.detail);
        await historyManager.addToHistory(commandItem.detail, commandItem.label, category, source);
    }

    const disposable = vscode.commands.registerCommand('runix.pruebavarioscomandos', async () => {
        vscode.window.showInformationMessage('¡¡Welcome to Runix!!');
        let history = historyManager.getHistory();

        const commandType = await vscode.window.showQuickPick(
            ['📜 Historial de Más Usados', 'Comandos del System', 'Comandos de Docker', 'Comandos de Git'],
            { placeHolder: 'Selecciona una categoría de comandos' }
        );

        if (!commandType) { return; }

        if (commandType === '📜 Historial de Más Usados') {
            if (history.length === 0) {
                vscode.window.showInformationMessage('📜 No hay comandos en el historial.');
                return;
            }

            const selectedCommand = await vscode.window.showQuickPick(
                history.map(cmd => ({
                    label: cmd.description || cmd.command,
                    detail: cmd.command,
                    description: `[${cmd.category}] - ${new Date(cmd.timestamp).toLocaleString()}`
                })),
                { placeHolder: '📜 Selecciona un comando del historial' }
            );

            if (!selectedCommand) { return; }

            // Usando la función executeCommand para el historial también
            await executeCommand(selectedCommand, selectedCommand.description, "Historial");
            return;
        }

        // Seleccionar comandos de categorías
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

        // Obtener y mostrar todas las categorías disponibles
        const availableCategories = getAllCategories(commandsRoot);
        const selectedCategory = await vscode.window.showQuickPick(
            availableCategories,
            { placeHolder: 'Selecciona una categoría' }
        );

        if (!selectedCategory) { return; }

        // Obtener los comandos de la categoría seleccionada
        const commandList = getCommandsFromPath(commandsRoot, selectedCategory);
        
        // Seleccionar y ejecutar el comando
        const selectedCommand = await selectCommand(commandList);
        if (selectedCommand) {
            await executeCommand(selectedCommand, selectedCategory, commandType);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('❌ Runix extension deactivated.');
}
/*---------------------------------------------------------------------------
                             FIN DEL SHOW
---------------------------------------------------------------------------*/