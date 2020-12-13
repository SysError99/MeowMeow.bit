/** 
 * Result object.
 * @param {{success: boolean, message: string}} data JSON
 */
const Result = function(data){
    /** This object */
    let _this = this
    /** @type {boolean} This is 'Result' object*/
    this.isResult = true
    /** @type {Object} Data received*/
    this.data = null
    /** @type {string} Result message*/
    this.message = ''
    /** @type {boolean} Is this result success?*/
    this.success = false
    /**
     * Import data to result.
     * @param {Object} d JSON
     */
    this.import = function(d){
        if(typeof d !== 'object') return
        if(typeof d.data === 'object') _this.data = d.data
        if(typeof d.message === 'string') _this.message = d.message
        if(typeof d.success === 'boolean') _this.success = d.success
    }
    /**
     * Export data to JSON object
     * @returns {Object} JSON
     */
    this.export = function(){
        return {
            data: _this.data,
            message: _this.message,
            success: _this.success
        }
    }
    if(typeof data === 'object') this.import(data)
}
module.exports = Result