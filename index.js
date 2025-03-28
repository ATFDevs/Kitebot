const {Client, Events, GatewayIntentBits, Collection, MessageFlagsString} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

logger.info('Starting bot...');

// Load items from the .env file.
logger.info('Loading .env file.')
const dotenv = require('dotenv');
const {join} = require("node:path");
dotenv.config();
logger.info('File loaded successfully!');

// Checking that the token is valid.
const DISC_BOT_TOKEN = process.env.TOKEN;
if (DISC_BOT_TOKEN === "" || !DISC_BOT_TOKEN) {
    logger.error('Please provide a token');
    process.exit(1);
}

// Create the client.
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
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
            logger.log(`[WARNING] The command at ${filePath} is missing the required 'data' or 'execute' property.`);
        }
    }
}

(async() => {
    const {join} = require("node:path");
    const Database = require(`./database/mysql`);

    const dbIp = process.env.MYSQL_DB_IP;
    const dbName = process.env.MYSQL_DB_NAME;
    const dbUsername = process.env.MYSQL_DB_USERNAME;
    const dbPassword = process.env.MYSQL_DB_PASSWORD;

    for (let item in [dbIp, dbName, dbUsername, dbPassword]) {
        if (item === '' || !item) {
            logger.error(`Please provide valid entries for MySQL Connection Params.}`)
        }
    }

    let databaseConnection = new Database(dbIp, dbName, dbUsername, dbPassword);
    await databaseConnection.connect();

    // Reading event files
    const eventsPath = path.join(__dirname, 'events');
    const eventsFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const e of eventsFiles) {
        const filePath = path.join(eventsPath, e);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(databaseConnection, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(databaseConnection, ...args));
        }
    }

    await client.login(DISC_BOT_TOKEN);
})();

