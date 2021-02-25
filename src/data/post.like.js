const BaseN = require('../fn.base.n')
const Crypt = require('../fn.crypt')
const Try = require('../fn.try.catch')

const PostLike = function(d){
    /** This object */
    let self = this
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
        if(typeof d[0] === 'string') self.owner = d[0]
        if(typeof d[1] === 'number') self.time = d[1]
        if(typeof d[2] === 'number') self.acc = d[2]
        if(typeof d[3] === 'number') self.pos = d[3]
        if(typeof d[4] === 'string') self.signature = d[4]

        self.valid = Try(() => Crypt.sign.verify(Buffer.from(JSON.stringify( [d[1], d[2], d[3]] ), 'base64'), BaseN.decode(self.owner), Buffer.from(self.signature, 'base64')), false)
    }

    if(Array.isArray(d)) _import()
}

module.exports = PostLike