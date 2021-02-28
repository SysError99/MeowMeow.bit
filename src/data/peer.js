const Datagram = require('dgram')
const FileSystem = require('fs')

const Try = require('../fn.try.catch')

const __ = require('../const')
const ECDHKey = require('./key.ecdh')
const SymmetricKey = require('./key.symmetric')

/** Peer Object, used for referencing peer */
const Peer = class {
    /** @type {boolean} This is 'Peer' object */
    isPeer = true

    /** @type {boolean} This is tracker*/
    isTracker = false

    /** @type {string} IP Address*/
    ip = ''

    /** @type {Date} Last accessed time*/
    lastAccess = new Date(0)

    /** @type {number} Peer connected port*/
    port = 8080

    /** @type {Buffer} Peer public key.*/
    pub = Buffer.from([])

    /** @type {NodeJS.Timeout} */
    keepAlive = null

    /** @type {Buffer} Randomly generated public key to be shared with another peer*/
    myPub = Buffer.from([])

    /** @type {boolean} Is this running behind NAT?*/
    nat = true

    /** @type {SymmetricKey} Peer Symmetric key*/
    key = null

    /** @type {boolean} Is the connection established?*/
    connected = false

    /** @type {number} Peer quality indicator*/
    quality = __.MAX_TRIAL

    /** @type {Datagram.Socket} Network socket*/
    socket = null

    /** @type {FileSystem.WriteStream} Currently writing stream*/
    mediaStream = null

    /** @type {function} Call this if peer is now ready to receive next bytes */
    mediaStreamReady = null

    /** @type {string} Location of media stream*/
    mediaStreamLocation = ''

    /** @type {string} Amount of bytes received */
    mediaStreamPacketsReceived = 0

    /**
     * Export to array
     * @returns {Array}
     */
    export () {
        return [
            this.ip,
            this.port,
            this.pub.toString('base64'),
            this.nat,
            this.lastAccess.toUTCString(),
        ]
    }

    /**
     * Create Peer
     * @param {Array} d Array to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'string')
            this.ip = d[0]

        if(typeof d[1] === 'number')
            this.port = d[1]

        Try(() => {
            if(typeof d[2] === 'string')
                d[2] = Buffer.from(d[2], 'base64')

            if(typeof d[3] === 'boolean')
                this.nat = d[3]

            if(typeof d[4] === 'string')
                this.lastAccess = Date.parse(d[4])

            if(!Buffer.isBuffer(d[2]))
                return

            let newECDH = new ECDHKey()
            this.key = newECDH.computeSecret(d[2])
            this.myPub = newECDH.getPub()
            this.pub = d[2]
        })
    }
}

module.exports = Peer