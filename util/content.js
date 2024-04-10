module.exports = {
    USER_STATUS: {
        Active: 'Active',
        LockOut: 'Lock Out',
        Deactivated: 'Deactivated',
    },

    USER_ACTIVITY: {
        Activate: "Activate",
        Unlock: "Unlocked",
        LockOut: "Lock Out",
        Deactivate: "Deactivate",
        AccountCreation: "Account Creation",
        AccountEdit: "Account Edit",
        AccountApprove: "Account Approve",
        AccountRegister: "Account Register",
        AccountRejected: "Account Rejected",
    },

    DRIVER_STATUS: {
        EMPTY: "",
        UNASSIGNED: "Unassigned",
        ASSIGNED: "Assigned",
        COMPLETED: "Completed",
        NOSHOW: "No Show",
        NOSHOWSYSTEM: "No Show (System)",
        ARRIVED: "Arrived",
        DEPARTED: "Started",
        LATE: "Late Trip",
    },
    INDENT_STATUS: {
        APPROVED: "Approved",
        REJECTED: "Rejected",
        CANCELLED: "Cancelled",
        WAITAPPROVEDUCO: "Pending for approval(UCO)",
        WAITAPPROVEDRF: "Pending for approval(RF)",
        WAITCANCELUCO: "Pending for cancellation(UCO)",
        WAITCANCELRF: "Pending for cancellation(RF)",
        COMPLETED: "Completed",
        IMPORTED: "Imported",
    },
    TASK_STATUS: {
        UNASSIGNED: "unassigned",
        ASSIGNED: "assigned",
        ACKNOWLEDGED: "acknowledged",
        WAITACKNOWLEDGEMENT: "waiting for acknowledgement",
        COLLECTED: "collected",
        STARTED: "started",
        ARRIVED: "arrived",
        SUCCESSFUL: "successful",
        FAILED: "failed",
        CANCELLED: "cancelled",
        CANCELLED3RD: "cancelled by TSP",
        LATE: "late",
        DECLINED: "declined",
    },
    ROLE: {
        RQ: "RQ",
        UCO: "UCO",
        RF: "RF",
        TSP: "TSP",
        OCC: ["OCC Mgr"],
        OCCMgr: "OCC Mgr",
        RA: "RA",
        CM: "CM",
        // OCCExec: "OCC Exec",
        // OCCSup: "OCC SUP",
        // OCCCanApprove: ["OCC Mgr", "OCC Exec"],
    },
    // EndorseStatus: ["Completed", "No Show", "Late Trip", "No Show (System)"],
    ViewActionRole: ["UCO", "RF", "RQ", "TSP", "OCC Mgr"],
    OperationAction: {
        NewIndent: "New Indent",
        NewTrip: "New Trip",
        EditTrip: "Edit Trip",
        Approve: "Approve",
        Reject: "Reject",
        Cancel: "Cancel",
        Endorse: "Endorse",
        ChangeStatus: "Change Status",
    },
    MobileInvisibleStatus: ["declined", "cancelled", "cancelled by TSP"],
    DuplicateTaskStatus: ["declined", "cancelled by TSP"],
    ChargeType: {
        HOUR: "Hour",
        TRIP: "Trip",
        OTBLOCK: "Block_OTBlock",
        OTHOURLY: "Block_OTHourly",
        MIX: "Mix",
        DAILY: "Daily",
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
        YEARLY: "Yearly",
        DAILYTRIP: "DailyTrip",
        BLOCKDAILY: "Block_Daily",
        BLOCKDAILY_1: "Block_Daily_1",
        BLOCKDAILY_2: "Block_Daily_2",
        BLOCKDAILYMIX: "Block_Mix",
        SINGLE: "Single",
        ROUND: "Round",
    },
    ContractRateStatus: {
        PendingForApproval: "Pending for approval",
        Approved: "Approved",
        Rejected: "Rejected",
    }
};