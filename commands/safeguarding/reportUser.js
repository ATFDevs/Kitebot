const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags,
    ModalBuilder,
    TextInputStyle,
    TextInputBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    Colors,
    userMention,
    DMChannel,
    InteractionContextType
} = require("discord.js");
const logger = require('../../logger');

module.exports = {
    async execute(db, interaction) {
        await logger.info(`User Context Command (Report User Concern) ran by ${interaction.user.id}`);
        // Get the targeted user.
        let concernUser = interaction.targetUser;

        // Create the modal for the concern.
        let modal = new ModalBuilder()
            .setCustomId(`report-user-concern-${concernUser.id}`)
            .setTitle('Report User Concern');

        const concernMessage = new TextInputBuilder()
            .setCustomId('report-user-concern-message')
            .setLabel('Please enter your concern below:')
            .setPlaceholder('I am concerned about this person because...')
            .setStyle(TextInputStyle.Paragraph);

        const actionRow = new ActionRowBuilder().addComponents(concernMessage);
        modal.addComponents(actionRow);

        // Send the modal to the user.
        await logger.trace('(UCC Report User Concern) - Displaying modal to user');
        await interaction.showModal(modal);

        // Wait for the response from the modal.
        await logger.trace('(UCC Report User Concern) - Waiting for response from modal');
        let filter = (interaction) => interaction.customId === `report-user-concern-${concernUser.id}`;
        interaction.awaitModalSubmit({time: 900000, filter: filter}).then(async (modalInteraction) => {
            let logId = await db.addUserConcern(interaction.guild.id, interaction.member.id, btoa(modalInteraction.fields.getTextInputValue('report-user-concern-message')), concernUser.id);

            // Get the safeguarding channels for the server.
            await logger.trace('(UCC Report User Concern) - Getting safeguarding channel from DB');
            let sgc = await db.getChannelOfType(interaction.guild.id, 'safeguarding');
            let safeguardingChannels = [];
            safeguardingChannels.push(await interaction.guild.channels.fetch(sgc.channelId));

            // Handle if the server doesn't have any safeguarding channels.
            let guildOwner = await interaction.guild.fetchOwner();
            if (safeguardingChannels[0] === undefined) {
                await logger.trace('(UCC Report User Concern) - Guild doesn\'t have safeguarding channel. Reporting to owner');
                safeguardingChannels.splice(0, 1);
                safeguardingChannels.push(await guildOwner.createDM());
            }

            await logger.trace('(UCC Report User Concern) - Reporting safeguarding concerns to mods.');
            for (let channel of safeguardingChannels) {
                const sendMessage = await channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle(`Safeguarding concern #${logId}`)
                        .setAuthor({
                            name: concernUser.displayName,
                            iconURL: concernUser.avatarURL(),
                            url: `https://discord.com/users/${concernUser.id}`
                        })
                        .setDescription(`A user has reported a concern with ${userMention(concernUser.id)} with reason '${modalInteraction.fields.getTextInputValue('report-user-concern-message')}'.`)
                        .setColor(Colors.Purple)
                        .setTimestamp(new Date())]
                });

                // If the channel is not a DM channel
                if (!(channel instanceof DMChannel)) {
                    let thread = await sendMessage.startThread({
                        name: `Safeguarding concern for ${concernUser.displayName}`,
                        reason: `${userMention(concernUser.id)} has concern '${modalInteraction.fields.getTextInputValue('report-user-concern-message')} raised about them.'`
                    });
                    await thread.send('Please use this thread to log any and all information regarding the concern.');
                }
            }

            // Inform user of the report.
            await logger.trace('(UCC Report User Concern) - Informing user of Log ID for safeguarding concern.')
            await modalInteraction.reply({content: `Thank you for reporting! The moderation team for the server has been informed and will deal with the issue. If you need to speak to the mods more about the issue, the log ID is #${logId}`, flags: MessageFlags.Ephemeral});
        });
    }, data: new ContextMenuCommandBuilder()
        .setName('Report User Concern')
        .setType(ApplicationCommandType.User)
        .setContexts(InteractionContextType.Guild)
}