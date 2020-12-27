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

    /**
     * Import from JSON.
     */
    let _import = function(){
        if(d.length !== 2) return
        if(typeof d[0] === 'number') _this.pos = d.pos
        if(typeof d[1] === 'number') _this.pub = d.pub
    }
    /**
     * Export to JSON
     */
    this.export = function(){
        return [_this.pos, _this.pub]
    }
    if(Array.isArray(d)) _import()
}
module.exports = PostPointer