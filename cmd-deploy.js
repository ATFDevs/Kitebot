
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const logger = require('./logger');

// Get variables from the ENV file
logger.info('Loading .ENV file');
dotenv.config();
if (process.env.TOKEN === '' || !process.env.TOKEN) {
    logger.error('You must provide a token');
    process.exit(1);
}
if(process.env.APPLICATION_ID === '' || !process.env.APPLICATION_ID) {
    logger.error('You must provide a APPLICATION_ID');
    process.exit(1);
}
const token = process.env.TOKEN;
const application_id = process.env.APPLICATION_ID;
logger.info('Successfully loaded .ENV file.')


// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// Get the previously registered global commands.
(async() => {

    // Checking the local commands and uploading them.
    await logger.info('Loading commands from DEPLOY');
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                await logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    await (async () => {
        try {
            await logger.info(`Started refreshing ${commands.length} application (/) commands.`);

            // Create the bulk update route
            const discordBulkRoute = `/applications/${application_id}/commands`;
            let data = await rest.put(discordBulkRoute, {
                body: commands,
            });

            await logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            await logger.error(error);
        }
    })();
})();
