const Try = require('../try.catch')
const Crypto = require('crypto')
const BaseN = require('../base.n')
const Crypt = require('../crypt')
const SymmetricKey = require('./key.symmetric')
/**
 * ECDH key object
 * @param {Buffer|string} d String to be used as private key
 */
const ECDHKey = function(d){
    /** @type {boolean} This is 'ECDH Key'*/
    this.isECDHKey = true
    /** @type {Crypto.ECDH} ECDH key object*/
    let ecdh = Try(() => Crypt.newKey.ecdh(d), Crypt.newKey.ecdh())
    /**
     * Compute a secret key
     * @param {Buffer|string} pub Public key
     * @returns {SymmetricKey} Symmetric key
     */
    this.computeSecret = pub => {
        return Try(() => new SymmetricKey(Crypt.ecdh.computeSecret(ecdh, pub)))
    }
    this.get = {
        /**
         * Get public key
         * @returns {string} Public key
         */
        prv: () => {
            return Try(() => BaseN.encode(ecdh.getPrivateKey(), '62'))
        },
        /**
         * Get public key as Base62
         * @returns {string} Public key
         */
        pub: () => {
            return Try(() => BaseN.encode(ecdh.getPublicKey(), '62'))
        }
    }
    this.raw = {
        /**
         * Get public key, as buffer
         * @returns {Buffer} Public key
         */
        prv: () => {
            return Try(ecdh.getPrivateKey(), Buffer.from([]))
        },
        /**
         * Get public key, as buffer
         * @returns {Buffer} Public key
         */
        pub: () => {
            return Try(() => ecdh.getPublicKey(), Buffer.from([]))
        }
    }
    /**
     * Export key
     * @returns {string} Private key
     */
    this.export = () => {
        return Try(() => ecdh.getPrivateKey().toString('base64'))
    }
}
module.exports = ECDHKey