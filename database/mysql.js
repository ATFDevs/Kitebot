const {Serialize, DataTypes, Sequelize} = require('sequelize');

class Database {
    constructor(dbIp, dbName, dbUsername, dbPassword) {
        this.sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
            host: dbIp,
            dialect: 'mysql',
            logging: false
        });

        this.Birthday = this.sequelize.define('birthday', {
            birthdayID: {type: DataTypes.BIGINT, primaryKey: true},
            birthday: {type: DataTypes.DATE},
            display: {type: DataTypes.BOOLEAN},
        }, {timestamps: false});
    }

    async connect() {
        try {
            await this.sequelize.authenticate();
            await this.sequelize.sync();
        } catch (error) {
            console.error(`[ERROR] - Failed to connect to database with error ${error}`);
        }
    }

    async getBirthday(birthdayId) {
        let birthday = await this.Birthday.findByPk(birthdayId);
        if (!birthday) {
            return null;
        }
        return birthday;
    }

    async editBirthday(birthdayId, birthday, display) {
        let bday = await this.Birthday.findByPk(birthdayId);
        if (!bday) {
            return this.Birthday.create({birthdayId, birthday, display});
        } else {
            return this.Birthday.update({birthday: birthday, display: display})
        }
    }
}

module.exports = Database;