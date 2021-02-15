const IpRegex = require('./ip.regex')
/**
 * Announcement object
 * @param {[string, port]} d Array object
 */
const Announcement = function(d){
    /** Request author*/
    this.request = {
        /** @type {string} Author address*/
        address: '',
        /** @type {number} Author port*/
        port: 0
    }

    /** @type {number} Timeout countdown * 4000 ms */
    this.timeout = 5

    if(typeof d !== 'object')
        return

    if(typeof d[0] !== 'string' || typeof d[1] !== 'number')
        return

    if(!IpRegex.test(`${d[0]}:${d[1]}`))
        return

    this.request.address = d[0]
    this.request.port = d[1]
    
}

module.exports = Announcement