/**
 * Post Pointer object, to be used for posts, comments, and shares
 * @param {[string, string]} d JSON
 */
const PostPointer = function(d){
    /** This is a 'PostPointer' Object*/
    this.isPostPointer = true

    /** @type {number} Position of a post*/
    this.pos = -1

    /** @type {string} Account owner*/
    this.owner = ''

    /**
     * Import from array
     */
    let _import = () => {
        if(typeof d[0] === 'number')
            this.pos = d[0]

        if(typeof d[1] === 'string')
            this.owner = d[1]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        return [
            this.pos,
            this.owner
        ]
    }

    if(Array.isArray(d))
        _import()
}
module.exports = PostPointer