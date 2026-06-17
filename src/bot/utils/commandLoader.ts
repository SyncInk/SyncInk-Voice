import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { SyncinkBot } from '../bot';
import { ENV } from '../../config/config';

export const loadCommands = async (client: SyncinkBot) => {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  const rest = new REST().setToken(ENV.TOKEN);

  try {
    console.log(`[Bot] Started refreshing ${commands.length} application (/) commands.`);

    await rest.put(
      Routes.applicationCommands(ENV.CLIENT_ID),
      { body: commands },
    );

    console.log(`[Bot] Successfully reloaded application (/) commands.`);
  } catch (error) {
    console.error('[Bot] Failed to reload application commands:', error);
  }
};
