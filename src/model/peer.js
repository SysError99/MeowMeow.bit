const Try = require('../try.catch')
const Datagram = require('dgram')
const Net = require('net')
const ECDHKey = require('./key.ecdh')
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
    /** @type {Date} Last accessed time*/
    this.lastAccess = new Date()
    /** @type {number} Peer connected port*/
    this.port = 8080
    /** @type {Buffer} Peer public key.*/
    this.pub = Buffer.from([])
    /** @type {Buffer} Randomly generated public key to be shared with another peer*/
    this.myPub = Buffer.from([])
    /** @type {SymmetricKey} Peer Symmetric key*/
    this.key = null
    /** @type {number} Peer quality indicator*/
    this.quality = 5
    /** @type {Datagram.Socket} Network socket*/
    this.socket = null
    /** @type {boolean} Is the connection established?*/
    this.connected = false
    /** @type {boolean} If this peer is currently sending large bytes*/
    this.downloading = false
    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d[0] === 'string') _.ip = d[0]
        if(typeof d[1] === 'number') _.port = d[1]
        Try(() => {
            if(typeof d[2] === 'string') d[2] = Buffer.from(d[2], 'base64')
            if(typeof d[3] === 'string') _.lastAccess = Date.parse(d[3])
            if(!Buffer.isBuffer(d[2])) return
            let newECDH = new ECDHKey()
            _.key = newECDH.computeSecret(d[2])
            _.myPub = newECDH.get.pub()
            _.pub = d[2]
        })
    }
    /**
     * Export to JSON
     * @returns {Object} JSON
     */
    this.export = () => {
        return [
            _.ip,
            _.port,
            _.pub.toString('base64'),
            _.lastAccess.toUTCString()
        ]
    }
    if(Array.isArray(d)) _import()
}
module.exports = Peer