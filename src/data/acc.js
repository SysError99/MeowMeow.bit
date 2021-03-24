const {str} = require('../fn.json')

const SignKey = require('./key.sign')

/** Account object, used for storing account data */
const Acc = class {
    /** @type {boolean} This is account object*/
    isAcc = true

    /** @type {string} Account description*/
    description = ''

    /** @type {string[]} List of followers (account public key)*/
    follower = []

    /** @type {string[]} List of following users (account public key)*/
    following = []

    /** Account images */
    img = {
        /** @type {string} Cover image hash */
        cover: '',
        /** @type {string} Profile image hash */
        profile: ''
    }

    /** @type {SignKey} Signing key*/
    key

    /** @type {string} Account name*/
    name = ''

    /** @type {string} Number of posted posts*/
    posts = 0

    /** @type {boolean} If this is a public account, other users can post to this account*/
    public = false

    /** @type {string[]} Account tags (for searching)*/
    tag = []

    /** @type {string} Account signature*/
    signature = ''

    /**
     * Export account base
     * @returns {Array}
     */
    exportBase () {
        return [
            this.description,
            undefined,
            this.name,
            [
                this.img.cover,
                this.img.profile
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

    signData () {
        return str([
            this.description,
            this.name,
            this.img.cover,
            this.img.profile
        ])
    }

    sign () {
        this.signature = this.key.sign()
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
            this.key = new SignKey(d[1])
        else
            this.key = new SignKey()

        if(typeof d[2] === 'string')
            this.name = d[2]

        if(Array.isArray(d[3])){
            if(typeof d[3][0] === 'string')
                this.pic.cover = d[3][0]

            if(typeof d[3][1] === 'string')
                this.pic.profile = d[3][1]
        }

        if(typeof d[4] === 'number')
            this.posts = d[4]

        if(typeof d[5] === 'boolean')
            this.posts = d[5]

        if(Array.isArray(d[6]))
            this.tag = d[6]
    }
}

module.exports = Acc