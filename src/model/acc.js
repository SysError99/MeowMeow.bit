const SignKey = require("./key.sign")
/**
 * Account object
 * @param {Array[]} d Array object
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
     * Import array
     */
    let _import = () => {
        if(typeof d[0] === 'string') _.description = d[0]
        if(Array.isArray(d[1])) _.follower = d[1]
        if(Array.isArray(d[2])) _.key = new SignKey(d[2])
        else _.key = new SignKey()
        if(typeof d[3] === 'string') _.name = d[3]
        if(Array.isArray(d[4])){
            if(typeof d[4][0] === 'string') _.pic.cover = d[4][0]
            if(typeof d[4][1] === 'string') _.pic.profile = d[4][1]
        }
        if(typeof d[5] === 'number') _.posts = d[5]
        if(typeof d[6] === 'boolean') _.posts = d[6]
        if(Array.isArray(d[7])) _.tag = d[7]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    let exportBase = () => {
        return [
            _.description,
            _.follower,
            null,
            _.name,
            [
                _.pic.cover,
                _.pic.profile
            ],
            _.posts,
            _.public,
            _.tag
        ]
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.export = () => {
        let e = exportBase()
        e[2] = _.key.export()
        return e
    }
    /**
     * Export to array
     * @returns {Array} Array object
     */
    this.exportPub = () => {
        let e = exportBase()
        e[2] = _.key.exportPub()
        return e
    }
    if(Array.isArray(d)) _import()
    else _new()
}
module.exports = Acc