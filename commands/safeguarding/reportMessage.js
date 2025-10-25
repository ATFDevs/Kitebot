const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    EmbedBuilder,
    Colors,
    codeBlock,
    userMention,
    quote,
    DMChannel,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags,
    InteractionContextType
} = require("discord.js");
const logger = require("../../logger");

function btoaUTF(str) {
    return Buffer.from(str, 'utf8').toString('base64')
}

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Report Concern')
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild),
    async execute(db, interaction) {
        await logger.info(`Message Context Command (Report concern) ran by ${interaction.member.id}`);

        // Get data from the message and interaction.
        const messageContent = interaction.targetMessage.content;
        const messageSender = interaction.targetMessage.author;
        const messageTimestamp = interaction.targetMessage.createdTimestamp;

        const guildId = interaction.guild.id;
        const reportingMember = interaction.member.id;

        // Get the safeguarding channels for the server.
        await logger.trace('(MCC Report Concern) - Getting safeguarding channel from DB')
        let sgc = await db.getChannelOfType(guildId, 'safeguarding');
        let safeguardingChannels = [];
        safeguardingChannels.push(await interaction.guild.channels.fetch(sgc.channelId));


        // Handle if the server doesn't have any safeguarding channels.
        if (safeguardingChannels.length === 0) {
            await logger.trace('(MCC Report Concern) - Guild doesn\'t have a safeguarding channel. Contacting owner');
            safeguardingChannels.splice(0, 1);
            safeguardingChannels.push(await interaction.guild.fetchOwner().then(owner => owner.createDM()))
        }

        // Create the modal for the concern.
        let modal = new ModalBuilder()
            .setCustomId(`report-message-concern-${messageSender.id}`)
            .setTitle('Report Message Concern');

        const concernMessage = new TextInputBuilder()
            .setCustomId('report-message-concern-message')
            .setLabel('Please enter your concern below:')
            .setPlaceholder('I am concerned about this message because...')
            .setStyle(TextInputStyle.Paragraph);

        const actionRow = new ActionRowBuilder().addComponents(concernMessage);
        modal.addComponents(actionRow);

        // Send the modal to the user.
        await logger.trace('(MCC Report Concern) - Displaying reason modal to member')
        await interaction.showModal(modal);

        // Wait for a response from the modal.
        await logger.trace('(MCC Report Concern) - Waiting for response to modal.')
        let modalInteraction = await interaction.awaitModalSubmit({
            time: 900000, filter: (f) => f.customId === `report-message-concern-${messageSender.id}`
        });

        // Store the record in the database.
        await logger.trace('(MCC Report Concern) - Logging safeguarding concern to DB');
        let logId = await db.addMessageConcern(guildId, reportingMember, btoaUTF(modalInteraction.fields.getTextInputValue('report-message-concern-message')), messageSender.id, btoa(messageContent));

        // Send the information for each channel.
        await logger.trace('(MCC Report Concern) - Reporting concern to guild');
        for (let channel of safeguardingChannels) {
            const sentMessage = await channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`Safeguarding concern #${logId}`)
                    .setAuthor({
                        name: messageSender.displayName,
                        iconURL: messageSender.avatarURL(),
                        url: `https://discord.com/users/${messageSender.id}`
                    })
                    .setDescription(`A user has reported a concern with the message ${codeBlock(messageContent)}(https://discord.com/channels/${guildId}/${interaction.targetMessage.channel.id}/${interaction.targetMessage.id}) sent by ${userMention(interaction.targetMessage.author.id)} with reason '${quote(modalInteraction.fields.getTextInputValue('report-message-concern-message'))}'`)
                    .setColor(Colors.Purple)
                    .setTimestamp(messageTimestamp)]
            });

            // Create a thread if the channel isn't a DM channel.
            if (!(channel instanceof DMChannel)) {
                let thread = await sentMessage.startThread({
                    name: `Safeguarding concern for ${messageSender.displayName}`,
                    reason: `<@${messageSender.id}> sent the message ${codeBlock(messageContent)}`
                });
                await thread.send('Please use this thread to log any and all information regarding the concern.');
            }
        }

        // Inform the reporter that the concern has been logged.
        await logger.trace('(MCC Report Concern) - Informing user of Log ID from concern.');
        await modalInteraction.reply({
            content: `Thank you for reporting! The moderation team for the server has been informed and will deal with the issue. If you need to speak to the mods more about the issue, the log ID is #${logId}`,
            flags: MessageFlags.Ephemeral
        });
    }
}