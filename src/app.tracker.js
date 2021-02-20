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
const showError = err => err ? console.error(err) : 0

/**
 * Datagram object
 */
const udp = Datagram.createSocket('udp4')

/**
 * Send random bytes to target
 * @param {Datagram.RemoteInfo} remote Target remote to send random bytes to
 */
const sendRandomBytes = remote => udp.send(Crypt.rand(8), 0, 8, remote.port, remote.address, showError)

/**
 * Stringify Array of JSON object
 * @param {Array|Object} obj Object to be stringified
 * @returns {string} converted string
 */
const str = obj => Try(() => JSON.stringify(obj), `["error"]`)

udp.bind(12345)
udp.on('listening', () => console.log(`Server is running on port `+udp.address().port))
udp.on('error', showError)
udp.on('message', (msg, remote) => {
    if(msg.length === 0)
        return udp.send('', 0, 0, remote.port, remote.address, showError)

    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {Buffer|message} */
    let message
    /** @type {Peer} */
    let peer

    /**
     * Identify peer
     * @param {boolean} reset Delete this peer? 
     */
    let identifyPeer = reset => {
        if(reset){
            delete knownPeers[remoteAddress]
            delete knownPeersByPub[BaseN.encode(peer.pub)]
        }

        let currentTime = new Date()

        if(typeof knownPeers[remoteAddress] === 'undefined'){
            peer = new Peer([
                remote.address,
                remote.port,
            ])
            peer.key = myKey.computeSecret(msg) //not using random generated key
            

            if(peer.key === null)
                return sendRandomBytes(remote)

            peer.lastAccess = currentTime
            knownPeers[remoteAddress] = peer

            let successMessage = peer.key.encrypt(str( [`welcome`] ))
            udp.send(successMessage, 0, successMessage.length, remote.port, remote.address, showError)
            console.log(`${remoteAddress}, joined!`)
            return true
        }

        peer = knownPeers[remoteAddress]

        if(peer.lastAccess.getTime() > 0){
            if(currentTime - peer.lastAccess > __.ACCESS_COOLDOWN)
                return identifyPeer(true)
        }

        peer.lastAccess = currentTime
    }

    if(identifyPeer())
        return

    if(Try(() => message = JSON.parse(peer.key.decrypt(msg))) === null)
        return

    //Tracker
    switch(message[0]){

        //announcer
        case 'announce':
            /** @type {Peer} */
            let peerToAnnounce = knownPeersByPub[message[1]]

            if(typeof peerToAnnounce === 'object'){
                if(new Date() - peerToAnnounce.lastAccess > __.LAST_ACCESS_LIMIT){ //peer is too old to connect
                    let msgTooOldPeerError = peer.key.encrypt(str( [`tooOld`] ))
                    udp.send(msgTooOldPeerError, 0, msgTooOldPeerError.length, remote.port, remote.address, showError)
                    delete knownPeersByPub[message[1]]
                    return
                }

                let payload = peer.key.encrypt(str( [peerToAnnounce.ip, peerToAnnounce.port] ))
                let payload2  = peerToAnnounce.key.encrypt(str( [`announce`, remote.address, remote.port] ))
                udp.send(payload, 0, payload.length, remote.port, remote.address, showError)
                udp.send(payload2, 0, payload2.length, peerToAnnounce.port, peerToAnnounce.ip, showError)
                console.log(`Announce ${remote.address}:${remote.port} -> ${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                return
            }
            
            let unknownPeerMessage = peer.key.encrypt(str( [`unknown`] ))
            udp.send(unknownPeerMessage, 0, unknownPeerMessage.length, remote.port, remote.address, showError)

            console.log(`Announce Request ${remoteAddress} -> ${message[1]}`)
            return

        //tracker
        case 'forwardPort':
            if(typeof message[1] !== 'number')
                return

            peer.port = message[1]
            peer.nat = false
            return

        case 'hello': //Peer add pub
            if(typeof knownPeersByPub[message[1]] !== 'undefined'){
                let keyExistsMessage = peer.key.encrypt(str( [`keyExists`] ))
                udp.send(keyExistsMessage, 0, keyExistsMessage.length, remote.port, remote.address, showError)
                return
            }

            delete knownPeersByPub[BaseN.encode(peer.pub)]
            knownPeersByPub[message[1]] = peer
            peer.pub = BaseN.decode(message[1])
            
            console.log(`${remoteAddress}: Hello, my pub is ${message[1]}`)
            let helloMessage = peer.key.encrypt(str( [`hello`] ))
            udp.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
            return

    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.get.pub().toString('base64')}>`)