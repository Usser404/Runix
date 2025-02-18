import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Función para leer/cargar los comandos del archivo JSON
const loadCommands = (fileName: string, context: vscode.ExtensionContext): any => {
	const filePath = path.join(context.extensionPath, 'src', 'commands', fileName);
    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`❌ No se encontró el archivo: ${fileName}`);
        return {};
    }
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData);
};

// Este método se llama cuando se activa la extensión.
export function activate(context: vscode.ExtensionContext) {

    console.log('✅ Runix extension activated!');

    const disposable = vscode.commands.registerCommand('runix.pruebacon1', async () => {
        
        vscode.window.showInformationMessage('¡¡Welcome to Runix!!');

        // Cargar comandos desde el JSON
        const dockerCommands = loadCommands('docker-commands.json', context);

        // Verificar que el JSON tenga datos válidos
        if (!dockerCommands || !dockerCommands.docker || !dockerCommands.docker.basic_operations) {
            vscode.window.showErrorMessage('❌ Error: No se pudieron cargar los comandos.');
            return;
        }

        // Obtener categorías de comandos
        const categories = Object.keys(dockerCommands.docker.basic_operations);
        const selectedCategory = await vscode.window.showQuickPick(categories, {
            placeHolder: 'Selecciona una categoría de comandos (Docker)'
        });

        if (!selectedCategory) {return;}

        // Obtener los comandos de la categoría seleccionada
        const commandsInCategory = dockerCommands.docker.basic_operations[selectedCategory];

        const selectedCommand = await vscode.window.showQuickPick(
            commandsInCategory.map((cmd: { command: string }) => cmd.command),
            { placeHolder: `Selecciona un comando de ${selectedCategory}` }
        );

        if (!selectedCommand) {return;}

        // Encontrar el comando seleccionado en la lista
        const command = commandsInCategory.find((cmd: { command: string }) => cmd.command === selectedCommand);
        if (command) {
            const terminal = vscode.window.createTerminal('Runix Terminal');
            terminal.show();
            terminal.sendText(command.command);
        }
    });

    context.subscriptions.push(disposable);
}

// metodo para cuando la funcion está desactivada.
export function deactivate() {
    console.log('❌ Runix extension deactivated.');
}