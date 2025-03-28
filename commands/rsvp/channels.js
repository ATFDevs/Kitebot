const {ChannelType, SlashCommandBuilder, MessageFlags, PermissionsBitField, EmbedBuilder, channelMention, Colors,
    Message
} = require('discord.js');
const {nonPermittedAction} = require('../../utility/embeds');
const {checkPermissionAdmin} = require('../../utility/permission');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('rsvp')
        .setDescription('Commands to work with RSVP data.')
        .addSubcommandGroup(channelCommands =>
            channelCommands
                .setName('channels')
                .setDescription('Works with RSVP Channels')
                .addSubcommand(addCommand =>
                    addCommand
                        .setName('add')
                        .setDescription('Adds a channel to RSVP channels')
                        .addChannelOption(channelOption =>
                        channelOption
                            .setName('channel')
                            .setDescription('The channel to use for RSVPs')
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(true)))
                .addSubcommand(removeCommand =>
                    removeCommand
                        .setName('remove')
                        .setDescription('Removes a channel from RSVP channels')
                        .addChannelOption(channelOption =>
                        channelOption
                            .setName('channel')
                            .setDescription('The channel to remove from RSVP channels')
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(true))))
        .addSubcommandGroup(archiveCommands =>
        archiveCommands
            .setName('archive')
            .setDescription('Commands to set archival of RSVP')
            .addSubcommand(archiveChannel =>
            archiveChannel
                .setName('channel')
                .setDescription('The channel to use for archiving RSVP messages')
                .addChannelOption(channelOption =>
                channelOption
                    .setName('channel')
                    .setDescription('The channel to use for archiving RSVP messages within')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)))),
    async execute(db, interaction) {
        // Get the subcommand group.
        if(interaction.options.getSubcommandGroup() === 'channels') {
            if(interaction.options.getSubcommand() === 'add') {
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});

                // Check the permission sof hte user to ensure that they are allowed to do this.
                if(!await checkPermissionAdmin(db, interaction.member)) {
                    // Inform the user that they aren't permitted to do this.
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the options.
                let channel = interaction.options.getChannel('channel');

                // Check that the channel doesn't already exist and inform user if it does.
                let dbResponse = await db.getChannelById(interaction.guild.id, channel.id);
                if(dbResponse && dbResponse.channelType === 'rsvp') {
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel already exists!')
                            .setDescription(`The channel ${channelMention(channel.id)} already exists as a ${dbResponse.channelType} channel! Please remove it before adding it as an RSVP channel.`)
                            .setColor(Colors.Red)]})
                    return;
                }

                // Add the channel to the database.
                await db.addChannelOfType(interaction.guild.id, channel.id, 'rsvp');

                // Inform user of the channel being successfully added.
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully added channel!')
                        .setDescription(`Successfully added ${channelMention(channel.id)} as an RSVP channel!`)
                        .setColor(Colors.Green)]});
            } else if(interaction.options.getSubcommand() === 'remove') {
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});

                // Check tha the user has the permission to be able to complete this action.
                if(!interaction.member.permissions.has([PermissionsBitField.Flags.MANAGE_GUILD])) {
                    // Inform the user that they aren't permitted to do this.
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the command options
                let channel = interaction.options.getChannel('channel');

                // Check if the DB has the channel or not.
                let dbResponse = await db.getChannelById(interaction.guild.id, channel.id)
                if(!dbResponse) {
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel doesn\'t exist!')
                            .setDescription(`The channel ${channelMention(channel.id)} doesn't exist in the database as an RSVP channel!`)
                            .setColor(Colors.Red)]});
                    return;
                } else if(dbResponse.channelType !== 'rsvp') {
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel doesn\'t exist!')
                            .setDescription(`The channel ${channelMention(channel.id)} doesn't exist in the database as an RSVP channel!`)
                            .setColor(Colors.Red)]});
                    return;
                }

                // Remove the channel from the database.
                await db.deleteChannelOfType(interaction.guild.id, channel.id, 'rsvp');

                // Inform the user of the deletion
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully removed channel!')
                        .setDescription(`Successfully removed ${channelMention(channel.id)} as an RSVP channel!`)
                        .setColor(Colors.Green)]});
            }
        } else if (interaction.options.getSubcommandGroup() === 'archive') {
            if(interaction.options.getSubcommand() === 'channel') {
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});

                // Check that the user has the permission to edit the server
                if(!await checkPermissionAdmin(db, interaction.member)) {
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the commands.
                let channel = interaction.options.getChannel('channel');

                // Set the channel in the DB
                await db.setChannelOfType(interaction.guild.id, channel.id, 'archive');

                // Respond to the user.
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully set archive channel!')
                        .setDescription(`Successfully set ${channelMention(channel.id)} as the archive channel!`)
                        .setColor(Colors.Green)]});
            }
        }
    }
}