/*---------------------------------------------------------------------------
                                    IMPORTS
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
// Clase para manejar el historial
class HistoryManager {
    private context: vscode.ExtensionContext;
    private static readonly HISTORY_KEY = 'runixHistory';
    private static readonly MAX_HISTORY = 20; // Máximo número de comandos en el historial

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    // Obtener historial
    getHistory(): StoredCommand[] {
        return this.context.globalState.get<StoredCommand[]>(HistoryManager.HISTORY_KEY, []);
    }

    // Agregar al historial
    async addToHistory(command: string, description: string, category: string, source: string): Promise<void> {
        let history = this.getHistory();

        // Crear nuevo comando con timestamp
        const newCommand: StoredCommand = {
            command,
            description,
            category,
            timestamp: Date.now(),
            source
        };

        // Remover duplicados si existen
        history = history.filter(h => h.command !== command);

        // Agregar al inicio
        history.unshift(newCommand);

        // Mantener solo los últimos MAX_HISTORY elementos
        history = history.slice(0, HistoryManager.MAX_HISTORY);

        // Guardar el historial actualizado
        await this.context.globalState.update(HistoryManager.HISTORY_KEY, history);
    }

    // Limpiar historial
    async clearHistory(): Promise<void> {
        await this.context.globalState.update(HistoryManager.HISTORY_KEY, []);
    }
}

/*---------------------------------------------------------------------------
                    FUNCIONAMIENTO DEL PLUGIN
---------------------------------------------------------------------------*/
// Función para leer/cargar los comandos del archivo JSON
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

// Este método se llama cuando se activa la extensión.
export function activate(context: vscode.ExtensionContext) {
    console.log('✅ Runix extension activated!');

    // Instancia del historial
    const historyManager = new HistoryManager(context);

    // Cargar los JSON individualmente.
    const systemCommands = loadCommands('system-commands.json', context);
    const dockerCommands = loadCommands('docker-commands.json', context);
    const gitCommands = loadCommands('git-commands.json', context);

    console.log("🔍 System Commands:", systemCommands);
    console.log("🐳 Docker Commands:", dockerCommands);
    console.log("🛠 Git Commands:", gitCommands);

    // Función para seleccionar un comando de una lista
    async function selectCommand(commandList: any[]): Promise<any | undefined> {
        let history = historyManager.getHistory();

        // Ordenar los comandos, priorizando los más usados
        commandList.sort((a, b) => {
            const aIndex = history.findIndex(h => h.command === a.command);
            const bIndex = history.findIndex(h => h.command === b.command);
            return (bIndex === -1 ? Infinity : bIndex) - (aIndex === -1 ? Infinity : aIndex);
        });

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
    async function executeCommand(commandItem: any, category: string, source: string): Promise<void> {
        const terminal = vscode.window.createTerminal('Runix Terminal');
        terminal.show();
        terminal.sendText(commandItem.detail);

        // Guardar en historial
        await historyManager.addToHistory(commandItem.detail, commandItem.label, category, source);
    }

    // Registramos el comando
    const disposable = vscode.commands.registerCommand('runix.pruebavarioscomandos', async () => {
        vscode.window.showInformationMessage('¡¡Welcome to Runix!!');

        // Obtener historial
        let history = historyManager.getHistory();

        // Seleccionamos el tipo de comandos
        const commandType = await vscode.window.showQuickPick(
            ['📜 Historial de Más Usados', 'Comandos del System', 'Comandos de Docker', 'Comandos de Git'],
            { placeHolder: 'Selecciona una categoría de comandos' }
        );

        if (!commandType) {return;}

        // ✅ Si el usuario selecciona "Historial"
        if (commandType === '📜 Historial de Más Usados') {
            if (history.length === 0) {
                vscode.window.showInformationMessage('📜 No hay comandos en el historial.');
                return;
            }

            // Mostrar la lista de comandos más usados
            const selectedCommand = await vscode.window.showQuickPick(
                history.map(cmd => ({
                    label: cmd.description || cmd.command,
                    detail: cmd.command,
                    description: `[${cmd.category}] - ${new Date(cmd.timestamp).toLocaleString()}`
                })),
                { placeHolder: '📜 Selecciona un comando del historial' }
            );

            if (!selectedCommand) {return;}

            // Ejecutar el comando seleccionado
            const terminal = vscode.window.createTerminal('Runix Terminal');
            terminal.show();
            terminal.sendText(selectedCommand.detail);

            // Registrar que este comando se usó nuevamente
            await historyManager.addToHistory(selectedCommand.detail, selectedCommand.label, selectedCommand.description, "Historial");

            return;
        }

        // Si el usuario elige una categoría normal (System, Docker, Git)
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

        // Seleccionar la categoría principal
        const mainCategories = Object.keys(commandsRoot);
        const selectedMainCategory = await vscode.window.showQuickPick(
            mainCategories,
            { placeHolder: `Selecciona una categoría principal` }
        );

        if (!selectedMainCategory) {return;}
        const mainCategoryContent = commandsRoot[selectedMainCategory];

        // Seleccionar de la lista de comandos
        const selectedCommand = await selectCommand(mainCategoryContent);
        if (selectedCommand) {
            await executeCommand(selectedCommand, selectedMainCategory, commandType);
        }
    });

    context.subscriptions.push(disposable);
}

// método para cuando la función está desactivada.
export function deactivate() {
    console.log('❌ Runix extension deactivated.');
}