const Net = require('net')
const SymmetricKey = require('./key.symmetric')
/** 
 * Peer object
 * @param {Array} d Array object
 */
const Peer = function(d){
    /** This object */
    let _ = this
    /** @type {boolean} This is 'Peer' object*/
    this.isPeer = true
    /** @type {string} Peer IP address*/
    this.ip = ''
    /** @type {number} Peer connected port*/
    this.port = 8080
    /** @type {Buffer} Peer public key.*/
    this.pub = Buffer.from([])
    /** @type {SymmetricKey} Peer Symmetric key*/
    this.key = null
    /** @type {number} Peer quality indicator*/
    this.quality = 5
    /** @type {Net.Socket} Network socket*/
    this.socket = null
    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d[0] === 'string') _.ip = d[0]
        if(typeof d[1] === 'number') _.port = d[1]
        if(typeof d[2] === 'string') _.pub = Buffer.from(d[2], 'base64')
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return [
            _.ip,
            _.port,
            _.pub.toString('base64')
        ]
    }
    if(Array.isArray(d)) _import()
}
module.exports = Peer