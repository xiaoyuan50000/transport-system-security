const { DataTypes } = require('sequelize');
const dbConf = require('../sequelize/dbConf');

module.exports.Request2 = dbConf.sequelizeObj.define('request', {
    id: {
        type: DataTypes.STRING(11),
        primaryKey: true,
    },
    // serviceMode: {
    //     type: DataTypes.STRING(100),
    // },
    // serviceType: {
    //     type: DataTypes.STRING(100),
    // },
    // purposeType: {
    //     type: DataTypes.STRING(100),
    // },
    // indentRemarks: {
    //     type: DataTypes.STRING(1100),
    // },
    startDate: {
        type: DataTypes.STRING(50),
    },
    estimatedTripDuration: {
        type: DataTypes.STRING(20),
    },
    noOfTrips: {
        type: DataTypes.STRING(11),
    },
    additionalRemarks: {
        type: DataTypes.STRING(100),
    },
    createdBy: {
        type: DataTypes.BIGINT,
    },
    creatorRole: {
        type: DataTypes.STRING(45),
    },
    groupId: {
        type: DataTypes.BIGINT,
    },
    typeOfIndent: {
        type: DataTypes.STRING(100),
    },
    trips: {
        type: DataTypes.VIRTUAL,
    },
    purposeType: {
        type: DataTypes.STRING(100),
    },
    poNumber: {
        type: DataTypes.STRING(100),
    },
    groupName: {
        type: DataTypes.VIRTUAL,
    },
}, {
    timestamps: true,
});

// module.exports.RequestHistory2 = dbConf.sequelizeObj.define('request_history', {
//     id: {
//         type: DataTypes.BIGINT,
//         autoIncrement: true,
//         primaryKey: true,
//     },
//     requestId: {
//         type: DataTypes.STRING(11),
//     },
//     serviceMode: {
//         type: DataTypes.STRING(100),
//     },
//     purposeType: {
//         type: DataTypes.STRING(100),
//     },
//     startDate: {
//         type: DataTypes.STRING(50),
//     },
//     estimatedTripDuration: {
//         type: DataTypes.STRING(20),
//     },
//     noOfTrips: {
//         type: DataTypes.STRING(11),
//     },
//     additionalRemarks:{
//         type: DataTypes.STRING(100),
//     },
//     indentRemarks: {
//         type: DataTypes.STRING(1100),
//     },
//     createdBy: {
//         type: DataTypes.BIGINT,
//     },
//     creatorRole: {
//         type: DataTypes.STRING(45),
//     },
//     groupId: {
//         type: DataTypes.BIGINT,
//     },
//     trips: {
//         type: DataTypes.VIRTUAL,
//     }
// }, {
//     timestamps: true,
// });