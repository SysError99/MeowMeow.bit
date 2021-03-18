const Crypto = require('crypto')

const Return = require('../fn.try.return')
const Crypt = require('../fn.crypt')

const SymmetricKey = require('./key.symmetric')

/** ECDH key object, used for exchanging secret key */
const ECDHKey = class {
    /** @type {boolean} This is 'ECDH Key'*/
    isECDHKey = true

    /** @type {Crypto.ECDH} ECDH key object*/
    ecdh

    /**
     * Compute a secret key
     * @param {Buffer} pub Public key
     * @returns {SymmetricKey} Symmetric key
     */
    computeSecret (pub) {
        return Return(() => new SymmetricKey(Crypt.ecdh.computeSecret(this.ecdh, Crypt.sect571k1.long(pub))))
    }

    /**
     * Get private key
     * @returns {Buffer} Public key
     */
    getPrv () {
        return Return(() => this.ecdh.getPrivateKey(), Buffer.from([]))
    }

     /**
     * Get public key
     * @returns {Buffer} Public key
     */
    getPub () {
        return Return(() => Crypt.sect571k1.short(this.ecdh.getPublicKey()), Buffer.from([]))
    }

    /**
     * Export key
     * @returns {string} Private key
     */
    export () {
        return Return(() => this.ecdh.getPrivateKey().toString('base64'), Buffer.from([]))
    }

    /**
     * Generate ECDH key object
     * @param {Array} d 
     */
    constructor (d) {
        this.ecdh = Return(() => Crypt.newKey.ecdh(d))
    }
}

module.exports = ECDHKey