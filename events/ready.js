const {Events, userMention} = require('discord.js');
const Database = require("../database/mysql");
const {join} = require("node:path");

module.exports = {
    name: Events.ClientReady, once: true, async execute(db, client) {
        console.log(`Ready! Logged into discord as ${client.user.tag}!`);

        // Birthday handler.
        //TODO: CREATE BIRTHDAY HANDLER
        setInterval(async () => {
            // Get the current date to check against.
            const now = new Date();

            // Only work between 8am-9am.
            const hour = now.getHours().toString().padStart(2, "0");
            if (Number(hour) !== 8) {
                return;
            }


            // Get all the guilds from the client.
            const g = await client.guilds.fetch();
            const guilds = [...g.values()].map(item => item.id);
            for (let guildId of guilds) {
                // Get the birthday channel from the database.
                let birthday = await db.getChannelOfType(guildId.toString(), 'birthday');
                if (!birthday) continue;

                // Get the birthday announcement channel.
                let channel = await client.channels.fetch(birthday.channelId);
                let birthdayMessage = await db.getBirthdayMessage(guildId);

                // For every birthday in the list.
                for (let birthday of await db.getBirthdayFromDate(now)) {
                    if (birthday.birthdayId.split('#')[0] !== guildId) continue;

                    // Get the user ID from the request.
                    let userId = birthday.birthdayId.split('#')[1];

                    // Send the birthday message.
                    await channel.send({content: birthdayMessage.replace('{member}', userMention(userId))});
                }


            }

        }, 1000 * 60 * 60 )
    }
}