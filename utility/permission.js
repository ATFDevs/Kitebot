const {PermissionsBitField, GuildMember} = require('discord.js')
const logger = require('../logger');

/**
 * Check if the member is a moderator or higher in the guild
 * @param db
 * @param member {GuildMember}
 * @returns {Promise<boolean>} The status of if the member is an administrative member
 */
async function checkPermissionModerator(db, member) {
    // Check if the member is an admin first.
    if(await checkPermissionAdmin(db, member)) return true;

    // Check that the user has a roleID in the moderator roles.
    let guildRoles = await db.getRolesForGuild(member.guild.id.toString()).then(roles => roles.filter(item => item.permission >= 2).map(item => Number(item.roleId)));

    // Check the database to get roles that are allowed for the guild for management.
    for (const role of member.roles.cache) {
        if(guildRoles.includes(role.id)) return true;
    }

    // Everything else has been checked. Return false
    return false;
}

/**
 * Check if the member is an admin or has admin level permissions in the guild.
 * @param db
 * @param member {GuildMember}
 * @returns {Promise<boolean>} The status of if the member is an administrative member
 */
async function checkPermissionAdmin(db, member) {
    await logger.trace(`checkPermissionAdmin ran for ${member.id}`);
    // Check if the member has edit server permissions.
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild, true)) return true;

    // Alice is default admin for debugging purposes and support in other guilds.
    if(member.id.toString() === '1057258549727727627') return true;

    // Get all roles from the guild.
    let guildRoles = await db.getRolesForGuild(member.guild.id.toString()).then(roles => roles.filter(item => item.permission >= 3).map(item => {
        return Number(item.roleId);
    }));

    // Check the database to get roles that are allowed for the guild for management.
    for (const role of member.roles.cache) {
        if(guildRoles.includes(role.id)) return true;
    }

    // Everything else has been checked, and the member isn't an admin.
    return false;
}

/**
 * Check if the member is an owner or has owner level permissions in the guild.
 * @param db
 * @param member
 * @returns {Promise<boolean>}
 */
async function checkPermissionOwner(db, member) {
    await logger.trace(`checkPermissionOwner ran for ${member.id}`);
    // Check if the user is the owner of the guild.
    let guildOwner = await member.guild.fetchOwner();
    if(guildOwner.id === member.id) return true;

    // Alice is a default owner level permission for debugging purposes and support in other guilds.
    if(member.id.toString() === '1057258549727727627') return true;

    // Get all the roles from the guild.
    let guildRoles = await db.getRolesForGuild(member.guild.id.toString()).then(roles => roles.filter(item => item.permission >= 4).map(item => {
        return Number(item.roleId);
    }));

    // Check the database to get roles that are allowed for the guild for ownership.
    for (const role of member.roles.cache) {
        if(guildRoles.includes(role.id)) return true;
    }

    // Everything else has been checked, and the member isn't an admin.
    return false;
}


module.exports = {checkPermissionOwner, checkPermissionAdmin, checkPermissionModerator}