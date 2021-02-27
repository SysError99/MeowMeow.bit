const isAny = require('../fn.is.any')

/** 
 * Result object.
 * @param {{success: boolean, message: string, data:any}} d JSON
 */
const Result = function(d){
    /** @type {boolean} This is 'Result' object*/
    this.isResult = true

    /** @type {Array} Data received*/
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
            this.data = d.data

        if(typeof d.message === 'string')
            this.message = d.message

        if(typeof d.success === 'boolean')
            this.success = d.success
    }

    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return {
            data: this.data,
            message: this.message,
            success: this.success
        }
    }

    if(isAny(d))
        _import()
    
}

module.exports = Result