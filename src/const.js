/** List of constants */
const constants = {
    EOF: String.fromCharCode(5),

    /** @type {string[]} List of errors that will be ingored by Try() & Return() */
    TRY_CATCH_IGNORE: [
        'JSON',
        'Bad Peer'
    ],

    /**  Constants about key*/
    KEY: {
        LOCATION: 'key.server'
    },

    // Media stream constants
    MEDIA_STREAM_NOT_READY: 20086183,
    MEDIA_STREAM_INFO_INVALID: 14687342,
    MEDIA_STREAM_POST_NOT_FOUND: 24912184,
    MEDIA_STREAM_NO_MEDIA: 5223412,
    MEDIA_STREAM_MEDIA_FOUND: 32492739,
    MEDIA_STREAM_FILE_NOT_FOUND: 13654442,
    MEDIA_STREAM_FILE_NOT_READY: 74314524,
    MEDIA_STREAM_FILE_TOO_LARGE: 92734017,
    MEDIA_STREAM_READY: 30442227,
    MEDIA_STREAM_PEER_ERR: 95160016,
    MEDIA_STREAM_TIME_OUT: 23070317,
    MEDIA_STREAM_DECLINED: 74723146,
    MEDIA_STREAM_ACCEPTED: 67349007,
    MEDIA_STREAM_ACK: 1,

    /** @type {number} Access cooldown (in milliseconds, default: 1 second)*/
    ACCESS_COOLDOWN: 1000,

    /** @type {number} Max number of broadcasting to other peers */
    BROADCAST_AMOUNT: 3,

    /** @type {number} Max amount of data accepted (default: 32 MiB)*/
    MAX_PAYLOAD: 1048576 * 32,

    /** @type {number} Max amount of trial times (n - 1) times */
    MAX_TRIAL: 10 - 1,

    /** @type {number} Max size of UDP packet in bytes*/
    MTU: 1408,

    /** @type {number} Last access time (in millisecods, default: 1 day) */
    LAST_ACCESS_LIMIT: 1000 * 60 * 60 * 24,

    /** @type {boolean} If this is running in test mode */
    TEST: process.argv[2] === 'test' ? true : false
}
module.exports = constants