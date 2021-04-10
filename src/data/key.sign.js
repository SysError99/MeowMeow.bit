const Return = require('../fn.try.return')

const Crypt = require('../fn.crypt')

/** Signing Key, used for signing strings */
const SignKey = class {
    /** @type {boolean} This is 'SignKey' object*/
    isSignKey = true

    /** @type {string} Key password */
    password = ''

    /** @type {string} Privatte key */
    private = ''

    /** @type {string} Public key*/
    public = ''

    /**
     * Sign a string
     * @param {string} str String to be signed
     * @returns {string} Base64-based signature
     */
    sign (str) {
        if (this.private.length === 0 || str.length === 0)
            return ''
        return Return(() => Crypt.sign.perform(str, this.private, this.password), '')
    }

    /**
     * Verify signature
     * @param {string} str String to be verified
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    verify (str, signature) {
        if (this.public.length === 0 || str.length === 0)
            return false
        return Return(() => Crypt.sign.verify(str, this.public.split('').reverse().join(''), signature), '')
    }

    /**
     * Export to array
     * @returns {Array} Array object
     */
    export () {
        return [this.password, this.private, this.public]
    }

    /**
     * Export only public key
     * @returns {string} A public key
     */
    exportPub () {
        return ['', '', this.public]
    }

    /**
     * Create sign key
     * @param {Array|string} d Use string to create a new key with password, use array to load saved key
     */
    constructor (d) {
        if (Array.isArray(d)) {
            if (typeof d[0] === 'string')
                this.password = d[0]

            if (typeof d[1] === 'string')
                this.exportprivate = d[1]

            if (typeof d[2] === 'string')
                this.public = d[2]
        } else {
            let password = typeof d === 'string' ? d : ''
            let newKey = Crypt.newKey.sign(password)

            this.password = password
            this.private = newKey.privateKey
            this.public = newKey.publicKey.split('').reverse().join('')
            return
        }
    }
}

module.exports = SignKey