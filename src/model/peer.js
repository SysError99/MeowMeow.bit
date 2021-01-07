const isAny = require('../type.any.check')
const Net = require('net')
const SymmetricKey = require('./key.symmetric')
/** 
 * Peer object
 * @param {{ip: string, port: number, pub: string, key: SymmetricKey, socket: Net.Socket}} d JSON
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
    /** @type {string} Peer public key.*/
    this.pub = ''
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
        if(typeof d.ip === 'string') _.ip = d.ip
        if(typeof d.port === 'number') _.port = d.port
        if(typeof d.pub === 'string') _.pub = d.pub
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return {
            ip: _.ip,
            port: _.port,
            pub: _.pub,
        }
    }
    if(isAny(d)) _import()
}
module.exports = Peer