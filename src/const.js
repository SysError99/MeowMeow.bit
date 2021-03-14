/** List of constants */
const constants = {
    EOF: String.fromCharCode(5),

    /**  Constants about key*/
    KEY: {
        LOCATION: 'key.server'
    },

    /** @type {number} Access cooldown (in milliseconds, default: 1 second)*/
    ACCESS_COOLDOWN: 1000,

    /** @type {number} Max number of broadcasting to other peers */
    BROADCAST_AMOUNT: 3,

    /** @type {number} Max amount of data accepted (default: 32 MiB)*/
    MAX_PAYLOAD: 1048576 * 32,

    /** @type {number} Max amount of trial times (n - 1) times */
    MAX_TRIAL: 10 - 1,

    /** @type {number} Max size of UDP packet in bytes*/
    MTU: 1460,

    /** @type {number} Last access time (in millisecods, default: 1 day) */
    LAST_ACCESS_LIMIT: 1000 * 60 * 60 * 24,

    /** @type {boolean} If this is running in test mode */
    TEST: process.argv[2] === 'test' ? true : false
}
module.exports = constants