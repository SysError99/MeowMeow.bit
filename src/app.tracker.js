// UNSTABLE, NOT TESTED
/*!
 * Tracker Server
 */
const Datagram = require('dgram')

const __ = require('./const')
const Try = require('./fn.try.catch')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Locale = require('./locale/locale')
const Storage = require('./fn.storage')(new Locale())

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer')

const knownPeers = {}
const knownPeersByPub = {}
/** @type {ECDHKey} ECDH key being used on the tracker */
const myKey = (() => {
    /** @type {ECDHKey} */
    let ecdhKey = null
    let keySaved = Storage.read('key.server').data

    if(keySaved.data === null){
        ecdhKey = new ECDHKey()
        Storage.write('key.server', ecdhKey.export())
        console.log(`Server key is now generated.`)
        return ecdhKey
    }

    ecdhKey = new ECDHKey(keySaved)
    
    if(ecdhKey === null)
        throw Error(`key.server is invalid.`)

    return ecdhKey
})()

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
 * Send random bytes to target
 * @param {Datagram.RemoteInfo} remote Target remote to send random bytes to
 */
const sendRandomBytes = remote => udp.send(Crypt.rand(8), 0, 8, remote.port, remote.address, error)

/**
 * Handle incoming message from peers
 * @param {Buffer} msg Received message
 * @param {Datagram.RemoteInfo} remote Remote peer info
 */
const handleIncomingMessage = (msg, remote) => {
    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {string|string[]} */
    let message
    /** @type {Peer} */
    let peer = knownPeers[remoteAddress]

    if(msg.length === 0)
        return udp.send('', 0, 0, remote.port, remote.address, error)

    /**
     * Identify peer
     * @param {boolean} reset Delete this peer? 
     */
    let identifyPeer = reset => {
        if(reset)
            delete knownPeers[remoteAddress]

        if(typeof knownPeers[remoteAddress] === 'undefined'){
            let encodedPublicKey = BaseN.encode(msg)

            if(knownPeersByPub[encodedPublicKey] === 'object')
                return sendRandomBytes(remote)

            peer = new Peer([
                remote.ip,
                remote.port,
                msg
            ])

            if(peer.key === null)
                return sendRandomBytes(remote)

            knownPeers[remoteAddress] = peer
            knownPeersByPub[encodedPublicKey] = peer
            return true
        }

        peer = knownPeers[remoteAddress]

        if(new Date() - peer.lastAccess > __.LAST_ACCESS_LIMIT)
            return identifyPeer(true)

        peer.lastAccess = new Date()
    }

    if(identifyPeer())
        return

    message = peer.key.decrypt(msg)
    let cmd = message[0]
    message = message.slice(1,message.length)

    //Announcer
    switch(cmd){
        case '@': //peer forward port
            let previousPort = peer.port

            if(Try(() => peer.port = parseInt(message), remote.port))
                return

            if(peer.port === NaN){
                peer.port = previousPort
                return
            }
            
            peer.nat = false
            break

        case ':': //peer port ask
            let remotePort = peer.key.encrypt(`:${remote.port}`)
            udp.send(remotePort, 0, remotePort.length, remote.port, remote.address, error)
            return

        case '>': //peer announce
            console.log(`Announce Request ${remoteAddress} -> ${message}`)

            /** @type {Peer} */
            let peerToAnnounce = knownPeersByPub[message]

            if(typeof peerToAnnounce === 'object'){
                if(new Date() - peerToAnnounce.lastAccess > __.LAST_ACCESS_LIMIT){ //peer is too old to connect
                    let msgTooOldPeerError = peer.key.encrypt(`-${message}`)
                    udp.send(msgTooOldPeerError, 0, msgTooOldPeerError.length, remote.port, remote.address, error)
                    delete knownPeersByPub[message]
                    return
                }

                let payload = peer.key.encrypt(`${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                let payload2  = peerToAnnounce.key.encrypt(`*${remote.address}:${remote.port}`)
                udp.send(payload, 0, payload.length, remote.port, remote.address, error)
                udp.send(payload2, 0, payload2.length, peerToAnnounce.port, peerToAnnounce.ip, error)
                console.log(`Announce ${remote.address}:${remote.port} -> ${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                return
            }
            
            let unknownPeerMessage = peer.key.encrypt(`?${message}`)
            udp.send(unknownPeerMessage, 0, unknownPeerMessage.length, remote.port, remote.address, error)
            return

        default:
            if(Try(() => message = JSON.parse(messge)))
                return

    }

    //Tracker
    switch(message[0]){
        
    }
}

udp.bind(12345)
udp.on('listening', () => console.log(`Server is running on port `+udp.address().port))
udp.on('error', error)
udp.on('message', handleIncomingMessage)

console.log(`Tracker is now on! \n\nPublic key: <${myKey.get.pub().toString('base64')}>`)