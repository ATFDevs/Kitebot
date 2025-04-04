const {ContextMenuCommandBuilder, ApplicationCommandType, InteractionContextType, EmbedBuilder, Colors, MessageFlags} = require("discord.js");
const logger = require('../../logger');
const {checkPermissionModerator} = require('../../utility/permission');
const {nonPermittedAction} = require('../../utility/embeds');


module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Delete RSVP Message')
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild),
    async execute(db, interaction) {
        // Log the command being run
        await logger.info(`Message Context Command (Delete RSVP Message) ran by ${interaction.user.id}`);

        // Check that the message is an RSVP message.
        await logger.trace('(Delete RSVP Message) - Checking if the message is an RSVP message');
        if(!await db.isRSVPMessage(interaction.guild.id, interaction.targetMessage.channel.id, interaction.targetMessage.id)) {
            await interaction.reply({content: 'This message isn\'t an RSVP message!', flags: MessageFlags.Ephemeral});
            return;
        }

        // Check that the user is either a moderator or privileged to access it.
        await logger.trace('(Delete RSVP Message) - Checking if the user is authorized to delete the message');
        const embed = interaction.targetMessage.embeds[0];
        const embedAuthorUrl = embed.author.url;
        const authorId = embedAuthorUrl.replace('https://discord.com/users/', '').trim();
        if(interaction.user.id.toString() !== authorId && !(await checkPermissionModerator(db, interaction.member))) {
            await interaction.reply({embeds: [nonPermittedAction], flags: MessageFlags.Ephemeral});
            return;
        }

        // Delete the message, triggering the message delete event.
        await logger.trace('(Delete RSVP Message) - Deleting the message');
        await interaction.targetMessage.delete();

        await interaction.reply({embeds: [new EmbedBuilder()
            .setTitle('Deleted RSVP Message')
            .setDescription('The RSVP message has just been deleted!')
            .setColor(Colors.Green)], flags: MessageFlags.Ephemeral});

    }
}