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
     * Export post without signature to array
     */
    exportPost () {
        return [
            this.owner,
            this.media,
            this.mediaType,
            this.mention,
            this.tag,
            this.text,
            this.time.getTime()
        ]
    }

    /**
     * Export post with signature to array
     */
    export () {
        let post = this.exportPost()
        post.push(this.signature)
        return post
    }

    /**
     * Sign a post using owner's private key
     * @param {string} privateKey Owner's private key
     * @param {string} password Owner's password (passphrase)
     */
    sign (privateKey, password) {
        this.signature = Crypt.sign.perform(JSON.stringify(this.exportPost()), privateKey, typeof password === 'string' ? password : '')
    }

    /**
     * Create Post object
     * @param {Array} d Array to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'string')
            this.owner = d[0]

        if(Array.isArray(d[1]))
            this.media = d[1]

        if(Array.isArray(d[2]))
            this.mediaType = d[2]

        if(Array.isArray(d[3]))
            this.mention = new PostPointer(d[3])

        if(Array.isArray(d[4]))
            this.tag = d[4]

        if(typeof d[5] === 'string')
            this.text = d[5]

        if(typeof d[6] === 'number')
            this.time = new Date(d[6])

        if(typeof d[7] === 'string')
            this.signature = d[7]

        if(this.signature.length  > 0)
            this.valid = Try(() => Crypt.sign.verify(JSON.stringify(this.exportPost()), this.owner, this.signature))
    }
}

module.exports = Post