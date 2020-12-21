const Net = require('net')
const SymmetricKey = require('./key.symmetric')
/** 
 * Peer object
 * @param {{ip: string, port: number, pub: string, key: SymmetricKey, socket: Net.Socket}} data JSON
 */
const Peer = function(data){
    /** This object */
    let _this = this
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
     * Import from JSON
     * @param {Object} d JSON object
     */
    this.import = function(d){
        if(typeof d !== 'object') return
        if(typeof d.ip === 'string') _this.ip = d.ip
        if(typeof d.port === 'number') _this.port = d.port
        if(typeof d.pub === 'string') _this.pub = d.pub
        if(typeof d.key === 'object') {
            if(d.key instanceof SymmetricKey)
                _this.key = d.key
            else
                _this.key = new SymmetricKey(d.key)
        }
        if(typeof d.socket === 'object') _this.socket = d.socket
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = function(){
        return {
            ip: _this.ip,
            port: _this.port,
            pub: _this.pub,
        }
    }
    if(typeof data === 'object') this.import(data)
}
module.exports = Peer