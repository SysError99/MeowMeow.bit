/**
 * Locale object
 * @param {function} f Function of locale changer.
 */
const Locale = function(f){
    /** This object */
    let self = this
    /** @type {boolean} This is a 'Locale' object*/
    this.isLocale = true
    
    /** @type {string} Currently used locale*/
    this.current = ''

    /**
     * Change locale with the function.
     * @param {function} fn 
     */
    this.change = fn => fn(self)

    /** List of locale */
    this.str = {
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

    if(typeof f === 'function')
        this.change(f)

    else
        this.change(require('./en'))
    
}

module.exports = Locale