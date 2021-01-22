// UNSTABLE, NOT TESTED
/*!
 * Tracker Server
 */
const Datagram = require('dgram')
const Net = require('net')

const Try = require('./try.catch')
const Announcement = require('./model/announcement')
const ECDHkey = require('./model/key.ecdh')
const IpRegex = require('./model/ip.regex')
const Locale = require('./locale')
const Peer = require('./model/peer')

const announcement = {}
const knownPeers = {}
const myKey = Try(() => new ECDHkey(storage.read('key.server')))
const storage = require('./storage')(new Locale())
const udp = Datagram.createSocket('udp4')

/**
 * Shows error via log
 * @param {Error} err Error object
 */
const error = err => err ? console.error(err) : 0

Net.createServer({allowHalfOpen: true}, socket => {
    socket.setEncoding('utf-8')
    socket.on('error', error)
    socket.on('data', data => {

    })
    socket.on('end', () => socket.destroy())
}).listen(23456)

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
        /** @type {Peer} */
        let peer = knownPeers[remoteAddress]
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
        message = peer.key.decrypt(message)
        if(message === '?') {
            let remotePort = peer.key.decrypt(`${remote.port}`)
            return udp.send(remotePort, 0, remotePort.length, remote.port, remote.address, error)
        }
        if(!IpRegex.test(message)) return
        if(typeof announcement[message] !== 'object')
            announcement[message] = new Announcement()
        /** @type {Announcement} */
        let ann = announcement[message]
        ann.request.address = remote.address
        ann.request.port = remote.port
        console.log(`Request ${remoteAddress} -> ${message}`)
    }
})

console.log(`Public key: ${myKey.get.pub().toString('base64')}`)