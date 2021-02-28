const PostPointer = require('./post.pointer')

/** Post object, contains post elements */
const Post = class {
    /** @type {boolean} This is 'Post' object*/
    isPost = true

    /** @type {string[]} List of media hashes*/
    media = []

    /** @type {string[]} Media type of each media */
    mediaType = []

    /** @type {PostPointer} Post mention*/
    mention = null

    /** @type {string} Post owner name*/
    owner = ''

    /** @type {string} Post signature from owner*/
    signature = Buffer.from([])

    /** @type {string[]} Account Tags*/
    tag = []

    /** @type {string} Text inside post*/
    text = ''

    /**
     * Other elements including:
     * - Media
     * - Likes
     * - Comments
     * - Shares
     * will be separeted as files.
     * 
     * For example:
     * ./<owner>.<post-number>.media.<n>.json
     * ./<owner>.<post-number>.like.<n>.json
     * ./<owner>.<post-number>.comment.<n>.json
     * ./<owner>.<post-number>.share.<n>.json
     * 
     * Comments, shares will use PostPointer() for linking to real post.
     * Media hashes will be included and signed, others are not.
     */

    /**
     * Export to array
     * @returns {Array}
     */
    export () {
        return [
            this.media,
            this.mention,
            this.owner,
            this.signature,
            this.tag,
            this.text
        ]
    }

    /**
     * Create Post object
     * @param {Array} d Array to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(Array.isArray(d[0]))
            this.media = d[0]

        if(Array.isArray(d[1]))
            this.mention = d[1]

        if(typeof d[2] === 'string')
            this.owner = d[2]

        if(typeof d[3] === 'string')
            this.signature = d[3]

        if(Array.isArray(d[4]))
            this.tag = d[4]

        if(typeof d[5] === 'string')
            this.text = d[5]
    }
}

module.exports = Post