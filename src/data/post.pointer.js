/** Post pointer, used for referencing post position */
const PostPointer = class {
    /** This is a 'PostPointer' Object*/
    isPostPointer = true

    /** @type {number} Position of a post*/
    pos = -1

    /** @type {string} Account owner*/
    owner = ''

    /**
     * Export to array
     * @returns {Array}
     */
    export () {
        return [
            this.pos,
            this.owner
        ]
    }

    /**
     * Create Post Pointer
     * @param {Array} d Data to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'number')
            this.pos = d[0]

        if(typeof d[1] === 'string')
            this.owner = d[1]
    }
}

module.exports = PostPointer