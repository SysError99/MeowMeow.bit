const Try = require('../try.catch')
const Crypt = require('../crypt')
/**
 * Symmetric key object
 * @param {Buffer|string} d Data to be imported
 */
const SymmetricKey = function(d){
    /** @type {boolean} This is 'SymmetricKey' object*/
    this.isSymmetricKey = true
    /** @type {Buffer} Key buffer*/
    let key
    /**
     * Encrypt a string
     * @param {string} str String to be encrpyted
     * @returns {Buffer} Encrypted string
     */
    this.encrypt = str => {
        if(str.length === 0) return Buffer.from([])
        return Try(() => Crypt.symmetric.encrypt(str, key), '')
    }
    /**
     * Decrypt a string
     * @param {Buffer} buf String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = buf => {
        if(buf.length === 0) return ''
        return Try(() => Crypt.symmetric.decrypt(buf, key), '')
    }
    /**
     * Export to string
     * @returns {string} Secret key
     */
    this.export = () => {
        return key.toString('base64')
    }
    if(typeof d === 'string') Try(() => key = Buffer.from(d, 'base64'))
    else if(Buffer.isBuffer(d)) key = d
    else key = Crypt.newKey.symmetric()
}
module.exports = SymmetricKey