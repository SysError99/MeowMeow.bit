const isAny = require('../fn.is.any')

/** 
 * Result object.
 * @param {{success: boolean, message: string, data:any}} d JSON
 */
const Result = function(d){
    /** This object */
    let _ = this
    /** @type {boolean} This is 'Result' object*/
    this.isResult = true

    /** @type {Object} Data received*/
    this.data = null

    /** @type {string} Result message*/
    this.message = ''

    /** @type {boolean} Is this result success?*/
    this.success = false

    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d.data !== 'undefined') 
            _.data = d.data

        if(typeof d.message === 'string')
            _.message = d.message

        if(typeof d.success === 'boolean')
            _.success = d.success
    }

    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return {
            data: _.data,
            message: _.message,
            success: _.success
        }
    }

    if(isAny(d))
        _import()
    
}

module.exports = Result