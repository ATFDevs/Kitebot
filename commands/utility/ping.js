const {SlashCommandBuilder} = require('discord.js')
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong!'),
    async execute(db, interaction) {
        await logger.info(`Slash Command (/ping) ran by ${interaction.user.id}`);
        await interaction.reply('Pong!! I am connected and active!');
    }
}