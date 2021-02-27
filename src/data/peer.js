const Datagram = require('dgram')
const FileSystem = require('fs')

const Try = require('../fn.try.catch')

const __ = require('../const')
const ECDHKey = require('./key.ecdh')
const SymmetricKey = require('./key.symmetric')

/** 
 * Peer object
 * @param {Array} d Array object
 */
const Peer = function(d){
    /** @type {boolean} This is 'Peer' object*/
    this.isPeer = true

    /** @type {boolean} If this peer is a tracker*/
    this.isTracker = false

    /** @type {string} Peer IP address*/
    this.ip = ''

    /** @type {Date} Last accessed time*/
    this.lastAccess = new Date(0)

    /** @type {number} Peer connected port*/
    this.port = 8080

    /** @type {Buffer} Peer public key.*/
    this.pub = Buffer.from([])

    /** @type {NodeJS.Timeout} */
    this.keepAlive = null

    /** @type {Buffer} Randomly generated public key to be shared with another peer*/
    this.myPub = Buffer.from([])

    /** @type {boolean} Is this running behind NAT?*/
    this.nat = true

    /** @type {SymmetricKey} Peer Symmetric key*/
    this.key = null

    /** @type {boolean} Is the connection established?*/
    this.connected = false

    /** @type {number} Peer quality indicator*/
    this.quality = __.MAX_TRIAL

    /** @type {Datagram.Socket} Network socket*/
    this.socket = null

    /** @type {FileSystem.WriteStream} Currently writing stream*/
    this.mediaStream = null

    /** @type {function} Call this if peer is now ready to receive next bytes */
    this.mediaStreamReady = null

    /** @type {string} Location of media stream*/
    this.mediaStreamLocation = ''

    /** @type {string} Amount of bytes received */
    this.mediaStreamPacketsReceived = 0

    /**
     * Import JSON
     */
    let _import = () => {
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
            this.myPub = newECDH.get.pub()
            this.pub = d[2]
        })
    }

    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return [
            this.ip,
            this.port,
            this.pub.toString('base64'),
            this.nat,
            this.lastAccess.toUTCString(),
        ]
    }

    if(Array.isArray(d))
        _import()

}

module.exports = Peer