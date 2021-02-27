const BaseN = require('../fn.base.n')
const Crypt = require('../fn.crypt')
const Try = require('../fn.try.catch')

const PostLike = function(d){
    /** @type {boolean} This is 'PostLike' object*/
    this.isPostLike = true

    /** @type {string} Owner of this 'like' (base58 public key)*/
    this.owner = ''

    /** @type {number} Like issue date (in milliseconds)*/
    this.time = 0

    /** @type {string} Post owner*/
    this.acc = ''

    /** @type {number} Post position*/
    this.pos = -1

    /** @type {string} Signature of the owner*/
    this.signature = ''

    /** @type {boolean} If this object has a 'valid' signature*/
    this.valid = false

    /**
     * Import from array, and verify signature
     */
    let _import = () => {
        if(typeof d[0] === 'string') this.owner = d[0]
        if(typeof d[1] === 'number') this.time = d[1]
        if(typeof d[2] === 'number') this.acc = d[2]
        if(typeof d[3] === 'number') this.pos = d[3]
        if(typeof d[4] === 'string') this.signature = d[4]

        this.valid = Try(() => Crypt.sign.verify(Buffer.from(JSON.stringify( [d[1], d[2], d[3]] ), 'base64'), BaseN.decode(this.owner), Buffer.from(this.signature, 'base64')), false)
    }

    if(Array.isArray(d)) _import()
}

module.exports = PostLike