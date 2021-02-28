const Crypto = require('crypto')

const Try = require('../fn.try.catch')
const Crypt = require('../fn.crypt')

const SymmetricKey = require('./key.symmetric')

/** ECDH key object, used for exchanging secret key */
const ECDHKey = class {
    /** @type {boolean} This is 'ECDH Key'*/
    isECDHKey = true

    /** @type {Crypto.ECDH} ECDH key object*/
    ecdh = null

    /**
     * Compute a secret key
     * @param {Buffer} pub Public key
     * @returns {SymmetricKey} Symmetric key
     */
    computeSecret (pub) {
        return Try(() => new SymmetricKey(Crypt.ecdh.computeSecret(this.ecdh, Crypt.sect571k1.long(pub))), null)
    }

    /**
     * Get private key
     * @returns {Buffer} Public key
     */
    getPrv () {
        return Try(() => this.ecdh.getPrivateKey(), Buffer.from([]))
    }

     /**
     * Get public key
     * @returns {Buffer} Public key
     */
    getPub () {
        return Try(() => Crypt.sect571k1.short(this.ecdh.getPublicKey()), Buffer.from([]))
    }

    /**
     * Export key
     * @returns {string} Private key
     */
    export () {
        return Try(() => this.ecdh.getPrivateKey().toString('base64'), Buffer.from([]))
    }

    /**
     * Generate ECDH key object
     * @param {Array} d 
     */
    constructor (d) {
        this.ecdh = Try(() => Crypt.newKey.ecdh(d), null)
    }
}

module.exports = ECDHKey