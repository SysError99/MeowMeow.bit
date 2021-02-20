const isAny = require('../fn.is.any')

/** 
 * Result object.
 * @param {{success: boolean, message: string, data:any}} d JSON
 */
const Result = function(d){
    /** This object */
    let self = this
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
            self.data = d.data

        if(typeof d.message === 'string')
            self.message = d.message

        if(typeof d.success === 'boolean')
            self.success = d.success
    }

    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return {
            data: self.data,
            message: self.message,
            success: self.success
        }
    }

    if(isAny(d))
        _import()
    
}

module.exports = Result