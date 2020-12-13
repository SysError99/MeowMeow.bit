const Crypt = require('../crypt')
/**
 * Asymmetric key object.
 * @param {Object|string} data JSON or string for new key (passphrase)
 */
const AsymmetricKey = function(data){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'AsymmetricKey' object*/
    this.isAsymmetricKey = true
    /**
     * Decrypt base64 using private key
     * @param {string} str String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = function(str){
        return Crypt.private.decrypt(str, _this.private, _this.password)
    }
    /**
     * Encrypt using public key
     * @param {string} str String to be encrypted
     */
    this.encrypt = function(str){
        return Crypt.public.encrpyt(str, _this.public)
    }
    /** @type {string} Saved password*/
    this.password = ''
    /** @type {string} Private key*/
    this.private = ''
    /** @type {string} Public key*/
    this.public = ''
    /**
     * Generate a new key
     * @param {string} password Passphrase for this key
     */
    this.newKey = function(password){
        let newKey = Crypt.newKey.asymmetric(password)
        _this.password = password
        _this.private = newKey.privateKey
        _this.public = newKey.publicKey
    }
    /**
     * Import JSON
     * @param {Object} d JSON
     */
    this.import = function(d){
        if(typeof d !== 'object') return
        if(typeof d.password === 'string') _this.password = d.password
        if(typeof d.private === 'string') _this.private = d.private
        if(typeof d.public === 'string') _this.public = d.public
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = function(){
        return {
            password: _this.password,
            private: _this.private,
            public: _this.public
        }
    }
    if(typeof data === 'object') this.import(data)
    else if(typeof data === 'string') this.newKey(data)
    else this.newKey('')
}
module.exports = AsymmetricKey