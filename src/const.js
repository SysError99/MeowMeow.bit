/** List of constants */
const constants = {
    /**  Constants about key*/
    KEY: {
        LOCATION: 'key.server'
    },
    /** @type {number} Max amount of data accepted (default: 32 MB)*/
    MAX_PAYLOAD: 1048576 * 32,
    /** @type {number} Last access time (in millisecods, default: 1 day) */
    LAST_ACCESS_LIMIT: 1000 * 60 * 60 * 24,
    /** @type {boolean} If this is running in test mode */
    TEST: process.argv[2] === 'test' ? true : false
}
module.exports = constants