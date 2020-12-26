const Crypt = require('../crypt')
/**
 * Asymmetric key object.
 * @param {Object|string} d JSON or string for new key (passphrase)
 */
const AsymmetricKey = function(d){
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
        if(_this.private === '') return ''
        return Crypt.private.decrypt(str, _this.private, _this.password)
    }
    /**
     * Encrypt using public key
     * @param {string} str String to be encrypted
     */
    this.encrypt = function(str){
        if(_this.public === '') return ''
        return Crypt.public.encrypt(str, _this.public)
    }
    /**
     * Sign a key using private key
     * @param {string} str String to be signed
     * @returns {string} Base64-based signature
     */
    this.sign = function(str){
        if(_this.private === '') return ''
        return Crypt.private.sign(str, _this.private, _this.password)
    }
    /**
     * Verify signature using public key
     * @param {string} str String to be verified
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    this.verify = function(str, signature){
        if(_this.public === '') return false
        return Crypt.public.verify(str, _this.public, signature)
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
    let _newKey = function(password){
        let newKey = Crypt.newKey.asymmetric(password)
        _this.password = password
        _this.private = newKey.privateKey
        _this.public = newKey.publicKey
    }
    /**
     * Import JSON
     */
    let _import = function(){
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
    /**
     * Export only public key to JSON
     */
    this.exportPub = function(){
        return {
            public: _this.public
        }
    }
    if(typeof d === 'object') _import()
    else if(typeof d === 'string') _newKey(d)
    else _newKey('')
}
module.exports = AsymmetricKey