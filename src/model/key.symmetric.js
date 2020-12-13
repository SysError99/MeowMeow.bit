const Crypt = require('../crypt')
/**
 * Symmetric key object
 * @param {string|Object} data JSON or string
 */
const SymmetricKey = function(data){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'SymmetricKey' object*/
    this.isSymmetricKey = true
    /** @type {Buffer} Key buffer*/
    this.key = null
    /** @type {Buffer} IV buffer*/
    this.iv = null
    /**
     * Create a new key for this object
     */
    this.new = function(){
        let newKey = Crypt.newKey.symmetric()
        _this.key = newKey[0]
        _this.iv = newKey[1]
    }
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
     * Import JSON
     * @param {string|Object} d JSON or string
     */
    this.import = function(d){
        if(typeof d === 'string'){
            let keyArr = d.split(',')
            if(keyArr.length === 2){
                _this.iv = Buffer.from(keyArr[0], 'base64')
                _this.key = Buffer.from(keyArr[1], 'base64')
            }
            return
        }
        else if(typeof d !== 'object') return
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
    if(typeof data === 'object')
        this.import(data)
    else
        this.new()
}
module.exports = SymmetricKey