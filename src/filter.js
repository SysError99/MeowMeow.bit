const _ = require('./const')
/** Blocked lists*/
const blocked = {
    /** @type {string[]} Blocked account lists*/
    acc: [],
    /** @type {string[]} Blocked words*/
    word: []
}
/** Account limit rate*/
const limit = {
    /** @type {number[][]} Allowed UTF-8 character range, can be multiple*/
    range: [],
    /** @type {number} Max size of each post (default: a four of max payload, that is 8 MB)*/
    size: _.MAX_PAYLOAD / 4
}
/** Content filtering module*/
module.exports = {
    blocked: blocked,
    limit: limit,
    /**
     * Import data to object
     * @param {Object} d JSON
     */
    import: function(d){
        if(typeof d.blocked === 'object'){
            if(Array.isArray(d.blocked.acc)) blocked.acc = d.blocked.acc
            if(Array.isArray(d.blocked.word)) blocked.word = d.blocked.word
        }
        if(typeof d.limit === 'object'){
            if(Array.isArray(d.limit.range)) limit.range = d.limit.range
            if(typeof d.limit.size === 'number') limit.size = d.limit.size
        }
    },
    /**
     * Export block list to JSON
     * @returns {Object} JSON
     */
    export: function(){
        return {
            blocked: blocked,
            limit: limit
        }
    }
}