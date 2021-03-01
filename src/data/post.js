const Crypt = require('../fn.crypt')

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

    /** @type {string} Post owner public key*/
    owner = ''

    /** @type {string} Post signature from owner*/
    signature = Buffer.from([])

    /** @type {string[]} Account Tags*/
    tag = []

    /** @type {string} Text inside post*/
    text = ''

    /** @type {Date} Post date*/
    time = new Date()

    /** @type {boolean} If this post has a valid signature*/
    valid = false

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
            this.mediaType,
            this.mention,
            this.owner,
            this.signature,
            this.tag,
            this.text,
            this.time
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
            this.mediaType = d[1]

        if(Array.isArray(d[2]))
            this.mention = new PostPointer([2])

        if(typeof d[3] === 'string')
            this.owner = d[3]

        if(typeof d[4] === 'string')
            this.signature = d[4]

        if(Array.isArray(d[5]))
            this.tag = d[5]

        if(typeof d[6] === 'string')
            this.text = d[6]

        if(typeof d[7] === 'number')
            this.time = d[7]

        if(this.signature.length  > 0)
            this.valid = Try(() => Crypt.sign.verify(JSON.stringify([
                this.media,
                this.mediaType,
                this.mention,
                this.owner,
                this.tag,
                this.text,
                this.time
            ]), this.owner, this.signature))
    }
}

module.exports = Post