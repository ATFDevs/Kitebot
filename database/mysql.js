const {Serialize, DataTypes, Sequelize, literal} = require('sequelize');
const logger = require('../logger');


class Database {
    constructor(dbIp, dbName, dbUsername, dbPassword) {
        this.sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
            host: dbIp, dialect: 'mysql', logging: false, dialectOptions: {
                connectTimeout: 10000,
            }
        });

        this.Birthday = this.sequelize.define('birthday', {
            birthdayId: {type: DataTypes.BIGINT, primaryKey: true},
            birthday: {type: DataTypes.DATE},
            display: {type: DataTypes.BOOLEAN},
        }, {timestamps: false});

        this.Channel = this.sequelize.define('channels', {
            channelId: {type: DataTypes.BIGINT, primaryKey: true},
            guildId: {type: DataTypes.BIGINT},
            channelType: {type: DataTypes.STRING},
        }, {timestamps: false});

        this.Safeguarding = this.sequelize.define('safeguardingLogs', {
            logId: {type: DataTypes.BIGINT, notNull: true, autoIncrement: true, primaryKey: true},
            guildId: {type: DataTypes.BIGINT, notNull: true},
            reporterId: {type: DataTypes.BIGINT, notNull: true},
            reporterConcern: {type: DataTypes.TEXT},
            userId: {type: DataTypes.BIGINT, notNull: true},
            userMessage: {type: DataTypes.TEXT},
        }, {timestamps: false});

        this.ServerInformation = this.sequelize.define('serverInformation', {
            guildId: {type: DataTypes.BIGINT, notNull: true, primaryKey: true},
            rsvpYesEmoji: {type: DataTypes.BIGINT},
            rsvpMaybeEmoji: {type: DataTypes.BIGINT},
            rsvpNoEmoji: {type: DataTypes.BIGINT},
            archiveEnabled: {type: DataTypes.BOOLEAN, defaultValue: false, notNull: true},
        }, {timestamps: false});

        this.Message = this.sequelize.define('messages', {
            messageId: {type: DataTypes.BIGINT, notNull: true, primaryKey: true},
            channelId: {type: DataTypes.BIGINT, notNull: true},
            guildId: {type: DataTypes.BIGINT, notNull: true},
            messageType: {type: DataTypes.STRING, notNull: true},
        }, {timestamps: false});

        this.Roles = this.sequelize.define('roles', {
            roleId: {type: DataTypes.BIGINT, notNull: true, primaryKey: true},
            guildId: {type: DataTypes.BIGINT, notNull: true},
            permission: {type: DataTypes.INTEGER, notNull: true, defaultValue: 1},
        }, {timestamps: false});

        this.SpecialMessages = this.sequelize.define('specialMessages', {
            guildId: {type: DataTypes.BIGINT, notNull: true},
            messageType: {type: DataTypes.STRING, notNull: true},
            message: {type: DataTypes.TEXT},
        }, {timestamps: false});
    }

    async connect() {
        await logger.info('DB - Attempting to connect')
        try {
            await this.sequelize.authenticate();
            await this.sequelize.sync();
        } catch (error) {
            await logger.fatal(`DB - Failed to connect to database with error ${error}`);
            await process.exit(1);
        }
    }

    async getBirthday(birthdayId) {
        await logger.trace('DB - running getBirthday');
        let birthday = await this.Birthday.findByPk(birthdayId);
        if (!birthday) {
            return null;
        }
        return birthday;
    }

    async getBirthdayFromDate(date) {
        await logger.trace('DB - Running getBirthdayFromDate');
        try {
            return await this.Birthday.findAll({where: literal(`MONTH(birthday) = ${date.getMonth() + 1} AND DAY(birthday) = ${date.getDate()}`)});
        } catch (error) {
            await logger.error(`DB - Failed to getBirthdayFromDate with error ${error}`);
        }
    }

    async editBirthday(birthdayId, birthday, display) {
        await logger.trace('DB - Running editBirthday');
        try {
            let bday = await this.Birthday.findByPk(birthdayId);
            if (!bday) {
                return await this.Birthday.create({birthdayId, birthday, display});
            } else {
                return await this.Birthday.upsert({
                    birthdayId: birthdayId, birthday: birthday, display: display
                }, {where: {birthdayId: birthdayId}});
            }
        } catch (error) {
            await logger.error(`DB - Failed to editBirthday with error ${error}`);
        }
    }

    /**
     * Get the birthday message for the guild!
     * @param guildId
     * @returns {Promise<string>}
     */
    async getBirthdayMessage(guildId) {
        await logger.trace('DB - Running getBirthdayMessage');
        let defaultMessage = 'Happy birthday {member}! We hope you have an awesome day!!';
        try {

            let response = await this.SpecialMessages.findOne({
                attributes: ['message'], // THIS NEEDS TO BE USED AS TABLE DOESN'T HAVE PK!!
                where: {
                    guildId: guildId,
                    messageType: 'birthday'
                }
            });
            return (response) ? response.message : defaultMessage;

        } catch (error) {
            await logger.error(`DB - Failed to getBirthdayMessage with error ${error}`);
            return defaultMessage;
        }
    }

    async editBirthdayMessage(guildId, messageContent) {
        await logger.trace('DB - Running editBirthdayMessage');
        try {
            await this.SpecialMessages.update({guildId: guildId, messageType: 'birthday', message: messageContent}, {where: {guildId: guildId, messageType: 'birthday'}});
        } catch (error) {
            await logger.error(`BD - Failed to editBirthdayMessage with error ${error}`);
        }
    }

    // Channels
    /**
     * Queries the database for a specific type of registered channel.
     * @param guildId {String | Number} The ID of the guild that you are searching.
     * @param channelType {String} The type of channel that you are looking for.
     * @returns {Promise<Model[]>} An array of all the results.
     */
    async getChannelOfType(guildId, channelType) {
        await logger.trace('DB - Running getChannelOfType');
        try {
            return await this.Channel.findOne({where: {guildId: guildId, channelType: channelType}});
        } catch (error) {
            await logger.error(`DB - Failed to getChannelOfType with error ${error}`);
        }
    }

    async getChannelById(guildId, channelId) {
        await logger.trace('DB - Running getChannelById');
        try {
            return await this.Channel.findOne({where: {guildId: guildId, channelId: channelId}});
        } catch (error) {
            await logger.error(`DB - Failed to getChannelById with error ${error}`);
        }
    }

    async getChannelsOfType(guildId, channelType) {
        await logger.trace('DB - Running getChannelsOfType');
        try {
            return await this.Channel.findAll({where: {guildId: guildId, channelType: channelType}});
        } catch (error) {
            await logger.error(`DB - Failed to getChannelsOfType with error ${error}`);
        }
    }

    async setChannelOfType(guildId, channelId, channelType) {
        await logger.trace('DB - Running setChannelOfType');
        try {
            await this.Channel.upsert({guildId: guildId, channelId: channelId, channelType: channelType}, {where: {guildId: guildId, channelId: channelId}});
        } catch (error) {
            await logger.error(`DB - Failed to setChannelOfType with error ${error}`);
        }
    }

    async addChannelOfType(guildId, channelId, channelType) {
        await logger.trace('DB - Running addChannelOfType');
        try {
            await this.Channel.upsert({
                channelId: channelId,
                guildId: guildId,
                channelType: channelType
            }, {where: {guildId: guildId, channelId: channelId}});
        } catch (error) {
            await logger.error(`DB - Failed to addChannelOfType with error ${error}`);
        }
    }

    async deleteChannelOfType(guildId, channelId, channelType) {
        await logger.trace('DB - Running deleteChannelOfType');
        try {
            if (await this.Channel.findOne({
                where: {
                    guildId: guildId,
                    channelId: channelId,
                    channelType: channelType
                }
            })) {
                await this.Channel.destroy({where: {guildId: guildId, channelId: channelId, channelType: channelType}});
            }
        } catch (error) {
            await logger.error(`DB - Failed to deleteChannelOfType with error ${error}`);
        }
    }

    // Safeguarding commands
    // TODO: DO logging from here.
    /**
     * Report a message to the safeguarding team. Database entry. Message interaction.
     * @param guildId {int} The ID for the guild the concern was raised in.
     * @param reporterId {int} The ID of the person who reported the concern.
     * @param reporterConcern {String|Null} The concern that the reporter has.
     * @param userId {int} The ID of the person with concern.
     * @param userMessage {String} The message which is of concern.
     * @returns {Promise<int>} A promise to return the log ID
     */
    async addMessageConcern(guildId, reporterId, reporterConcern, userId, userMessage) {
        let mReporterConcern = (reporterConcern && reporterConcern.length > 0) ? reporterConcern : null;

        try {
            let response = await this.Safeguarding.create({
                guildId: guildId,
                reporterId: reporterId,
                reporterConcern: mReporterConcern,
                userId: userId,
                userMessage: userMessage
            });

            return response.logId;
        } catch (error) {
            console.error(`[ERROR] - Failed to add safeguarding concern ${error}`);
        }
    }

    /**
     * Report a user to the safeguarding team. Database entry. Message interaction.
     * @param guildId {int} The ID for the guild the concern was raised in.
     * @param reporterId {int} The ID of the person who reported the concern.
     * @param reporterConcern {String|null} The concern that the reporter has.
     * @param userId {int} The ID of the person with concern.
     * @returns {Promise<int>} The logId of the safeguarding concern.
     */
    async addUserConcern(guildId, reporterId, reporterConcern, userId) {
        let mReporterConcern = (reporterConcern && reporterConcern.length > 0) ? reporterConcern : null;

        try {
            let response = await this.Safeguarding.create({
                guildId: guildId, reporterId: reporterId, reporterConcern: mReporterConcern, userId: userId
            });

            return response.logId;
        } catch (error) {
            console.error(`[ERROR] - Failed to add user concern ${error}`);
        }
    }

    //RSVP
    /**
     * Adds the RSVP message to the database to be stored and used later.
     * @param guildId {number | String} The ID of the guild that the message was created in.
     * @param channelId {number | String} The ID of the channel that the message was created in.
     * @param messageId {number | String} The ID of the message.
     * @returns {Promise<void>}
     */
    async addRSVPMessage(guildId, channelId, messageId) {
        try {
            await this.Message.create({
                messageId: messageId,
                channelId: channelId,
                guildId: guildId,
                messageType: 'RSVP'
            })
        } catch (error) {
            console.error(`[ERROR] - Failed to add RSVP Message with error: ${error}`);
        }
    }

    async isRSVPMessage(guildId, channelId, messageId) {
        try {
            return Boolean(await this.Message.findOne({
                where: {
                    messageId: messageId,
                    channelId: channelId,
                    guildId: guildId,
                    messageType: 'RSVP'
                }
            }));
        } catch (error) {
            console.error(`[ERROR] - Failed to check for RSVP message with error ${error}`);
        }
    }

    async deleteRSVPMessage(guildId, channelId, messageId) {
        try {
            await this.Message.destroy({
                where: {
                    messageId: messageId,
                    channelId: channelId,
                    guildId: guildId,
                    messageType: 'RSVP'
                }
            });
        } catch (error) {
            console.error(`[ERROR] - Failed to delete RSVP message with error ${error}`);
        }
    }

    // Server Information
    /**
     * Gets the emoji information stored for the server.
     * @param guildId {number} The ID for the guild you want emojis for.
     * @returns {Promise<Number[]>}
     */
    async getGuildEmojis(guildId) {
        try {
            let response = await this.ServerInformation.findOne({
                where: {
                    guildId: guildId,
                }
            });

            // If the database doesn't return an item, then create data for guild.
            if (!response) {
                await this.ServerInformation.upsert({guildId: guildId}, {where: {guildId: guildId}}).then(async (_) => {
                    return [null, null, null];
                });
            }

            return [response.rsvpYesEmoji, response.rsvpMaybeEmoji, response.rsvpNoEmoji];
        } catch (error) {
            console.error(`[ERROR] - Failed to get user emojis: ${error}`);

            // Create a new entry since there likely isn't one in the database.
            await this.ServerInformation.upsert({guildId: guildId}, {where: {guildId: guildId}}).then(async (_) => {
                return [null, null, null];
            });
        }
    }

    /**
     * Gets all stored roles for a guild.
     * @param guildId {Number | String} The ID for the guild you want to query.
     * @returns {Promise<Model[]>} The array of role information.
     */
    async getRolesForGuild(guildId) {
        try {
            return await this.Roles.findAll({where: {guildId: guildId}});
        } catch (error) {
            console.error(`[ERROR] - Failed to get roles for guild: ${error}`);
        }
    }

    /**
     * Get a specific role from the guild.
     * @param roleId {Number | String} The ID of the role to query.
     * @returns {Promise<Model|null>} The role provided no errors.
     */
    async getRoleById(roleId) {
        try {
            return await this.Roles.findOne({where: {roleId: roleId}});
        } catch (error) {
            console.error(`[ERROR] - Failed to get role by id ${error}`);
        }
    }

    async addRoleToGuild(roleId, guildId, rolePermissionLevel) {
        try {
            await this.Roles.create({roleId: roleId, guildId: guildId, permission: rolePermissionLevel});
        } catch (error) {
            console.error(`[ERROR] - Failed to add role to guild: ${error}`);
        }
    }

    async deleteRoleFromGuild(roleId, guildId) {
        try {
            await this.Roles.destroy({where: {roleId: roleId, guildId: guildId}});
        } catch (error) {
            console.error(`[ERROR] - Failed to delete role from guild: ${error}`);
        }
    }

    /**
     * Get the status of the archive, to see if it is enabled or not.
     * @param guildId {Number | String} The ID of the guild you want to check for.
     * @returns {Promise<boolean>}
     */
    async getArchiveStatus(guildId) {
        try {
            let val = await this.ServerInformation.findOne({where: {guildId: guildId}});
            return val.archiveEnabled;
        } catch (error) {
            console.error(`[ERROR] - Failed to get the archive status for guild: ${error}`);
        }
    }
}

module.exports = Database;