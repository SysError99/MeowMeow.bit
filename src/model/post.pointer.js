/**
 * Post Pointer object
 * @param {[string, string]} d JSON
 */
const PostPointer = function(d){
    /** This Object*/
    let _this = this
    /** This is a 'PostPointer' Object*/
    this.isPostPointer = true

    /** @type {number} Position of a post*/
    this.pos = -1

    /** @type {string} Public key*/
    this.pub = ''

    /** @type {string} Signature */
    this.signature = ''

    /**
     * Import from JSON.
     */
    let _import = function(){
        if(d.length !== 2) return
        if(typeof d[0] === 'number') _this.pos = d[0]
        if(typeof d[1] === 'string') _this.pub = d[1]
        if(typeof d[2] === 'string') _this.signature = d[2] 
    }
    /**
     * Export to JSON
     */
    this.export = function(){
        return [_this.pos, _this.pub, _this.signature]
    }
    if(Array.isArray(d)) _import()
}
module.exports = PostPointer