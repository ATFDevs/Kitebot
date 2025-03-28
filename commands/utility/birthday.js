const {SlashCommandBuilder, PermissionsBitField, MessageFlags, EmbedBuilder, Colors, codeBlock} = require('discord.js');
const {checkPermissionAdmin} = require('../../utility/permission')
const {nonPermittedAction} = require('../../utility/embeds');

const permissionDeniedEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Permission denied')
    .setDescription('You are not authorized to perform this action!')

const invalidDateEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Invalid Date')
    .setDescription('This date is invalid! Please select a valid date and try again.')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Handles birthday settings for the server.')
        .addSubcommand(setCommand =>
            setCommand
                .setName('set')
                .setDescription('Sets your birthday!')
                .addNumberOption(option =>
                    option.setName('day').setDescription('The day of your birthday').setRequired(true)
                        .setMinValue(1).setMaxValue(31)
                )
                .addNumberOption(option =>
                    option.setName('month').setDescription('The month of your birthday').setRequired(true)
                        .setMinValue(1).setMaxValue(12)
                )
                .addNumberOption(option =>
                    option.setName('year').setDescription('The year of your birthday').setRequired(true)
                        .setMinValue(1900)
                )
                .addBooleanOption(option =>
                    option.setName('display').setDescription('Choose if the birthday is displayed or not').setRequired(true))
                .addUserOption(user =>
                    user.setName('user').setDescription('The user to set the birthday for')
                )
        )
        .addSubcommand(getCommand =>
            getCommand
                .setName('get')
                .setDescription('Get a birthday for your server.')
                .addUserOption(user =>
                    user.setName('user').setDescription('The user to get the birthday for').setRequired(false))
        )
        .addSubcommand(channelCommand =>
            channelCommand
                .setName('channel')
                .setDescription('Set the channel for the birthday messages to be displayed in.')
                .addChannelOption(channel =>
                    channel.setName('channel').setDescription('The channel to display birthday messages in').setRequired(true))
        )
        .addSubcommand(messageCommand =>
            messageCommand
                .setName('message')
                .setDescription('The message to be displayed when someone has a birthday!')),
    async execute(db, interaction) {
        if (interaction.options.getSubcommand() === 'set') {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            let day = interaction.options.getNumber('day');
            let month = interaction.options.getNumber('month');
            let year = interaction.options.getNumber('year');
            let display = interaction.options.getBoolean('display');
            let user = interaction.options.getUser('user') ?? interaction.user;

            // Check if the user to change is different to the user who initiated the command, and of it is are they allowed to manage the server?
            if (user !== interaction.user && !interaction.member.permissions.has([PermissionsBitField.Flags.MANAGE_GUILD])) {
                // Inform the user of lack of permissions.
                await interaction.editReply({embeds: [permissionDeniedEmbed]});
                return;
            }

            // Check that the date is valid
            const inputDate = new Date(`${year}/${month}/${day}`);
            if (isNaN(inputDate)) {
                await interaction.editReply({embeds: [invalidDateEmbed]});
                return;
            }

            // Check that the date is in the past.
            const currentDate = new Date();
            if (inputDate > currentDate) {
                await interaction.editReply({embeds: [invalidDateEmbed]});
                return;
            }

            // Log to console what happened.
            console.log(`/birthday set ran by ${interaction.user.id} with options day: ${day}, month: ${month}, year: ${year}, display: ${display} user: ${user.tag}(${user.id})`);

            await db.editBirthday(`${interaction.guild.id}#${user.id}`, `${year}-${month}-${day}`, display);

            // Display updated embed for the user!
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`Edited birthday for ${user.username}`)
                    .setDescription(`Set the birthday for the user to be YYYY/MM/DD ${year}/${month}/${day}.`)
                    .setColor(0x00ff00)]
            });
        } else if (interaction.options.getSubcommand() === 'get') {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            let user = interaction.options.getUser('user') ?? interaction.user;

            // Check user has permissions to run function for another member.
            if (user !== interaction.user && !interaction.member.permissions.has([PermissionsBitField.Flags.MANAGE_GUILD])) {
                await interaction.editReply({embeds: [permissionDeniedEmbed]});
                return;
            }

            let birthday = await db.getBirthday(`${interaction.guild.id}#${user.id}`);

            // Check that the birthday exists.
            if (!birthday) {
                // No birthday has been recorded for the user.
                interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle(`No birthday for ${user.username}`)
                        .setDescription(`Please inform the user to set a birthday!`)
                        .setColor(0xff0000)]
                });
            } else {
                let birthday_date = new Date(birthday.birthday);
                // Inform user of birthday
                interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle(`Birthday for ${user.username}`)
                        .setDescription(`Their birthday is ${birthday_date.toDateString()}`)
                        .setColor(0x00ff00)]
                });
            }
        } else if (interaction.options.getSubcommand() === 'channel') {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            // Get the channel from the command.
            let channel = interaction.options.getChannel('channel');

            // Check that the user running the command has permissions
            if (!interaction.member.permissions.has([PermissionsBitField.Flags.MANAGE_GUILD])) {
                await interaction.editReply({embed: [permissionDeniedEmbed]});
                return;
            }

            // Update the channel in the database.
            await db.setChannelOfType(interaction.guild.id, channel.id, 'birthday');

            // Inform user of the changes made.
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('Updated channel for birthdays')
                    .setDescription(`Set the birthday channel to <#${channel.id}> for the server. Messages will be announced here`)
                    .setColor(0x0000ff)]
            });
        } else if (interaction.options.getSubcommand() === 'message') {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            // Check that the user has permissions to run the command.
            if(!await checkPermissionAdmin(db, interaction.member)) {
                await interaction.editReply({embeds: [nonPermittedAction]});
                return;
            }

            await interaction.editReply({embeds: [new EmbedBuilder()
                    .setTitle('Set the guild birthday message!')
                    .setDescription('Write out in the channel the birthday message that you want to use for the guild! **You have 2 minutes to write this out before the interaction gets cancelled.**')
                    .setColor(Colors.Purple)
                    .addFields(
                        {name: 'Replacements', value: '- {member} gets replaced with mentioning the member!', inline: false}
                    )]});

            let filter = response => response.author.id === interaction.member.id;
            try {
                const responseMessage = await interaction.channel.awaitMessages({
                    filter: filter,
                    max: 1,
                    time: 10000 * 60 * 2,
                    errors: ['time']
                });

                // Get the message from what the member has said.
                let birthdayMessage = responseMessage.first().content;
                await responseMessage.first().delete();

                // Update the message in the database.
                await db.editBirthdayMessage(interaction.guild.id, birthdayMessage);

                // Inform the user of the new message
                await interaction.editReply({embeds: [new EmbedBuilder()
                        .setTitle('Updated birthday message!')
                        .setDescription(`You have set the birthday message to: ${codeBlock(birthdayMessage)}`)
                        .setColor(Colors.Green)]});

            } catch (error) {
                console.error(error);
                await interaction.editReply('You didn\'t respond in time!');
            }
        }
    }
}