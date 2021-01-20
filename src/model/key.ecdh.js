const Try = require('../try.catch')
const Crypto = require('crypto')
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
         * Get private key
         * @returns {Buffer} Public key
         */
        prv: () => {
            return Try(() => ecdh.getPrivateKey(), Buffer.from([]))
        },
        /**
         * Get public key
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