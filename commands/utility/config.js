const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
    codeBlock,
    Colors,
    roleMention,
    InteractionContextType
} = require("discord.js");
const logger = require("../../logger");
const {checkPermissionAdmin, checkPermissionOwner} = require('../../utility/permission');
const {nonPermittedAction} = require('../../utility/embeds')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Commands to deal with the configuration of the guild.')
        .setContexts(InteractionContextType.Guild)
        .addSubcommandGroup(messagesGroup =>
            messagesGroup
                .setName('messages')
                .setDescription('Custom messages sent to people on the guild for particular interactions')
                .addSubcommand(birthdayCommand =>
                    birthdayCommand
                        .setName('birthday')
                        .setDescription('Retrieve the birthday message for the guild')))
        .addSubcommandGroup(roleGroup =>
            roleGroup
                .setName('roles')
                .setDescription('Commands to configure the roles used on your server')
                .addSubcommand(showCommand =>
                    showCommand
                        .setName('show')
                        .setDescription('Show the configured roles and their permissions'))
                .addSubcommand(addCommand =>
                    addCommand
                        .setName('add')
                        .setDescription('Add a configured role to the guild')
                        .addRoleOption(roleOption =>
                            roleOption
                                .setName('role')
                                .setDescription('The role to add to the configuration')
                                .setRequired(true))
                        .addNumberOption(rolePermissionLevel =>
                            rolePermissionLevel
                                .setName('permission-level')
                                .setDescription('The permission of the role that you are adding')
                                .addChoices(
                                    {name: 'Banned', value: 0},
                                    {name: 'Member', value: 1},
                                    {name: 'Moderator', value: 2},
                                    {name: 'Administrator', value: 3},
                                    {name: 'Owner / Superuser (DANGEROUS)', value: 4}
                                )
                                .setRequired(true)))
                .addSubcommand(removeCommand =>
                    removeCommand
                        .setName('remove')
                        .setDescription('Remove the role from the configuration')
                        .addRoleOption(roleOption =>
                            roleOption
                                .setName('role')
                                .setDescription('The role to remove from the configuration')
                                .setRequired(true)))),
    async execute(db, interaction) {
        if (interaction.options.getSubcommandGroup() === 'messages') {
            if (interaction.options.getSubcommand() === 'birthday') {
                await logger.info(`Slash command (/config messages birthday) ran by ${interaction.user.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/config messages birthday) - Deferred reply');

                // Check the permissions of the user.
                if (!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/config messages birthday) - User is not authorized!');
                    await interaction.deferReply({embeds: [nonPermittedAction]})
                    return;
                }

                // Get the message from the database.
                await logger.trace('(/config messages birthday) - Getting the birthday message from DB');
                let birthdayMessage = await db.getBirthdayMessage(interaction.guild.id);

                // Send the response to the user.
                await logger.trace('(/config messages birthday) - Sending reply to user.');
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Birthday Message')
                        .setDescription(`The birthday message for the guild is: ${codeBlock(birthdayMessage)}`)
                        .setColor(Colors.Green)]
                });
            }
        } else if (interaction.options.getSubcommandGroup() === 'roles') {
            if (interaction.options.getSubcommand() === 'show') {
                await logger.info(`Slash command (/config roles show) ran by ${interaction.user.id}`)
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/config roles show) - Deferred reply');

                // Check the permissions of the member running the command
                if (!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/config roles show) - User is not authorized!');
                    await interaction.editReply({embeds: [nonPermittedAction]})
                    return;
                }
                await logger.trace('(/config roles show) - Getting roles from DB')
                let roles = await db.getRolesForGuild(interaction.guild.id);

                let roleArrays = {
                    0: [],
                    1: [],
                    2: [],
                    3: [],
                    4: []
                }

                logger.trace('(/config roles show) - Sorting and ordering roles');
                for (let role of roles) {
                    roleArrays[role.permission].push(role.roleId);
                }

                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Guild roles')
                        .setDescription('The following are the configured roles for your guild. To configure them further, please use the /guild config command')
                        .addFields(
                            {
                                name: 'Blocked member roles',
                                value: `These are roles for members who aren't permitted to run commands: ${roleArrays[0].map(item => roleMention(item)).join()}`,
                                inline: true
                            },
                            {
                                name: 'Regular member roles',
                                value: `These roles are for members who are entitled to use the bot in the server: ${roleArrays[1].map(item => roleMention(item)).join()}`,
                                inline: true
                            },
                            {
                                name: 'Moderator member roles',
                                value: `These roles are for members who are moderating the server, like running safeguarding commands: ${roleArrays[2].map(item => roleMention(item)).join()}`,
                                inline: true
                            },
                            {
                                name: 'Administrator member roles',
                                value: `These roles are for members who are administrating the server: ${roleArrays[3].map(item => roleMention(item)).join()}`,
                                inline: true
                            },
                            {
                                name: 'Owner member roles',
                                value: `These roles are for the members who are owners, and need all permissions to the server: ${roleArrays[4].map(item => roleMention(item)).join()}`,
                                inline: true
                            }
                        )]
                });


            } else if (interaction.options.getSubcommand() === 'add') {
                await logger.info(`Slash command (/config roles add) ran by ${interaction.user.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/config roles add) - Deferred reply');

                // Check the permissions of the member running the command.
                if (!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/config roles add) - User is not authorized!');
                    await interaction.editReply({embeds: [nonPermittedAction]})
                    return;
                }

                // Check that the user isn't an admin attempting to add a higher role level to themselves.
                if(!await checkPermissionOwner(db, interaction.member) && (await interaction.options.getNumber('permission-level') >= 3)) {
                    await logger.trace('(/config roles add) - Admin is attempting to create a role at a higher permission than they are allowed')
                    await interaction.editReply({embeds: [nonPermittedAction]});
                    return;
                }

                // Get the role from the command.
                let role = await interaction.options.getRole('role');
                let permissionLevel = await interaction.options.getNumber('permission-level');

                await logger.trace(`(/config roles add) - Got role and permission level from command. Role: ${role.id} with level ${permissionLevel}`);

                // Check that the role doesn't already exist in the database.
                await logger.trace('(/config roles add) - Checking DB for role existence');
                if (await db.getRoleById(role.id)) {
                    await logger.trace('(/config roles add) - Role already exists, cancelling command.');
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setTitle('Role already exists!')
                            .setDescription('This role already exists in the database. Please ensure that you remove the role before adding it again.')
                            .setColor(Colors.Red)]
                    });
                    return;
                }

                // Add the role to the database.
                await logger.trace('(/config roles add) - Adding role to DB');
                await db.addRoleToGuild(role.id, interaction.guild.id, permissionLevel);

                // Inform user of change.
                await logger.trace('(/config roles add) - Informing user of change.');
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Added role to guild!')
                        .setDescription(`${roleMention(role.id)} has been added to guild at permission level \`${permissionLevel}\``)
                        .setColor(Colors.Green)]
                })

            } else if (interaction.options.getSubcommand() === 'remove') {
                await logger.info(`Slash command (/config roles remove) ran by ${interaction.user.id}`);
                // Defer the reply to allow time to respond.
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                await logger.trace('(/config roles remove) - Deferred reply');

                // Check the permissions of the member running the command.
                if (!await checkPermissionAdmin(db, interaction.member)) {
                    await logger.trace('(/config roles remove) - User is not authorized!');
                    await interaction.editReply({embeds: [nonPermittedAction]})
                    return;
                }

                // Get the role from the command.
                let role = await interaction.options.getRole('role');
                await logger.trace(`(/config roles remove) - Got role from command. Role: ${role.id}`);

                // Check that the role exists in the database.
                if (!await db.getRoleById(role.id)) {
                    await logger.trace('(/config roles remove) - Role doesn\'t exist! Cancelling command.');
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setTitle('Role doesn\'t exist!')
                            .setDescription('The role doesn\'t already exist in the database! There is no need to remove it.')
                            .setColor(Colors.Red)]
                    })
                }

                // Remove the role to the database.
                await logger.trace('(/config roles remove) - Deleting role from DB');
                await db.deleteRoleFromGuild(role.id, interaction.guild.id);

                // Inform user of change.
                await logger.trace('(/config roles remove) - Informing user of change');
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Removed role from guild!')
                        .setDescription(`${roleMention(role.id)} has been removed from the guild!`)
                        .setColor(Colors.Green)]
                })
            }
        }
    }
}