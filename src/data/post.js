const PostPointer = require('./post.pointer')
/**
 * Post object
 * @param {Array} d Array object
 */
const Post = function(d){
    /** This object*/
    let self = this
    /** @type {boolean} This is 'Post' object*/
    this.isPost = true

    /** @type {string[]} List of media hashes*/
    this.media = []

    /** @type {string[]} Media type of each media */
    this.mediaType = []

    /** @type {PostPointer[]} Post mention*/
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
     * Media hashes will be included and signed, others are not.
     */

    /**
     * Import d to object
     */
    let _import = () => {
        if(Array.isArray(d[0]))
            self.media = d[0]

        if(Array.isArray(d[1]))
            self.mention = d[1]

        if(typeof d[2] === 'string')
            self.owner = d[2]

        if(typeof d[3] === 'string')
            self.signature = d[3]

        if(Array.isArray(d[4]))
            self.tag = d[4]

        if(typeof d[5] === 'string')
            self.text = d[5]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        return [
            self.media,
            self.mention,
            self.owner,
            self.signature,
            self.tag,
            self.text
        ]
    }

    if(Array.isArray(d))
        _import()
}

module.exports = Post