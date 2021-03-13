const Try = require('../fn.try.catch')

const __ = require('../const')
const ECDHKey = require('./key.ecdh')
const SymmetricKey = require('./key.symmetric')

/** Peer Object, used for referencing peer */
const Peer = class {
    /** @type {boolean} This is 'Peer' object */
    isPeer = true

    /** @type {string} IP Address*/
    ip = ''

    /** @type {number} Last accessed time*/
    lastAccess = 0

    /** @type {number} Peer connected port*/
    port = 8080

    /** @type {Buffer} Peer public key.*/
    pub = Buffer.from([])

    /** @type {boolean} Is this peer connected to us */
    isSender = false

    /** @type {boolean} Keep alive client polling timer? */
    keepAlive = false

    /** @type {Buffer} Randomly generated public key to be shared with another peer*/
    myPub = Buffer.from([])

    /** @type {boolean} Is this a public peer? (directly accessible)*/
    public = false

    /** @type {SymmetricKey} Peer Symmetric key*/
    key = null

    /** @type {function} Some of function to be put for special purposes */
    callback = null

    /** @type {number} Peer quality indicator*/
    quality = __.MAX_TRIAL

    /** @type {boolean} Is this peer currently writing a stream*/
    mediaStream = false

    /** @type {string} Location of media stream*/
    mediaStreamLocation = ''

    /** @type {string} Amount of bytes received */
    mediaStreamPacketsReceived = 0

    /** @type {function} Call this function if this peer is now ready to receive next bytes */
    mediaStreamCb = null

    /**
     * Check if this peer has a connection
     */
    connected () {
        return this.keepAlive
    }

    /**
     * Export to array
     * @returns {Array}
     */
    export () {
        return [
            this.ip,
            this.port,
            this.pub.toString('base64'),
            this.public,
            this.lastAccess,
        ]
    }

    /**
     * Set target's public key
     * @param {Buffer|string} pub Public key (Buffer or base62)
     */
    setPeerPub (pub) {
        if(typeof pub === 'string'){
            if(Try(() => pub = Buffer.from(pub, 'base64'), this.pub))
                return
        }

        if(!Buffer.isBuffer(pub))
            return

        let newECDH = new ECDHKey()

        this.key = newECDH.computeSecret(pub)
        this.myPub = newECDH.getPub()
        this.pub = pub
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

        this.setPeerPub(d[2])

        if(typeof d[3] === 'boolean')
            this.public = d[3]

        if(typeof d[4] === 'number')
            this.lastAccess = d[4]

    }
}

module.exports = Peer