const isAny = require('../type.any.check')
const Crypt = require('../crypt')
/**
 * Symmetric key object
 * @param {string|Object} d JSON or string
 */
const SymmetricKey = function(d){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'SymmetricKey' object*/
    this.isSymmetricKey = true
    /** @type {Buffer} Key buffer*/
    this.key = null
    /**
     * Encrypt a string
     * @param {string} str String to be encrpyted
     * @returns {string} Encrypted string
     */
    this.encrypt = function(str){
        return Crypt.symmetric.encrypt(str, _this.key)
    }
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = function(str){
        return Crypt.symmetric.decrypt(str, _this.key)
    }
    /**
     * Create a new key for this object
     */
    let _new = function(){
        _this.key = Crypt.newKey.symmetric()
    }
    /**
     * Import JSON
     */
    let _import = function(){
        if(typeof d.key === 'string'){
            try{
                _this.key = Buffer.from(d.key, 'base64')
            }catch(e){
                console.error('E -> SymmetricKey.import: importing key: ' + e)
            }
        }
    }
    /**
     * Export to JSON
     * @returns {Object} JSON object
     */
    this.export = function(){
        return {
            key: _this.key.toString('base64')
        }
    }
    if(isAny(d)) _import()
    else _new()
}
module.exports = SymmetricKey