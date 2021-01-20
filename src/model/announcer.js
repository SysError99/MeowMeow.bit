const Try = require('../try.catch')
const ECDHKey = require('./key.ecdh')
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
    /** @type {SymmetricKey} Secret assigned to this announcer*/
    this.key = null
    /** @type {Buffer} Randomly generated local pubilc key to be shared with an announcer*/
    this.myPub = Buffer.from([])
    /** @type {Buffer} Public key of an announcer*/
    this.pub = Buffer.from([])

    /** Import from array*/
    let _import = () => Try(() => {
        if(typeof d[0] === 'string') _.ip = d[0]
        if(typeof d[1] === 'number') _.port = d[1]
        else if(typeof d[2] === 'string') _.port = parseInt(d[2])
        Try(() => {
            if(typeof d[3] === 'string') d[3] = Buffer.from(d[3], 'base64')
            if(Buffer.isBuffer(d[3])) {
                let newEcdh = new ECDHKey()
                _.key = newEcdh.computeSecret(d[3])
                _.myPub = newEcdh.get.pub()
                _.pub = d[3]
            }
        })
    })

    /**
     * Export to array
     * @return {Array} Array object
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
module.exports = Announcer