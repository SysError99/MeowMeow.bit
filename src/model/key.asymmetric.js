const isAny = require('../type.any.check')
const Try = require('../try.catch')
const BaseN = require('../base.n')
const Crypt = require('../crypt')
/**
 * Asymmetric key object.
 * @param {Object|string} d JSON or string for new key (passphrase)
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
     * Import JSON
     */
    let _import = () => {
        if(typeof d.password === 'string') password = d.password
        if(typeof d.private === 'string') private = d.private
        if(typeof d.public === 'string') public = d.public
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return {
            password: password,
            private: private,
            public: public
        }
    }
    /**
     * Export only public key to JSON
     */
    this.exportPub = () => {
        return {
            public: public
        }
    }
    if(typeof d === 'string') _newKey(d)
    else if(isAny(d)) _import()
    else _newKey('')
}
module.exports = AsymmetricKey