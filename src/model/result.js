/** 
 * Result object.
 * @param {{success: boolean, message: string, data:any}} d JSON
 */
const Result = function(d){
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
     * Import JSON
     */
    let _import = function(){
        if(typeof d !== 'object') return
        if(typeof d.data !== 'undefined') _this.data = d.data
        if(typeof d.message === 'string') _this.message = d.message
        if(typeof d.success === 'boolean') _this.success = d.success
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = function(){
        return {
            data: _this.data,
            message: _this.message,
            success: _this.success
        }
    }
    if(typeof d === 'object') _import()
}
module.exports = Result