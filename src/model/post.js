const isAny = require('../type.any.check')
const Peer = require('./peer')
const PostPointer = require('./post.pointer')
/**
 * Post object
 * @param {Object} d JSON
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
        if(Array.isArray(d.comment)){
            d.comment.forEach(el => {
                if(Array.isArray(el)) _.comment.push(new PostPointer(el))
            })
        }
        if(isAny(d)){
            if(typeof d.like.amount === 'number') _.like.amount = d.like.amount
            if(typeof d.like.signature === 'string') _.like.signature = d.like.signature
            if(isAny(d.like.verifier)){
                if(d.like.verifier.isPeer)
                    _.like.verifier = d.like.verifier
                else
                    _.like.verifier = new Peer(d.like.verifier)
            }
        }
        if(Array.isArray(d.media)) _.media = d.media
        if(Array.isArray(d.mention)) _.mention = new PostPointer(d.mention)
        if(typeof d.owner === 'string') _.owner = d.owner
        if(typeof d.signature === 'string') _.signature = d.signature
        if(Array.isArray(d.tag)) _.tag = d.tag
        if(typeof d.text === 'string') _.text = d.text
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        /** @type {PostPointer[]}*/
        let comments = []
        _.comment.forEach(el => {
            comments.push(el.export())
        })
        return {
            comment: comments,
            like: {
                amount: _.like.amount,
                signature: _.like.signature,
                verifier: _.like.verifier.export()
            },
            media: _.media,
            mention: _.mention.export(),
            owner: _.owner,
            tag: _.tag,
            text: _.text,
        }
    }
    if(isAny(d)) _import()
}
module.exports = Post