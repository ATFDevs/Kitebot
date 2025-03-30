const {ChannelType, SlashCommandBuilder, MessageFlags, PermissionsBitField, EmbedBuilder, channelMention, Colors,
    Message
} = require('discord.js');
const {nonPermittedAction} = require('../../utility/embeds');
const {checkPermissionAdmin, checkPermissionOwner} = require('../../utility/permission');
const logger = require('../../logger');


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
                await logger.info(`Slash command (/rsvp channels add) ran by ${interaction.user.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/rsvp channels add) - Deferred reply')

                // Check the permission sof hte user to ensure that they are allowed to do this.
                if(!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/rsvp channels add) - User doesn\'t have permission to add RSVP channels');
                    // Inform the user that they aren't permitted to do this.
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the options.
                let channel = interaction.options.getChannel('channel');
                await logger.trace(`(/rsvp channels add) - Getting channel from command. Channel: ${channel.id}`);

                // Check that the channel doesn't already exist and inform user if it does.
                await logger.trace('(/rsvp channels add) - Checking DB for channel');
                let dbResponse = await db.getChannelById(interaction.guild.id, channel.id);
                if(dbResponse && dbResponse.channelType === 'rsvp') {
                    await logger.trace('(/rsvp channels add) - Channel is already an RSVP channel!');
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel already exists!')
                            .setDescription(`The channel ${channelMention(channel.id)} already exists as a ${dbResponse.channelType} channel! Please remove it before adding it as an RSVP channel.`)
                            .setColor(Colors.Red)]})
                    return;
                }

                // Add the channel to the database.
                await logger.trace('(/rsvp channels add) - Adding channel to RSVP channels in DB');
                await db.addChannelOfType(interaction.guild.id, channel.id, 'rsvp');

                // Inform user of the channel being successfully added.
                await logger.trace('(/rsvp channels add) - Informing user of change');
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully added channel!')
                        .setDescription(`Successfully added ${channelMention(channel.id)} as an RSVP channel!`)
                        .setColor(Colors.Green)]});
            } else if(interaction.options.getSubcommand() === 'remove') {
                await logger.trace(`Slash command (/rsvp channels remove) ran by ${interaction.user.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/rsvp channels remove) - Deferred reply')

                // Check tha the user has the permission to be able to complete this action.
                if(!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/rsvp channels remove) - User doesn\'t have permission to remove RSVP channels');
                    // Inform the user that they aren't permitted to do this.
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the command options
                let channel = interaction.options.getChannel('channel');
                await logger.trace(`(/rsvp channels remove) - Get channel from command. Channel: ${channel.id}`);

                // Check if the DB has the channel or not.
                await logger.trace('(/rsvp channels remove) - Checking DB for channel');
                let dbResponse = await db.getChannelById(interaction.guild.id, channel.id)
                if(!dbResponse) {
                    await logger.trace('(/rsvp channels remove) - The channel doesn\'t exist in DB!');
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel doesn\'t exist!')
                            .setDescription(`The channel ${channelMention(channel.id)} doesn't exist in the database as an RSVP channel!`)
                            .setColor(Colors.Red)]});
                    return;
                } else if(dbResponse.channelType !== 'rsvp') {
                    await logger.trace('(/rsvp channels remove) - The channel doesn\'t exist as an RSVP channel in DB!');
                    await interaction.editReply({embeds: [new EmbedBuilder()
                            .setTitle('Channel doesn\'t exist!')
                            .setDescription(`The channel ${channelMention(channel.id)} doesn't exist in the database as an RSVP channel!`)
                            .setColor(Colors.Red)]});
                    return;
                }

                // Remove the channel from the database.
                await logger.trace('(/rsvp channels remove) - Deleting channel from DB');
                await db.deleteChannelOfType(interaction.guild.id, channel.id, 'rsvp');

                // Inform the user of the deletion
                await logger.trace('(/rsvp channels remove) - Informing the user of the change');
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully removed channel!')
                        .setDescription(`Successfully removed ${channelMention(channel.id)} as an RSVP channel!`)
                        .setColor(Colors.Green)]});
            }
        } else if (interaction.options.getSubcommandGroup() === 'archive') {
            if(interaction.options.getSubcommand() === 'channel') {
                await logger.info(`Slash command (/rsvp archive channel) ran by ${interaction.member.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.info('(/rsvp archive channel) - Deferred reply');

                // Check that the user has the permission to edit the server
                if(!await checkPermissionOwner(db, interaction.member)) {
                    await logger.info('(/rsvp archive channel) - User doesn\'t have permission to set the archive channel');
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the channel from the commands.
                let channel = interaction.options.getChannel('channel');
                await logger.trace(`(/rsvp archive channel) - Getting channel from command. Channel: ${channel.id}`);

                // Set the channel in the DB
                await logger.trace('(/rsvp archive channel) - Setting RSVP archive channel in DB');
                await db.setChannelOfType(interaction.guild.id, channel.id, 'archive');

                // Respond to the user.
                await logger.trace('(/rsvp archive channel) - Informing user of change.');
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Successfully set archive channel!')
                        .setDescription(`Successfully set ${channelMention(channel.id)} as the archive channel!`)
                        .setColor(Colors.Green)]});
            }
        }
    }
}