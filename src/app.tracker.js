// UNSTABLE, NOT TESTED
/*!
 * Tracker Server
 */
const Datagram = require('dgram')

const __ = require('./const')
const Try = require('./fn.try.catch')
const Locale = require('./locale/locale')

const Announcement = require('./data/announcement')
const ECDHkey = require('./data/key.ecdh')
const IpRegex = require('./data/ip.regex')
const Peer = require('./data/peer')

const announcement = {}
const knownPeers = {}
const myKey = Try(() => new ECDHkey(storage.read('key.server')))
const storage = require('./fn.storage')(new Locale())

/**
 * Shows error via log
 * @param {Error} err Error object
 */
const error = err => err ? console.error(err) : 0

/**
 * Datagram object
 */
const udp = Datagram.createSocket('udp4')

/**
 * Make an announcement to both peers
 * @param {Datagram.RemoteInfo} remote Remote address of target
 */
const announce = remote => {
    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {Announcement} */
    let ann = announcement[remoteAddress]
    let payload  = `*${ann.request.address}:${ann.request.port}`
    let payload2 = `*${remoteAddress}`
    delete announcement[remoteAddress]
    udp.send(payload, 0, payload.length, remote.port, remote.address, error)
    udp.send(payload2, 0, payload2.length, ann.request.port, ann.request.address, error)
    console.log(`Announce ${ann.request.address}:${ann.request.port} -> ${remoteAddress}`)
}

udp.bind(12345)
udp.on('listening', () => console.log(`Server is running on port `+udp.address().port))
udp.on('error', error)
udp.on('message', (msg, remote) => {
    let remoteAddress = `${remote.address}:${remote.port}`
    
    if(typeof announcement[remoteAddress] === 'object')
        announce(remote)

    if(msg.length === 0) return
    
    /** @type {string|string[]} */
    let message
    /** @type {Peer} */
    let peer

    let identifyPeer = reset => {
        if(reset) delete knownPeers[remoteAddress]
        if(typeof knownPeers[remoteAddress] === 'undefined'){
            peer = new Peer([
                    remote.ip,
                    remote.port,
                    msg
                ])
            if(peer.key !== null){
                knownPeers[remoteAddress] = peer
                return true
            }
        }
        if(new Date() - peer.lastAccess > __.LAST_ACCESS_LIMIT) return identifyPeer(true)
        peer = knownPeers[remoteAddress]
    }

    if(Try(identifyPeer)) return

    peer.lastAccess = new Date()

    message = peer.key.decrypt(msg)
    let cmd = message[0]
    message = message.slice(0,1)

    //Announcer
    switch(cmd){
        case '?':
            let remotePort = peer.key.encrypt(`${remote.port}`)
            udp.send(remotePort, 0, remotePort.length, remote.port, remote.address, error)
            return
        case '>':
            if(!IpRegex.test(message)) return
            if(typeof announcement[message] !== 'object')
                announcement[message] = new Announcement()
            
                /** @type {Announcement} */
            let ann = announcement[message]
            ann.request.address = remote.address
            ann.request.port = remote.port
            console.log(`Request ${remoteAddress} -> ${message}`)

            if(knownPeers[message] === 'object'){
                let destinationAddress = message.split(':')
                destinationAddress[1] = parseInt(destinationAddress[1])
                announce({
                    address: destinationAddress[0],
                    port: destinationAddress[1]
                })
            }
            return
        default:
            message = Try(() => JSON.parse(message), null)
            if(!Array.isArray(message)) return identifyPeer(true)
    }

    //Tracker
    switch(message[0]){
        
    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.get.pub().toString('base64')}>`)