const Peer = require('./peer')
const PostPointer = require('./post.pointer')
/**
 * Post object
 * @param {Array} d Array object
 */
const Post = function(d){
    /** This object*/
    let _ = this
    /** @type {boolean} This is 'Post' object*/
    this.isPost = true

    /** @type {PostPointer[]} Post comments*/
    this.comment = []

    /** Like manager*/
    this.like = {
        /** @type {number} Amount of likes received*/
        amount: 0,
        /** @type {string} Signed signature by a tracker*/
        signature: '',
        /** @type {Peer} Tracker who verifies this*/
        verifier: null,
    }

    /** @type {string[]} Base64-based media files*/
    this.media = []

    /** @type {PostPointer[]} Post mention*/
    this.mention = null

    /** @type {string} Post owner (identified with a public key)*/
    this.owner = ''

    /** @type {string} Post signature from owner*/
    this.signature = ''

    /** @type {string[]} Account Tags*/
    this.tag = []

    /** @type {string} Text inside post*/
    this.text = ''

    /**
     * Import d to object
     */
    let _import = () => {
        if(Array.isArray(d[0])){
            d[0].forEach(el => {
                if(Array.isArray(el)) _.comment.push(new PostPointer(el))
            })
        }
        if(Array.isArray(d[1])){
            if(typeof d[1][0] === 'number') _.like.amount = d[1][0]
            if(typeof d[1][1] === 'string') _.like.signature = d[1][1]
            if(Array.isArray(d[1][2])) _.like.verifier = new Peer(d[1][2])
        }
        if(Array.isArray(d[2])) _.media = d[2]
        if(Array.isArray(d[3])) _.mention = d[3]
        if(typeof d[4] === 'string') _.owner = d[4]
        if(typeof d[5] === 'string') _.signature = d[5]
        if(Array.isArray(d[6])) _.tag = d[6]
        if(typeof d[7] === 'string') _.tag = d[7]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        /** @type {PostPointer[]}*/
        let comments = []
        _.comment.forEach(el => {
            comments.push(el.export())
        })
        return [
            comments,
            [
                _.like.amount,
                _.like.signature,
                _.like.verifier.export()
            ],
            _.media,
            _.owner,
            _.tag,
            _.text
        ]
    }
    if(Array.isArray(d)) _import()
}
module.exports = Post