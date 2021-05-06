const Crypt = require('../fn.crypt')
const Return = require('../fn.try.return')
const {str} = require('../fn.json')

const PostPointer = require('./post.pointer')

/** Post object, contains post elements */
const Post = class {
    /** @type {boolean} This is 'Post' object*/
    isPost = true

    /** @type {number} Post number*/
    number = 0

    /** @type {string[]} List of media hashes*/
    media = []

    /** @type {string[]} Media type of each media */
    mediaType = []

    /** @type {PostPointer} Post mention*/
    mention

    /** @type {string} Post owner public key*/
    owner = ''

    /** @type {string} Post signature from owner*/
    signature = ''

    /** @type {string[]} Account Tags*/
    tag = []

    /** @type {string} Text inside post*/
    text = ''

    /** @type {number} Post time*/
    time = new Date().getTime()

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
    #exportPost () {
        return [
            this.number,
            this.owner,
            this.media,
            this.mediaType,
            typeof this.mention === 'object' ? this.mention.export() : undefined,
            this.tag,
            this.text,
            this.time
        ]
    }

    /**
     * Export post with signature to array
     */
    export () {
        let post = this.#exportPost()
        post.push(this.signature)
        return post
    }

    /**
     * Sign a post using owner's private key
     * @param {string} privateKey Owner's private key
     * @param {string} password Owner's password (passphrase)
     */
    sign (privateKey, password) {
        this.signature = Crypt.sign.perform(str(this.#exportPost()), privateKey, typeof password === 'string' ? password : '')
    }

    /**
     * Create Post object
     * @param {Array} d Array to be imported
     */
    constructor (d) {
        if (!Array.isArray(d))
            return

        if (typeof d[0] === 'number')
            this.number = d[0]

        if (typeof d[1] === 'string')
            this.owner = d[1]

        if (Array.isArray(d[2]))
            this.media = d[2]

        if (Array.isArray(d[3]))
            this.mediaType = d[3]

        if (Array.isArray(d[4]))
            this.mention = new PostPointer(d[4])

        if (Array.isArray(d[5]))
            this.tag = d[5]

        if (typeof d[6] === 'string')
            this.text = d[6]

        if (typeof d[7] === 'number')
            this.time = d[7]

        if (typeof d[8] === 'string')
            this.signature = d[8]

        if (this.signature.length  > 0)
            this.valid = Return(() => Crypt.sign.verify(str(this.#exportPost()), this.owner.split('').reverse().join(''), this.signature))
    }
}

module.exports = Post