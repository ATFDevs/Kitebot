const {Client, Events, GatewayIntentBits, Collection, MessageFlagsString} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load items from the .env file.
const dotenv = require('dotenv');
dotenv.config();

// Checking that the token is valid.
const DISC_BOT_TOKEN = process.env.TOKEN;
if (DISC_BOT_TOKEN === "" || !DISC_BOT_TOKEN) {
    console.error('Please provide a token');
    process.exit(1);
}

// Create the client.
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Command registering
client.commands = new Collection()

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Register commands.
for (const folder of commandFolders) {
    const commandPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing the required 'data' or 'execute' property.`);
        }
    }
}

// Reading event files
const eventsPath = path.join(__dirname, 'events');
const eventsFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const e of eventsFiles) {
    const filePath = path.join(eventsPath, e);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(DISC_BOT_TOKEN);
