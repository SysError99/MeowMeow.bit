const PostPointer = require('./post.pointer')
/**
 * Post object
 * @param {Array} d Array object
 */
const Post = function(d){
    /** This object*/
    let self = this
    /** @type {boolean} This is 'Post' object*/
    this.isPost = true

    /** @type {PostPointer[]} Post comments*/
    this.comment = []

    /** @type {string} People names who like this post*/
    this.like = []

    /** @type {string} People signatures who like this post*/
    this.likeSignature = []

    /** @type {string[]} Base64-based media files*/
    this.media = []

    /** @type {PostPointer[]} Post mention*/
    this.mention = null

    /** @type {string} Post owner name*/
    this.owner = ''

    /** @type {string} Post signature from owner*/
    this.signature = Buffer.from([])

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
                if(Array.isArray(el))
                    self.comment.push(new PostPointer(el))
            })
        }
        
        if(Array.isArray(d[1]))
            self.like = d[1]

        if(Array.isArray(d[2]))
            self.likeSignature = d[2]

        if(Array.isArray(d[3]))
            self.media = d[3]

        if(Array.isArray(d[4]))
            self.mention = d[4]

        if(typeof d[5] === 'string')
            self.owner = d[5]

        if(typeof d[6] === 'string')
            self.signature = d[6]

        if(Array.isArray(d[7]))
            self.tag = d[7]

        if(typeof d[8] === 'string')
            self.text = d[8]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        /** @type {PostPointer[]}*/
        let comments = []
        self.comment.forEach(el => {
            comments.push(el.export())
        })
        return [
            comments,
            self.like,
            self.likeSignature,
            self.media,
            self.mention,
            self.owner,
            self.signature,
            self.tag,
            self.text
        ]
    }

    if(Array.isArray(d))
        _import()
}

module.exports = Post