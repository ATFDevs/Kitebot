const {SlashCommandBuilder} = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong!'),
    async execute(db, interaction) {
        console.log(`/ping ran by ${interaction.user.id}`);
        await interaction.reply(`This command was ran by ${interaction.user.username}`)
    }
}