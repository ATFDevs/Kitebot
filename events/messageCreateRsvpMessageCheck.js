const {Events, EmbedBuilder, Colors, AttachmentBuilder} = require("discord.js");
const logger = require('../logger');

// DEFAULT EMOJIS FOR RSVP.
const rsvpYesEmoji = '✅';
const rsvpMaybeEmoji = '🤷';
const rsvpNoEmoji = '❌';

module.exports = {
    name: Events.MessageCreate,
    async execute(db, interaction) {
        // Don't respond if the member is a bot.
        if (interaction.author.bot) return;

        await logger.trace('Message has been created! Checking if its RSVP valid.');

        // Get the channel that had the message sent in.
        let channelId = Number(interaction.channel.id);

        // Make sure that the channel is valid.
        if (interaction.channel.isTextBased() && !interaction.channel.isDMBased()) {
            // Get all the ID's of the RSVP channels.
            let dbResponse = await db.getChannelsOfType(interaction.guild.id, 'rsvp');

            // Continue if the response isn't valid.
            if(!dbResponse) return;

            // If the channel isn't an RSVP channel, then feel free to carry on.
            if (!dbResponse.map(item => Number(item.channelId)).includes(channelId)) return;

            await logger.info('RSVP Message created!');

            // Get information about the message
            let messageContent = interaction.content;

            // Begin creating an embed for the RSVP.
            let rsvpEmbed = new EmbedBuilder()
                .setTitle(messageContent.split('\n')[0])
                .setDescription(messageContent)
                .setAuthor({
                    name: interaction.author.username,
                    iconURL: interaction.author.avatarURL(),
                    url: `https://discord.com/users/${interaction.author.id}`
                })
                .setColor(Colors.Purple);

            await logger.trace('Deleting the original message.')
            // Get rid of the original message
            await interaction.delete();

            await logger.trace('Sending the RSVP embed.')
            // Send the response embed to the channel.
            let responseMessage = await interaction.channel.send({embeds: [rsvpEmbed]});

            await logger.trace('Checking DB for emojis');
            // Get emoji information for the guild.
            let emojis = await db.getGuildEmojis(interaction.guild.id);

            let yesEmoji = (emojis[0]) ? emojis[0] : rsvpYesEmoji;
            let maybeEmoji = (emojis[1]) ? emojis[1] : rsvpMaybeEmoji;
            let noEmoji = (emojis[2]) ? emojis[2] : rsvpNoEmoji;

            await logger.trace('Reacting to new message');
            // Send the reactions to the message
            await responseMessage.react(yesEmoji);
            await responseMessage.react(maybeEmoji);
            await responseMessage.react(noEmoji);

            await logger.trace('Adding RSVP message to DB.')
            // Finally, add the message to the database.
            await db.addRSVPMessage(interaction.guild.id, interaction.channel.id, responseMessage.id);

            await logger.trace('Adding thread to message');
            // Create a thread on the message
            let threadName = messageContent.split('\n')[0].substr(0, 98)
            let thread = await responseMessage.startThread({
                name: threadName,
                reason: 'Thread created for members of the event to discuss.'
            });
            await thread.send(messageContent);

        }
    }
}