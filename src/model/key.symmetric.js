const isAny = require('../type.any.check')
const Crypt = require('../crypt')
/**
 * Symmetric key object
 * @param {Buffer|string} d Data to be imported
 */
const SymmetricKey = function(d){
    /** @type {boolean} This is 'SymmetricKey' object*/
    this.isSymmetricKey = true
    /** @type {Buffer} Key buffer*/
    let key = null
    /**
     * Encrypt a string
     * @param {string} str String to be encrpyted
     * @returns {string} Encrypted string
     */
    this.encrypt = function(str){
        return Crypt.symmetric.encrypt(str, key)
    }
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = function(str){
        return Crypt.symmetric.decrypt(str, key)
    }
    /**
     * Export to JSON
     * @returns {Object} JSON object
     */
    this.export = function(){
        return key.toString('base64')
    }
    if(typeof d === 'string'){
        try{
            key = Buffer.from(d, 'base64')
        }catch(e){
            console.error('E -> SymmetricKey.import: importing key: ' + e)
        }
    }
    else if(Buffer.isBuffer(d)) key = d
    else key = Crypt.newKey.symmetric()
}
module.exports = SymmetricKey