const Try = require('../try.catch')

const Crypt = require('../fn.crypt')

/**
 * Sign key object.
 * @param {Array|string} d Array object or string for new key (passphrase)
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
     * Import array object
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

    if(Array.isArray(d)) _import()
    else if(typeof d === 'string') _newKey(d)
    else _newKey('')

}

module.exports = SignKey