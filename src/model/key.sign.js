const isAny = require('../type.any.check')
const Try = require('../try.catch')
const BaseN = require('../base.n')
const Crypt = require('../crypt')
/**
 * Sign key object.
 * @param {Object|string} d JSON or string for new key (passphrase)
 */
const SignKey = function(d){
    /** @type {boolean} This is 'SignKey' object*/
    this.isSignKey = true
    /** @type {string} Saved password*/
    let password = ''
    /** @type {string} Private key*/
    let private = ''
    /** @type {string} Public key*/
    let public = ''
    /**
     * Sign a key using private key
     * @param {string} str String to be signed
     * @returns {string} Base64-based signature
     */
    this.sign = str => {
        if(private.length === 0 || str.length === 0) return ''
        return Try(() => Crypt.sign.perform(str, private, password), '')
    }
    /**
     * Verify signature using public key
     * @param {string} str String to be verified
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    this.verify = (str, signature) => {
        if(public.length === 0 || str.length === 0) return false
        return Try(() => Crypt.sign.verify(str, public, signature), '')
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
        let newKey = Crypt.newKey.sign(password)
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
    if(isAny(d)) _import()
    else if(typeof d === 'string') _newKey(d)
    else _newKey('')
}
module.exports = SignKey