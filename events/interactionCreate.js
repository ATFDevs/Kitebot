const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Only respond to slash commands
        if (!interaction.isChatInputCommand()) return;

        // Get the command from the collection to run based on the name of the command.
        const command = interaction.client.commands.get(interaction.commandName);

        // If there is no command.
        if (!command) {
            await interaction.reply({
                content: 'There was an error while trying to run this command!',
                flags: MessageFlags.Ephemeral
            });
            console.error(`[WARNING] No command matching ${interaction.commandName} with execution.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[ERROR] - Failed to run command! ${error}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while trying to run this command!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while trying to run this command!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}