const Crypt = require('../fn.crypt')
const Return = require('../fn.try.return')

/** Post Like Objectm, used for referencing someone who likes a post */
const PostLike = class {
    /** @type {boolean} This is 'PostLike' object*/
    isPostLike = true

    /** @type {string} Owner of this 'like' (base58 public key)*/
    owner = ''

    /** @type {number} Like issue date (in milliseconds)*/
    time = 0

    /** @type {string} Post owner*/
    acc = ''

    /** @type {number} Post position*/
    pos = -1

    /** @type {string} Signature of the owner*/
    signature = ''

    /** @type {boolean} If this object has a 'valid' signature*/
    valid = false

    /**
     * Export without signature
     */
    exportPostLike () {
        return [
            this.owner,
            this.time,
            this.acc,
            this.pos
        ]
    }

    /**
     * Export to array, with signature
     */
    export () {
        let postLike = this.exportPostLike()
        postLike.push(this.signature)
        return postLike
    }

    /**
     * Sign this using private key
     */
    sign (privateKey, password) {
        this.signature = Crypt.sign.perform(JSON.stringify(this.exportPostLike()), privateKey, typeof password === 'string' ? password : '')
    }

    /**
     * Create Post Like object and verify
     * @param {Array} d Array to be verified
     */
    constructor (d) {
        if(!Array.isArray(d))
            return

        if(typeof d[0] === 'string') this.owner = d[0]
        if(typeof d[1] === 'number') this.time = d[1]
        if(typeof d[2] === 'number') this.acc = d[2]
        if(typeof d[3] === 'number') this.pos = d[3]
        if(typeof d[4] === 'string') this.signature = d[4]

        this.valid = Return(() => Crypt.sign.verify(JSON.stringify(this.exportPostLike()), this.owner, this.signature), false)
    }
}

module.exports = PostLike