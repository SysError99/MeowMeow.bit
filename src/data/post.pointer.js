/** Post pointer, used for referencing post position */
const PostPointer = class {
    /** This is a 'PostPointer' Object*/
    isPostPointer = true

    /** @type {string} Account owner*/
    owner = ''

    /** @type {number} Position of a post*/
    pos = -1

    /**
     * Export to array
     * @returns {Array}
     */
    export () {
        return [
            this.owner,
            this.pos
        ]
    }

    /**
     * Create Post Pointer
     * @param {Array} d Data to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'string')
            this.owner = d[0]

        if(typeof d[1] === 'number')
            this.pos = d[1]
    }
}

module.exports = PostPointer