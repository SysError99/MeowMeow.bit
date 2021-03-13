const Try = require('../fn.try.catch')
const Crypt = require('../fn.crypt')

/** Symmetric key object, used for encrypting messages */
const SymmetricKey = class {
    /** @type {boolean} This is 'SymmetricKey' object*/
    isSymmetricKey = true

    /** @type {Buffer} Key buffer*/
    key = null

    /**
     * Encrypt a string
     * @param {string} str String to be encrpyted
     * @returns {Buffer} Encrypted string
     */
    encrypt (str) {
        if(str.length === 0)
            return Buffer.from([])
        return Try(() => Crypt.symmetric.encrypt(str, this.key), '')
    }

    /**
     * Decrypt a buffer
     * @param {Buffer} buf String to be decrypted
     * @returns {Buffer} Decrypted string
     */
    decrypt (buf) {
        if(buf.length === 0)
            return ''
        return Try(() => Crypt.symmetric.decrypt(buf, this.key), '')
    }

    /**
     * Decrypt a buffer to string
     * @param {Buffer} buf Buffer to be decrypted
     */
    decryptToString (buf) {
        return this.decrypt(buf).toString('utf-8')
    }

    /**
     * Export to string
     * @returns {string} Secret key
     */
    export () {
        return this.key.toString('base64')
    }

    /**
     * Generate Symmetric Key
    * @param {Buffer|string} d Data to be imported
    */
    constructor (d) {
        if(typeof d === 'string')
            Try(() => this.key = Buffer.from(d, 'base64'))
        else if(Buffer.isBuffer(d))
            this.key = d
        else
            this.key = Crypt.newKey.symmetric()
    }
}

module.exports = SymmetricKey