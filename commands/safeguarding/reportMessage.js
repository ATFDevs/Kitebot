const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    EmbedBuilder,
    Colors,
    codeBlock,
    DMChannel,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Report Concern')
        .setType(ApplicationCommandType.Message), async execute(db, interaction) {

        // Get data from the message and interaction.
        const messageContent = interaction.targetMessage.content;
        const messageSender = interaction.targetMessage.author;
        const messageTimestamp = interaction.targetMessage.createdTimestamp;

        const guildId = interaction.guild.id;
        const reportingMember = interaction.member.id;

        // Get the safeguarding channels for the server.
        let safeguardingChannels = [await db.getChannelOfType(guildId, 'safeguarding')];

        // Handle if the server doesn't have any safeguarding channels.
        if (safeguardingChannels[0] === undefined) {
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
        await interaction.showModal(modal);

        // Wait for a response from the modal.
        let modalInteraction = await interaction.awaitModalSubmit({time: 900000, filter: (f) => f.customId === `report-message-concern-${messageSender.id}`});

        // Store the record in the database.
        let logId = await db.addMessageConcern(guildId, reportingMember, modalInteraction.fields.getTextInputValue('report-message-concern-message'), messageSender.id, messageContent);

        // Send the information for each channel.
        for (let channel of safeguardingChannels) {
            const sentMessage = await channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`Safeguarding concern #${logId}`)
                    .setAuthor({
                        name: messageSender.displayName,
                        iconURL: messageSender.avatarURL(),
                        url: `https://discord.com/users/${messageSender.id}`
                    })
                    .setDescription(`A user has reported a concern with the message ${codeBlock(messageContent)} with reason '${modalInteraction.fields.getTextInputValue('report-message-concern-message')}'`)
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
        await modalInteraction.reply({content:`Thank you for reporting! The moderation team for the server has been informed and will deal with the issue. If you need to speak to the mods more about the issue, the log ID is #${logId}`, flags: MessageFlags.Ephemeral});
    }
}