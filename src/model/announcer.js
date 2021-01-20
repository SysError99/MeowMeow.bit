const Try = require('../try.catch')
/**
 * Announcer object.
 * @param {Array} d Array object.
 */
const Announcer = function(d){
    /** This object */
    let _ = this
    /** @type {boolean} This is Announcer object*/
    this.isAnnouncer = true

    /** @type {string} IP address*/
    this.ip = ''
    /** @type {string} Port*/
    this.port = 12345
    /** @type {string} Public key to be used (ECDH)*/
    this.pub = ''

    /** Import from array*/
    let _import = () => Try(() => {
        if(typeof d[0] === 'string') _.ip = d[0]
        if(typeof d[1] === 'number') _.port = d[1]
        else if(typeof d[2] === 'string') _.port = parseInt(d[2])
        if(typeof d[3] === 'string') _.pub = d[3]
    })

    /**
     * Export to array
     * @return {Array} Array object
     */
    this.export = () => {
        return [
            _.ip,
            _.port,
            _.pub
        ]
    }
    if(Array.isArray(d)) _import()
}
module.exports = Announcer