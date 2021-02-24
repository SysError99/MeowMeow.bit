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
    /** This object */
    let self = this
    /** @type {boolean} This is 'Peer' object*/
    this.isPeer = true

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

    /** @type {boolean} If peer is now ready to receive next bytes */
    this.mediaStreamReady = false

    /** @type {string} Location of media stream*/
    this.mediaStreamLocation = ''

    /** @type {string} Amount of bytes received */
    this.mediaStreamBytesReceived = 0

    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d[0] === 'string')
            self.ip = d[0]

        if(typeof d[1] === 'number')
            self.port = d[1]

        Try(() => {
            if(typeof d[2] === 'string')
                d[2] = Buffer.from(d[2], 'base64')

            if(typeof d[3] === 'boolean')
                self.nat = d[3]

            if(typeof d[4] === 'string')
                self.lastAccess = Date.parse(d[4])

            if(!Buffer.isBuffer(d[2]))
                return

            let newECDH = new ECDHKey()
            self.key = newECDH.computeSecret(d[2])
            self.myPub = newECDH.get.pub()
            self.pub = d[2]
        })
    }

    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return [
            self.ip,
            self.port,
            self.pub.toString('base64'),
            self.nat,
            self.lastAccess.toUTCString(),
        ]
    }

    if(Array.isArray(d))
        _import()

}

module.exports = Peer