const {SlashCommandBuilder, PermissionsBitField, MessageFlags, EmbedBuilder} = require('discord.js');
const {join} = require("node:path");
const Database = require(join(__dirname, '../database/mysql'))

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
        ),
    async execute(interaction) {
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

            // TODO: Update the database.


            // Display updated embed for the user!
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`Edited birthday for ${user.username}`)
                    .setDescription(`Set the birthday for the user to be YYYY/MM/DD ${year}/${month}/${day}.`)
                    .setColor(0x00ff00)]
            });
        }
    }
}