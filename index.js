const {Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load items from the .env file.
const dotenv = require('dotenv');
dotenv.config();

// Checking that the token is valid.
const DISC_BOT_TOKEN = process.env.TOKEN;
if (token === "" || token === null) {
    console.error('Please provide a token');
    process.exit(1);
}

// Create the client.
const client = new Client(
    {intents: [GatewayIntentBits.Guilds]
    });

// Command registering
client.commands = new Collection()

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for(const folder of commandFolders) {
    const commandPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
    for(const file of commandFiles) {
        const filePath = path.join(commandPath, file);
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`The discord bot is ready on bot ${readyClient.user.tag}`);
});

client.login(DISC_BOT_TOKEN);
