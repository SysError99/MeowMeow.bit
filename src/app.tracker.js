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

const announcing = {}
const knownPeers = {}
const knownPeersByPub = {}
/** @type {ECDHKey} ECDH key being used on the tracker */
const myKey = (() => {
    /** @type {ECDHKey} */
    let ecdhKey = null
    let keySaved = Storage.read('key.server').data

    if(keySaved === null){
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
const udp = {
    announcer: Datagram.createSocket('udp4'),
    tracker: Datagram.createSocket('udp4')
}

/**
 * Send random bytes to target
 * @param {Datagram.RemoteInfo} remote Target remote to send random bytes to
 */
const sendRandomBytes = remote => udp.tracker.send(Crypt.rand(8), 0, 8, remote.port, remote.address, error)

/**
 * Stringify Array of JSON object
 * @param {Array|Object} obj Object to be stringified
 * @returns {string} converted string
 */
const str = obj => Try(() => JSON.stringify(obj), `["error"]`)

udp.announcer.bind(23456)
udp.announcer.on('listening', () => console.log(`Server is running on port `+udp.announcer.address().port))
udp.announcer.on('error', error)
udp.announcer.on('message', (msg, remote) => {
    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {string|string[]} */
    let message
    /** @type {Peer} */
    let peer

    if(msg.length === 0)
        return udp.announcer.send('', 0, 0, remote.port, remote.address, error)

    /**
     * Identify peer
     * @param {boolean} reset Delete this peer? 
     */
    let identifyPeer = reset => {
        if(reset)
            delete announcing[remoteAddress]

        if(typeof announcing[remoteAddress] === 'undefined'){
            peer = new Peer([
                remote.ip,
                remote.port,
                msg
            ])

            if(peer.key === null)
                return sendRandomBytes(remote)

            announcing[remoteAddress] = peer

            let successMessage = peer.key.encrypt(`+${BaseN.encode(Crypt.rand(16))}`)
            udp.announcer.send(successMessage, 0, successMessage, peer.port, peer.ip, error)
            return true
        }

        peer = announcing[remoteAddress]

        if(new Date() - peer.lastAccess > __.ACCESS_COOLDOWN)
            return identifyPeer(true)
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
            udp.announcer.send(remotePort, 0, remotePort.length, remote.port, remote.address, error)
            return

        case '>': //peer announce
            console.log(`Announce Request ${remoteAddress} -> ${message}`)

            /** @type {Peer} */
            let peerToAnnounce = knownPeersByPub[message]

            if(typeof peerToAnnounce === 'object'){
                if(new Date() - peerToAnnounce.lastAccess > __.LAST_ACCESS_LIMIT){ //peer is too old to connect
                    let msgTooOldPeerError = peer.key.encrypt(`-${message}`)
                    udp.announcer.send(msgTooOldPeerError, 0, msgTooOldPeerError.length, remote.port, remote.address, error)
                    delete knownPeersByPub[message]
                    return
                }

                let payload = peer.key.encrypt(`${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                let payload2  = peerToAnnounce.key.encrypt(`*${remote.address}:${remote.port}`)
                udp.announcer.send(payload, 0, payload.length, remote.port, remote.address, error)
                udp.announcer.send(payload2, 0, payload2.length, peerToAnnounce.port, peerToAnnounce.ip, error)
                console.log(`Announce ${remote.address}:${remote.port} -> ${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                return
            }
            
            let unknownPeerMessage = peer.key.encrypt(`?${message}`)
            udp.announcer.send(unknownPeerMessage, 0, unknownPeerMessage.length, remote.port, remote.address, error)
            return
    }

})

udp.tracker.bind(12345)
udp.tracker.on('listening', () => console.log(`Server is running on port `+udp.tracker.address().port))
udp.tracker.on('error', error)
udp.tracker.on('message', (msg, remote) => {
    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {Buffer|message} */
    let message
    /** @type {Peer} */
    let peer

    if(msg.length === 0)
        return udp.tracker.send('', 0, 0, remote.port, remote.address, error)

    /**
     * Identify peer
     * @param {boolean} reset Delete this peer? 
     */
    let identifyPeer = reset => {
        if(reset)
            delete knownPeers[remoteAddress]

        if(typeof knownPeers[remoteAddress] === 'undefined'){
            peer = new Peer([
                remote.address,
                remote.port,
                msg
            ])

            if(peer.key === null)
                return sendRandomBytes(remote)

            knownPeers[remoteAddress] = peer

            console.log(`Welcome ${remoteAddress}!`)
            let successMessage = peer.key.encrypt(str( [`welcome`] ))
            udp.tracker.send(successMessage, 0, successMessage.length, peer.port, peer.ip, error)
            return true
        }

        peer = knownPeers[remoteAddress]

        let currentTime = new Date()
        let lastAccess = currentTime - peer.lastAccess
        if(lastAccess <= __.ACCESS_COOLDOWN)
            return
        else if(lastAccess > __.LAST_ACCESS_LIMIT)
            return identifyPeer(true)

        peer.lastAccess = currentTime
    }

    if(identifyPeer())
        return

    if(Try(() => message = JSON.parse(peer.key.decrypt(msg))))
        return

    //Tracker
    switch(message[0]){
        case 'hello': //Peer add pub
            if(typeof knownPeersByPub[message[1]] !== 'undefined'){
                let keyExistsMessage = peer.key.encrypt(str( [`keyExists`] ))
                udp.tracker.send(keyExistsMessage, 0, keyExistsMessage.length, remote.port, remote.address, error)
                return
            }

            knownPeersByPub[remoteAddress] = peer
            
            let helloMessage = peer.key.encrypt(str( [`hello`] ))
            udp.tracker.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, error)
            return
    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.get.pub().toString('base64')}>`)