const AsymmetricKey = require("./key.asymmetric")
/**
 * Account object
 * @param {Object} data JSON
 */
const Acc = function(data){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'Account' object*/
    this.isAcc = true

    /** @type {string} Account description*/
    this.description = ''

    /** @type {string[]} List of followers (identified with a public key)*/
    this.follower = []

    /** @type {string[]} List of following (identified by a public key)*/
    this.following = []

    /** @type {AsymmetricKey} Asymmetric key to be used*/
    this.key = null

    /** @type {string} Name to be called*/
    this.name = ''

    /** Picture for this account*/
    this.pic = {
        /** @type {string} Base64-based cover picture file*/
        cover: '',
        /** @type {string} Base64-based profile picture file*/
        profile: ''
    }

    /** @type {number} Number of posts*/
    this.posts = 0
    
    /** @type {boolean} Is this a public account? (Anyone can write to this account)*/
    this.public = false

    /** @type {string[]} List of tag for searching*/
    this.tag = []

    /**
     * Import data to object
     * @param {Object} d JSON
     */
    this.import = function(d){
        if(typeof d !== 'object') return
        if(typeof d.description === 'string') _this.description = d.description
        if(Array.isArray(d.follower)) _this.follower = d.follower
        if(typeof d.key === 'object'){
            if(d.key.isKey) _this.key = d.key
            else _this.key = new AsymmetricKey(d.key)
        }
        if(typeof d.name === 'string') _this.name = d.name
        if(typeof d.pic === 'object'){
            if(typeof d.pic.cover === 'string') _this.pic.cover = d.pic.cover
            if(typeof d.pic.profile === 'string') _this.pic.profile = d.pic.profile
        }
        if(typeof d.posts === 'number') _this.posts = d.posts
        if(typeof d.private === 'boolean') _this.private = d.private
        if(typeof d.public === 'boolean') _this.public = d.public
        if(Array.isArray(d.tag)) _this.tag = d.tag
    }
    /**
     * Export data to object
     * @returns {Object} JSON
     */
    this.export = function(){
        return {
            description: _this.description,
            follower: _this.follower,
            key: _this.key.export(),
            name: _this.name,
            pic: _this.pic,
            posts: _this.posts,
            private: _this.private,
            public: _this.public,
            tag: _this.tag
        }
    }
    if(typeof data === 'object') this.import(data)
}
module.exports = Acc