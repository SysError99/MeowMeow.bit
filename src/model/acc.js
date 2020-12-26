const AsymmetricKey = require("./key.asymmetric")
const SignKey = require("./key.sign")
/**
 * Account object
 * @param {Object} d JSON
 */
const Acc = function(d){
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
     * Create a new account
     */
    let _new = function(){
        _this.key = new SignKey()
    }

    /**
     * Import JSON
     */
    let _import = function(){
        if(typeof d.description === 'string') _this.description = d.description
        if(Array.isArray(d.follower)) _this.follower = d.follower
        if(typeof d.key === 'object'){
            if(d.key.isKey) _this.key = d.key
            else _this.key = new SignKey(d.key)
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
     * Export base
     */
    let exportBase = function(){
        return {
            description: _this.description,
            follower: _this.follower,
            key: null,
            name: _this.name,
            pic: _this.pic,
            posts: _this.posts,
            private: _this.private,
            public: _this.public,
            tag: _this.tag
        }
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = function(){
        let e = exportBase()
        e.key = _this.key.export()
        return e
    }
    /**
     * Export to JSON
     */
    this.exportPub = function(){
        let e = exportBase()
        e.key = _this.key.exportPub()
        return e
    }
    if(typeof d === 'object') _import(d)
    else _new()
}
module.exports = Acc