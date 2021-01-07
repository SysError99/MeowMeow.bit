const isAny = require('../type.any.check')
const SignKey = require("./key.sign")
/**
 * Account object
 * @param {Object} d JSON
 */
const Acc = function(d){
    /** This object*/
    let _ = this
    /** @type {boolean} This is 'Account' object*/
    this.isAcc = true

    /** @type {string} Account description*/
    this.description = ''

    /** @type {string[]} List of followers (identified with a public key)*/
    this.follower = []

    /** @type {string[]} List of following (identified by a public key)*/
    this.following = []

    /** @type {SignKey} Asymmetric key to be used*/
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
    let _new = () => {
        _.key = new SignKey()
    }

    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d.description === 'string') _.description = d.description
        if(Array.isArray(d.follower)) _.follower = d.follower
        if(isAny(d.key)){
            if(d.key.isKey) _.key = d.key
            else _.key = new SignKey(d.key)
        }else _.key = new SignKey()
        if(typeof d.name === 'string') _.name = d.name
        if(isAny(d.pic)){
            if(typeof d.pic.cover === 'string') _.pic.cover = d.pic.cover
            if(typeof d.pic.profile === 'string') _.pic.profile = d.pic.profile
        }
        if(typeof d.posts === 'number') _.posts = d.posts
        if(typeof d.public === 'boolean') _.public = d.public
        if(Array.isArray(d.tag)) _.tag = d.tag
    }
    /**
     * Export base
     */
    let exportBase = () => {
        return {
            description: _.description,
            follower: _.follower,
            key: null,
            name: _.name,
            pic: _.pic,
            posts: _.posts,
            public: _.public,
            tag: _.tag
        }
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        let e = exportBase()
        e.key = _.key.export()
        return e
    }
    /**
     * Export to JSON
     */
    this.exportPub = () => {
        let e = exportBase()
        e.key = _.key.exportPub()
        return e
    }
    if(isAny(d)) _import(d)
    else _new()
}
module.exports = Acc