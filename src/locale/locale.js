/** Locale object */
const Locale = class {
    /** @type {boolean} This is a 'Locale' object*/
    isLocale = true
    
    /** @type {string} Currently used locale*/
    current = ''

    /** List of locale */
    str = {
        file: {
            readErr: '',
            writeErr: ''
        },
        json: {
            parseErr: '',
            stringifyErr: ''
        },
        paramInvalid: '',
        peer: {
            bad: '',
            pubErr: ''
        },
        server:{
            conErr: '',
            dataCorrupt: '',
            noPub: '',
            strEmpty: '',
            strTooLarge: '',
            timeOut: ''
        }
    }

    /**
     * Change locale with the function.
     * @param {function} fn Function to be executed
     */
    change (fn) {
        fn(this)
    }

    /**
     * Create Locale object
     * @param {function} f Function of locale changer.
     */
    constructor (f) {
        if (typeof f === 'function')
            this.change(f)
        else
            this.change(require('./en'))
    }
}

module.exports = Locale