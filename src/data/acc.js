const SignKey = require('./key.sign')

/** Account object, used for storing account data */
const Acc = class {
    /** @type {boolean} This is account object*/
    isAcc = true

    /** @type {string} Account description*/
    description = ''

    /** @type {string[]} List of followers (account public key)*/
    follower = []

    /** Account images */
    img = {
        /** @type {string} Cover image */
        cover: '',
        /** @type {string} Profile image */
        profile: ''
    }

    /** @type {SignKey} Signing key*/
    key = null

    /** @type {string} Account name*/
    name = ''

    /** @type {string} Number of posted posts*/
    posts = 0

    /** @type {boolean} If this is a public account, other users can post to this account*/
    public = false

    /** @type {string[]} Account tags (for searching)*/
    tag = []

    /**
     * Export account base
     * @returns {Array}
     */
    exportBase () {
        return [
            this.description,
            this.follower,
            null,
            this.name,
            [
                this.pic.cover,
                this.pic.profile
            ],
            this.posts,
            this.public,
            this.tag
        ]
    }

    /**
     * Export to array, for sharing with others
     * @returns {Array}
     */
    exportPub () {
        let e = this.exportBase()
        e[2] = this.key.exportPub()
        return e
    }

    /**
     * Export whole account to array
     * @returns {Array}
     */
    export () {
        let e = this.exportBase()
        e[2] = this.key.export()
        return e
    }

    /**
     * Generate basic information on this account
     */
    new () {
        this.key = new SignKey()
    }

    /**
     * Create account object
     * @param {Array} d Array to be imported
     */
    constructor (d) {
        if(!Array.isArray(d))
            return this.new()

        if(typeof d[0] === 'string')
            this.description = d[0]

        if(Array.isArray(d[1]))
            this.follower = d[1]

        if(Array.isArray(d[2]))
            this.key = new SignKey(d[2])
        else
            this.key = new SignKey()

        if(typeof d[3] === 'string')
            this.name = d[3]

        if(Array.isArray(d[4])){
            if(typeof d[4][0] === 'string')
                this.pic.cover = d[4][0]

            if(typeof d[4][1] === 'string')
                this.pic.profile = d[4][1]
        }

        if(typeof d[5] === 'number')
            this.posts = d[5]

        if(typeof d[6] === 'boolean')
            this.posts = d[6]

        if(Array.isArray(d[7]))
            this.tag = d[7]
    }
}

module.exports = Acc