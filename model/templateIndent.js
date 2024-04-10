const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.TemplateIndent = dbConf.sequelizeObj.define('template_indent', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    groupId: {
        type: DataTypes.BIGINT
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING(10)
    },
    resourceTypeId: {
        type: DataTypes.BIGINT
    },
    resourceType: {
        type: DataTypes.STRING(100)
    },
    serviceModeId: {
        type: DataTypes.BIGINT
    },
    serviceMode: {
        type: DataTypes.STRING(100)
    },
    resource: {
        type: DataTypes.STRING(200)
    },
    noOfResource: {
        type: DataTypes.INTEGER
    },
    driver: {
        type: DataTypes.TINYINT
    },
    noOfDriver: {
        type: DataTypes.INTEGER
    },
    recurring: {
        type: DataTypes.VIRTUAL
    },
    createdBy: {
        type: DataTypes.BIGINT
    }
}, {
    timestamps: true,
});