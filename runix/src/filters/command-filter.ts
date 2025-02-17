import * as fs from 'fs';

interface Command {
  name: string;
  command: string;
  description: string;
}

class CommandFilter {
  private systemCommands: Command[];
  private dockerCommands: Command[];
  private gitCommands: Command[];

  constructor() {
    this.systemCommands = this.loadCommands('commands/system-commands.json');
    this.dockerCommands = this.loadCommands('commands/docker-commands.json');
    this.gitCommands = this.loadCommands('commands/git-commands.json');
  }

  private loadCommands(filePath: string): Command[] {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  public getCommands(category: string): Command[] {
    switch (category) {
      case 'system':
        return this.systemCommands;
      case 'docker':
        return this.dockerCommands;
      case 'git':
        return this.gitCommands;
      default:
        throw new Error('Category not found');
    }
  }
}

export default CommandFilter;
