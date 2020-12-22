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
    /** @type {Buffer} IV buffer*/
    this.iv = null
    /**
     * Encrypt a string
     * @param {string} str String to be encrpyted
     * @returns {string} Encrypted string
     */
    this.encrypt = function(str){
        return Crypt.symmetric.encrypt(str, _this.key, _this.iv)
    }
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = function(str){
        return Crypt.symmetric.decrypt(str, _this.key, _this.iv)
    }
    /**
     * Create a new key for this object
     */
    let _new = function(){
        let newKey = Crypt.newKey.symmetric()
        _this.key = newKey[0]
        _this.iv = newKey[1]
    }
    /**
     * Import JSON
     */
    let _import = function(){
        if(typeof d.key === 'string'){
            try{
                _this.key = Buffer.from(d.key, 'hex')
            }catch(e){
                console.error('E -> SymmetricKey.import: importing key: ' + e)
            }
        }
        if(typeof d.iv === 'string'){
            try{
                _this.iv = Buffer.from(d.iv, 'hex')
            }catch(e){
                console.error('E -> SymmetricKey.importing IV: ' + e)
            }
        }
    }
    /**
     * Export to JSON
     * @returns {Object} JSON object
     */
    this.export = function(){
        return {
            key: _this.key.toString('hex'),
            iv: _this.iv.toString('hex')
        }
    }
    if(typeof d === 'object') _import()
    else _new()
}
module.exports = SymmetricKey