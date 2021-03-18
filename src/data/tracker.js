const BaseN = require('../fn.base.n')
const Return = require('../fn.try.return')

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

    /** @type {Buffer} Public key for starting communication*/
    myPub = Buffer.from([])

    /** @type {boolean} List of connection status for each ports */
    connected = false

    /** @type {NodeJS.Timeout} Keep alive client polling timer */
    keepAlive

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
            d[2] = Return(() => Buffer.from(d[2], 'base64'), this.pub)
        else if(!Buffer.isBuffer(d[2]))
            return

        let ecdh = new ECDHKey()
        
        this.pub = d[2]
        this.key = ecdh.computeSecret(this.pub)
        this.myPub = ecdh.getPub()
    }
}

module.exports = Tracker