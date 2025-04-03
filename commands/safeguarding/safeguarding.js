const {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags,
    channelMention,
    Colors,
    EmbedBuilder,
    InteractionContextType
} = require("discord.js");
const {nonPermittedAction} = require("../../utility/embeds");
const {checkPermissionOwner} = require('../../utility/permission');
const logger = require("../../logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('safeguarding')
        .setDescription('Safeguarding for this server')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Sets the safeguarding concern channel for the server.')
                .addChannelOption(channel =>
                    channel.setName('channel').setDescription('The channel to log concerns to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    async execute(db, interaction) {
        if (interaction.options.getSubcommand() === 'channel') {
            await logger.info(`Slash Command (/safeguarding channel) ran by ${interaction.user.id}`);
            // Defer the reply to allow time to respond.
            await interaction.deferReply({flags: MessageFlags.Ephemeral});
            await logger.trace('(/safeguarding channel) - Deferred reply');

            // Check the user has permissions
            if (!checkPermissionOwner(db, interaction.member)) {
                await logger.trace('(/safeguarding channel) - User doesn\'t have permission to set safeguarding channel');
                await interaction.editReply({embeds: [nonPermittedAction]});
                return;
            }

            // Get the channel from the command.
            let channel = interaction.options.getChannel('channel');
            await logger.trace(`(/safeguarding channel) - Getting channel from command. Channel: ${channel.id}`);

            // Set the channel in the database.
            await logger.trace('(/safeguarding channel) - Setting the safeguarding channel in DB');
            await db.setChannelOfType(interaction.guild.id, channel.id, 'safeguarding');

            // Respond to the user
            await logger.trace('(/safeguarding channel) - Informing user of change');
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`Changed safeguarding channel for ${interaction.guild.name}`)
                    .setDescription(`The new safeguarding channel for the server is ${channelMention(channel.id)}`)
                    .setColor(Colors.Green)
            ]});
        }
    }
}