const isAny = require('../fn.is.any')

/** Result object */
const Result = class {
    /** @type {boolean} This is 'Result' object*/
    isResult = true

    /** @type {Array} Data received*/
    data

    /** @type {string} Result message*/
    message = ''

    /** @type {boolean} Is this result success?*/
    success = false

    /**
     * Export data to JSON object
     */
    export () {
        return {
            data: this.data,
            message: this.message,
            success: this.success
        }
    }

    /**
     * Create result
     * @param {{success: boolean, message: string, data:any}} d Data to be set
     */
    constructor (d) {
        if(typeof d !== 'object')
            return

        if(d.data !== undefined)
            this.data = d.data

        if(typeof d.message === 'string')
            this.message = d.message

        if(typeof d.success === 'boolean')
            this.success = d.success
    }
}

module.exports = Result