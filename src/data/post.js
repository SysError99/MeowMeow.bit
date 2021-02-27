const PostPointer = require('./post.pointer')
/**
 * Post object
 * @param {Array} d Array object
 */
const Post = function(d){
    /** @type {boolean} This is 'Post' object*/
    this.isPost = true

    /** @type {string[]} List of media hashes*/
    this.media = []

    /** @type {string[]} Media type of each media */
    this.mediaType = []

    /** @type {PostPointer} Post mention*/
    this.mention = null

    /** @type {string} Post owner name*/
    this.owner = ''

    /** @type {string} Post signature from owner*/
    this.signature = Buffer.from([])

    /** @type {string[]} Account Tags*/
    this.tag = []

    /** @type {string} Text inside post*/
    this.text = ''

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
     * Import d to object
     */
    let _import = () => {
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
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        return [
            this.media,
            this.mention,
            this.owner,
            this.signature,
            this.tag,
            this.text
        ]
    }

    if(Array.isArray(d))
        _import()
}

module.exports = Post