const BaseN = require('../fn.base.n')
const Try = require('../fn.try.catch')

const __ = require('../const')
const ECDHKey = require('./key.ecdh')
const SymmetricKey = require('./key.symmetric')

const Tracker = class {
    /** @type {boolean} This is 'Tracker' object */
    isTracker = true

    /** @type {string} Tracker IP address*/
    ip = ''

    /** @type {string} Tracker port*/
    port = 12345

    /** @type {Buffer} Tracker public key*/
    pub = Buffer.from([])

    /** @type {SymmetricKey} Key for encryption*/
    key = Buffer.from([])

    /** @type {SymmetricKey[]} List of keys for encryption*/
    keys = []

    /** @type {Buffer} Public key for starting communication*/
    myPub = Buffer.from([])

    /** @type {Buffer[]} Public key for starting communication*/
    myPubs = []

    /** @type {boolean[]} List of connection status for each ports */
    connected = []

    /** @type {NodeJS.Timeout[]} Keep alive client polling timer */
    keepAlive = []

    /**
     * Generate tracker object
     * @param {Array} d Tracker public key
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'string')
            this.ip = d[0]

        if(typeof d[1] === 'number')
            this.port = d[1]

        if(typeof d[2] === 'string')
            this.pub = Try(() => Buffer.from(d[2], 'base64'), this.pub)
        else if(Buffer.isBuffer(d[2]))
            this.pub = d[2]

        for(let i = __.MAX_TRIAL - 1; i >= 0; i--){
            let ecdh = new ECDHKey()

            this.keys[i] = ecdh.computeSecret(this.pub)
            this.myPubs[i] = ecdh.getPub()
            this.connected[i] = false
        }

        this.key = this.keys[0]
        this.myPub = this.myPubs[0]
    }
}

module.exports = Tracker