const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Wallet = dbConf.sequelizeObj.define('wallet', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    walletName: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    funding: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    spent: {
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
    },
    createdBy: {
        type: DataTypes.INTEGER,
    }
}, {
    timestamps: true,
});

module.exports.WalletBudgetRecord = dbConf.sequelizeObj.define('wallet_budget_record', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    walletId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    createdBy: {
        type: DataTypes.INTEGER,
    },
    taskId: {
        type: DataTypes.BIGINT,
    }
}, {
    timestamps: true,
    updatedAt: false,
});