/*!
 * Tracker Server
 */
const Datagram = require('dgram')

const __ = require('./const')
const Return = require('./fn.try.return')
const Try = require('./fn.try.catch')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Locale = require('./locale/locale')
const Storage = require('./fn.storage')(new Locale())
const {json, str} = require('./fn.json')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer.tracker')
const { send } = require('process')

const knownPeers = {}
const accountSeeders = {}

/** @type {ECDHKey} ECDH key being used on the tracker */
const myKey = Return(() => {
    /** @type {ECDHKey} */
    let ecdhKey
    let keySaved = Storage.read('key.server')

    if (typeof keySaved === 'undefined') {
        ecdhKey = new ECDHKey()
        Storage.write('key.server', ecdhKey.export())
        console.log(`Server key is now generated.`)
        return ecdhKey
    }

    ecdhKey = new ECDHKey(keySaved)
    
    if (typeof ecdhKey === 'undefined')
        throw Error(`key.server is invalid.`)

    return ecdhKey
}, true)

/**
 * Delete peer from list
 * @param {Peer} peer 
 */
const deletePeer = peer => {
    let addr = `${peer.ip}:${peer.port}`

    for (let seed in peer.seeds) {
        /** @type {Peer[]} */
        let seeders = accountSeeders[seed]

        if (!Array.isArray(seeders))
            continue

        for (let p = 0; p < seeders.length; p++) {
            let seeder = seeders[p]

            if (`${seeder.ip}:${seeder.port}` === addr) {
                seeders.splice(p, 1)
                break
            }
        }
    }
}

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
 * Encrypt a message and send message
 * @param {Peer} peer 
 * @param {Buffer|string} message 
 */
const sendEncrypted = (peer, message) => {
    message = peer.key.encrypt(message)
    udp.send(
        message,
        0,
        message.length,
        peer.port,
        peer.ip,
        showError
    )
}

/** @type {number} Current time in real-time (milliseconds)*/
let currentTime = new Date().getTime()

setInterval(() => currentTime = new Date().getTime(), 1000)

udp.bind(12345)
udp.on('listening', () => console.log(`Server is running on port `+udp.address().port))
udp.on('error', showError)
udp.on('message', (msg, remote) => {

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
        if (reset && typeof peer === 'object')
            deletePeer(peer)

        if (typeof knownPeers[remoteAddress] === 'undefined') {
            if (msg.length === 0)
                return true

            peer = new Peer([
                remote.address,
                remote.port,
            ])
            peer.key = myKey.computeSecret(msg) //not using random generated key

            if (typeof peer.key === 'undefined')
                return sendRandomBytes(remote)

            peer.lastAccess = currentTime
            knownPeers[remoteAddress] = peer

            sendEncrypted(peer, str( [`welcome`, remote.address, remote.port] ))
            console.log(`${remoteAddress}, joined!`)
            return true
        }

        peer = knownPeers[remoteAddress]
    }

    if (identifyPeer())
        return

    if (msg.length === 0) {
        //Keep alive
        udp.send('', 0, 0, remote.port, remote.address, showError)
        peer.lastAccess = currentTime
        return 
    }

    if (peer.lastAccess > 0) {
        if (currentTime - peer.lastAccess > __.ACCESS_COOLDOWN)
            return identifyPeer(true)
    }

    peer.lastAccess = currentTime

    if (Try(() => message = json(peer.key.decryptToString(msg))))
        return

    //Tracker
    switch (message[0]) {

        //announcer
        case 'announce':
            /** @type {Peer} */
            let peerToAnnounce = knownPeers[message[1]]

            if (typeof peerToAnnounce === 'object') {
                if (currentTime - peerToAnnounce.lastAccess > __.LAST_ACCESS_LIMIT) { //peer is too old to connect
                    sendEncrypted(peer, str( ['unknown', message[1]] ))
                    deletePeer(peerToAnnounce)
                    return
                }

                sendEncrypted(peerToAnnounce, str( [`sendrand`, remote.address, remote.port] ))
                sendEncrypted(peer, str( [`sendpub`, peerToAnnounce.ip, peerToAnnounce.port, BaseN.encode(peerToAnnounce.pub, '62')] ))
                console.log(`Announce ${remote.address}:${remote.port} -> ${peerToAnnounce.ip}:${peerToAnnounce.port}`)
                return
            }

            sendEncrypted(peer, str( ['unknown', message[1]] ))
            console.log(`Unknown ${remoteAddress} -> ${message[1]}`)
            return

        //tracker
        case 'forwardPort':
            if (typeof message[1] !== 'number')
                return

            peer.port = message[1]
            peer.public = true
            return

        case 'setPub':
            if (typeof message[1] !== 'string')
                return

            /** @type {Buffer} */
            let peerPub

            if (Try(() => peerPub = BaseN.decode(message[1], '62')))
                return

            peer.pub = peerPub
            return
    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.getPub().toString('base64')}>`)