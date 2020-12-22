const Peer = require('./peer')
/**
 * Post object
 * @param {Object} d JSON
 */
const Post = function(d){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'Post' object*/
    this.isPost = true

    /** @type {Post[]} Post comments*/
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

    /** @type {Post} Post mention*/
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
    let _import = function(){
        if(Array.isArray(d.comment)){
            d.comment.forEach(function(el){
                if(typeof el !== 'object') return
                if(el.isPost) _this.comment.push(el)
                else _this.comment.push(new Post(el))
            })
        }
        if(typeof d.like === 'object'){
            if(typeof d.like.amount === 'number') _this.like.amount = d.like.amount
            if(typeof d.like.signature === 'string') _this.like.signature = d.like.signature
            if(typeof d.like.verifier === 'object'){
                if(d.like.verifier.isPeer)
                    _this.like.verifier = d.like.verifier
                else
                    _this.like.verifier = new Peer(d.like.verifier)
            }
        }
        if(Array.isArray(d.media)) _this.media = d.media
        if(typeof d.mention === 'object'){
            if(d.mention.isPost) _this.mention = d.mention
            else _this.mention = new Post(d.mention)
        }
        if(typeof d.owner === 'string') _this.owner = d.owner
        if(typeof d.signature === 'string') _this.signature = d.signature
        if(Array.isArray(d.tag)) _this.tag = d.tag
        if(typeof d.text === 'string') _this.text = d.text
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = function(){
        /** @type {Post[]}*/
        let comments = []
        _this.comment.forEach(function(el){
            comments.push(el.export())
        })
        return {
            comment: comments,
            like: {
                amount: _this.like.amount,
                signature: _this.like.signature,
                verifier: _this.like.verifier.export()
            },
            media: _this.media,
            mention: _this.mention.export(),
            owner: _this.owner,
            tag: _this.tag,
            text: _this.text,
        }
    }
    if(typeof d === 'object') _import()
}
module.exports = Post