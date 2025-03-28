const {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags,
    PermissionsBitField,
    channelMention,
    Colors,
    EmbedBuilder
} = require("discord.js");
const {nonPermittedAction} = require("../../utility/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('safeguarding')
        .setDescription('Safeguarding for this server')
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
            // Defer the reply to allow time to respond.
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            // Check the user has permissions
            if (!interaction.member.permissions.has([PermissionsBitField.MANAGE_GUILD])) {
                await interaction.editReply({embeds: [nonPermittedAction]});
                return;
            }

            // Get the channel from the command.
            let channel = interaction.options.getChannel('channel');

            // Set the channel in the database.
            await db.setChannelOfType(interaction.guild.id, channel.id, 'safeguarding');

            // Respond to the user
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`Changed safeguarding channel for ${interaction.guild.name}`)
                    .setDescription(`The new safeguarding channel for the server is ${channelMention(channel.id)}`)
                    .setColor(Colors.Green)
            ]});
        }
    }
}