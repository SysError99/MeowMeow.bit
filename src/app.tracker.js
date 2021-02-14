// UNSTABLE, NOT TESTED
/*!
 * Tracker Server
 */
const Datagram = require('dgram')

const __ = require('./const')
const Try = require('./fn.try.catch')
const BaseN = require('./fn.base.n')
const Locale = require('./locale/locale')
const Storage = require('./fn.storage')(new Locale())

const Announcement = require('./data/announcement')
const ECDHkey = require('./data/key.ecdh')
const Peer = require('./data/peer')

const announcement = {}
const knownPeers = {}
const knownPeersByKey = {}
const myKey = Try(() => new ECDHkey(Storage.read('key.server')))

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
 * @param {{address:string, port:number}} remote Remote address of target
 */
const announce = remote => {
    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {Announcement} */
    let ann = announcement[remoteAddress]
    let payload  = `*${ann.request.address}:${ann.request.port}`
    let payload2 = `${remoteAddress}`
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
    /** @type {string|string[]} */
    let message
    /** @type {Peer} */
    let peer = knownPeers[remoteAddress]

    let identifyPeer = reset => {
        if(reset)
            delete knownPeers[remoteAddress]
        if(typeof knownPeers[remoteAddress] === 'undefined'){
            peer = new Peer([
                    remote.ip,
                    remote.port,
                    msg
                ])
            if(peer.key !== null){
                knownPeers[remoteAddress] = peer
                knownPeersByKey[encodedPublicKey] = peer
                if(typeof announcement[BaseN.encode(peer.pub)] === 'object') 
                    announce({
                        address: peer.ip,
                        port: peer.port
                    })
                return true
            }
        }
        peer = knownPeers[remoteAddress]
        if(new Date() - peer.lastAccess > __.LAST_ACCESS_LIMIT)
            return identifyPeer(true)
        peer.lastAccess = new Date()
    }

    if(identifyPeer())
        return

    if(msg.length === 0)
        return

    message = peer.key.decrypt(msg)
    let cmd = message[0]
    message = message.slice(1,message.length)

    //Announcer
    switch(cmd){
        case '@':
            if(Try(() => peer.port = parseInt(message), remote.port))
                return
            
            peer.nat = true
            break
        case '?':
            let remotePort = peer.key.encrypt(`${remote.port}`)
            udp.send(remotePort, 0, remotePort.length, remote.port, remote.address, error)
            return
        case '>':
            if(typeof announcement[message] !== 'object')
                announcement[message] = new Announcement()
            /** @type {Announcement} */
            let ann = announcement[message]
            ann.request.address = remote.address
            ann.request.port = remote.port
            console.log(`Request ${remoteAddress} -> ${message}`)

            /** @type {Peer} */
            let peerToAnnounce = knownPeersByKey[message]
            if(typeof peerToAnnounce === 'object')
                announce({
                    address: peerToAnnounce.ip,
                    port: peerToAnnounce.port
                })
            return
        default:
            if(Try(() => message = JSON.parse(messge)))
                return
    }

    //Tracker
    switch(message[0]){
        
    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.get.pub().toString('base64')}>`)