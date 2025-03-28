const {Events, AttachmentBuilder, channelMention} = require("discord.js");


module.exports = {
    name: Events.MessageDelete,
    async execute(db, interaction) {
        // Check that the message deleted is in the right context.
        if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) return;

        // Get the message and check against the database to see if it is a RSVP Message.
        const messageId = interaction.id;
        const channelId = interaction.channel.id;
        const guildId = interaction.guild.id;

        // Check if the deleted message was an RSVP Message.
        if (!await db.isRSVPMessage(guildId, channelId, messageId)) return;

        // Get the thread channel and remove all members.
        let threadChannel = await interaction.guild.channels.fetch(messageId);
        for (const [memberId, _] of await threadChannel.members.fetch()) {
            if (memberId === interaction.client.user.id) continue;
            await threadChannel.members.remove(memberId);
        }

        if(await db.getArchiveStatus(guildId)) {
            // Get the message history of the thread channel and log it.
            let retrievedMessages = [];
            let lastRetrievedMessage = null;

            while (true) {
                const fetchedMessages = await threadChannel.messages.fetch({
                    limit: 100,
                    before: lastRetrievedMessage
                });

                retrievedMessages.push(...fetchedMessages.values());

                if (fetchedMessages.size === 0) break;

                lastRetrievedMessage = fetchedMessages.last().id;
            }
            let messages = retrievedMessages.map(item => {
                return `${item.author.username}(${item.author.id}) [${item.createdAt.toLocaleString()}] - ${item.content}`;
            })

            // Prepare information for uploading to discord.
            const fileBuffer = Buffer.from(messages.join("\n"), "utf8");
            const attachment = new AttachmentBuilder(fileBuffer, {name: 'log.txt'});

            // Get the archive channel and send the file to it.
            let dbResponse = await db.getChannelOfType(interaction.guild.id, 'archive');
            let archiveChannel = await interaction.guild.channels.fetch(dbResponse.channelId);
            await archiveChannel.send({
                content: `Archive of ${messages.reverse()[1].split(' - ')[1].replace('\n', '')} in ${channelMention(interaction.channel.id)}`,
                files: [attachment]
            });
        }

        // Delete once all messages have been archived.
        await threadChannel.delete();

        // Delete the message from the database.
        await db.deleteRSVPMessage(guildId, channelId, messageId);
    }
}