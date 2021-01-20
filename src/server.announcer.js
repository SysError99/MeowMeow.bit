// UNSTABLE, NOT TESTED
/*!
 * Announcer server
 * 
 * Must be outside NAT.
 */
const Datagram = require('dgram')

const Try = require('./try.catch')
const ECDHkey = require('./model/key.ecdh')
const Locale = require('./locale')
const Peer = require('./model/peer')

const announcement = {}
const knownPeers = {}
const udp = Datagram.createSocket('udp4')
const storage = require('./storage')(new Locale())

/** @type {ECDHkey} ECDH key used on the server */
const myKey = Try(() => new ECDHkey(storage.read('key.server')))
console.log(`Public key: ${myKey.get.pub().toString('base64')}`)

const Announcement = function(){
    let _ = this
    this.request = {
        address: '',
        port: 0
    }
}

const error = err => err ? console.error(err) : 0
const ipRegex = new RegExp('(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})')

udp.bind(12345)
udp.on('listening', () => {
    console.log(`Server is running on port `+udp.address().port)
})
udp.on('error', error)
udp.on('message', (msg, remote) => {
    let message = msg.toString('utf-8')
    let remoteAddress = `${remote.address}:${remote.port}`
    if(typeof announcement[remoteAddress] === 'object'){
        /** @type {Announcement} */
        let ann = announcement[remoteAddress]
        let payload  = `*${ann.request.address}:${ann.request.port}`
        let payload2 = `*${remoteAddress}`
        delete announcement[remoteAddress]
        udp.send(payload, 0, payload.length, remote.port, remote.address, error)
        udp.send(payload2, 0, payload2.length, ann.request.port, ann.request.address, error)
        console.log(`Announce ${ann.request.address}:${ann.request.port} -> ${remoteAddress}`)
    }
    if(message.length > 0){
        let peer = knownPeers[remoteAddress]
        udp.send('',0,0,remote.port,remote.address, error)
        if(typeof peer === 'undefined') return Try(() => {
            let peer = new Peer([
                remote.ip,
                remote.port,
                message,
                new Date().toUTCString()
            ])
            peer.key = myKey.computeSecret(message)
            knownPeers[remoteAddress] = peer
        })
        if(message === '?'){
            let port = `:${remote.port}`
            udp.send(port, 0, port.length, remote.port, remote.address, error)
            return
        } 
        if(!ipRegex.test(message)) return
        if(typeof announcement[message] !== 'object')
            announcement[message] = new Announcement()
        /** @type {Announcement} */
        let ann = announcement[message]
        ann.request.address = remote.address
        ann.request.port = remote.port
        console.log(`Request ${remoteAddress} -> ${message}`)
    }
})