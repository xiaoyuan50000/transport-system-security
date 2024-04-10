const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Message = dbConf.sequelizeObj.define('message', {
    id: {
        type: DataTypes.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
    },
    fromUser: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },
    toUser: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },
    taskId: {
        type: DataTypes.STRING(55),
        allowNull: false,
    },
    messageType: {
        type: DataTypes.STRING(55),
    },
    chatType: {
        type: DataTypes.STRING(55),
    },
    content: {
        type: DataTypes.TEXT,
    },
    contentSize: {
        type: DataTypes.INTEGER(5),
    },
    messageTime: {
        type: DataTypes.DATE,
    },
    received: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0,
    },
    read: {
        type: DataTypes.STRING(255),
    },
    fromUsername: {
        type: DataTypes.VIRTUAL,
    },
    toUsername: {
        type: DataTypes.VIRTUAL,
    }
}, {
    tableName: 'message',
    timestamps: true,
});
