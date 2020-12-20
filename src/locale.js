/**
 * Locale object
 * @param {function} f Function of locale changer.
 */
const Locale = function(f){
    /** This object */
    let _this = this
    /**
     * Change locale with the function.
     * @param {function} fn 
     */
    this.change = function(fn){
        if(typeof fn === 'function') fn(_this)
    }
    /** List of locale */
    this.str = {
        json: {
            parseErr: '',
            stringifyErr: ''
        },
        paramInvalid: '',
        peer: {
            bad: ''
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
    if(typeof f === 'function') this.change(f)
    else this.change(require('./locale/en'))
}
module.exports = Locale