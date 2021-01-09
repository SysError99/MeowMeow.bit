/**
 * Post Pointer object
 * @param {[string, string]} d JSON
 */
const PostPointer = function(d){
    /** This Object*/
    let _ = this
    /** This is a 'PostPointer' Object*/
    this.isPostPointer = true

    /** @type {number} Position of a post*/
    this.pos = -1

    /** @type {string} Public key*/
    this.pub = ''

    /** @type {string} Signature */
    this.signature = ''

    /**
     * Import from array
     */
    let _import = () => {
        if(typeof d[0] === 'number') _.pos = d[0]
        if(typeof d[1] === 'string') _.pub = d[1]
        if(typeof d[2] === 'string') _.signature = d[2] 
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        return [
            _.pos,
            _.pub,
            _.signature
        ]
    }
    if(Array.isArray(d)) _import()
}
module.exports = PostPointer