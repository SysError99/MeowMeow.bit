const Try = require('../try.catch')
const BaseN = require('../base.n')
const Crypt = require('../crypt')
/**
 * Asymmetric key object.
 * @param {Array[]|string} d Array object or string for new key (passphrase)
 */
const AsymmetricKey = function(d){
    /** @type {boolean} This is 'AsymmetricKey' object*/
    this.isAsymmetricKey = true
    /** @type {string} Saved password*/
    let password = ''
    /** @type {string} Private key*/
    let private = ''
    /** @type {string} Public key*/
    let public = ''
    /**
     * Decrypt base64 using private key
     * @param {string} str String to be decrypted
     * @returns {string} Decrypted string
     */
    this.decrypt = str => {
        return Try(() => Crypt.private.decrypt(str, private, password))
    }
    /**
     * Encrypt using public key
     * @param {string} str String to be encrypted
     */
    this.encrypt = str => {
        return Try(() => Crypt.public.encrypt(str, public), '')
    }
    /** Key retrieving functions*/
    this.get = {
        /**
         * Get private key in Base58 form
         * @returns {string} Base58-encoded string
         */
        private: () => {
            return Try(() => BaseN.encode(Buffer.from(private, 'base64')), '')
        },
        /**
         * Get public key in Base58 form
         * @returns {string} Base58-encoded string
         */
        public: () => {
            return Try(() => BaseN.encode(Buffer.from(public, 'base64')), '')
        }
    }
    /**
     * Generate a new key
     * @param {string} password Passphrase for this key
     */
    let _newKey = password => {
        let newKey = Crypt.newKey.asymmetric(password)
        password = password
        private = newKey.privateKey
        public = newKey.publicKey
    }
    /**
     * Import array
     */
    let _import = () => {
        if(typeof d[0] === 'string') password = d[0]
        if(typeof d[1] === 'string') private = d[1]
        if(typeof d[2] === 'string') public = d[2]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        return [
            password,
            private,
            public
        ]
    }
    /**
     * Export only public key
     * @returns {string} A public key
     */
    this.exportPub = () => {
        return public
    }
    if(typeof d === 'string') _newKey(d)
    else if(Array.isArray(d)) _import()
    else _newKey('')
}
module.exports = AsymmetricKey