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
const Storage = require('./storage')(new Locale())
const Web = require('./fn.web').web
const {json, str} = require('./fn.json')

const Acc = require('./data/acc')
const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer.tracker')

const knownPeers = {}
const accountSeeders = {}
const verificationKeys = {}

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

    for (let s in peer.seeds) {
        /** @type {Peer[]} */
        let seeders = accountSeeders[s]

        if (!Array.isArray(seeders))
            continue

        for (let p in seeders) {
            let seeder = seeders[p]

            if (`${seeder.ip}:${seeder.port}` === addr) {
                seeders.splice(p, 1)
                break
            }
        }
    }
}

/**
 * Get verification key
 * @returns {string}
 */
const getVerificationKey = () => {
    /** @type {string} */
    let verificationKey

    do {
        verificationKey = BaseN.encode(Crypt.rand(8))
    } while (typeof verificationKeys[verificationKey] === 'number')

    verificationKeys[verificationKey] = new Date().getMilliseconds()

    return verificationKey
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

/** Web server */
const web = new Web({port: 80})

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
udp.on('message', async (msg, remote) => {
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

        case 'leech':
            /**
             * Search for seeders for the account
             * [1]:string   account public key
             */
            {
                if (typeof message[1] !== 'string')
                    return

                /** @type {Peer[]} */
                let seeders = accountSeeders[message[1]]

                if (!Array.isArray(seeders))
                    return sendEncrypted(peer, str( ['accountNotFound'] ))

                /** @type {string[]} */
                let seedersList = []

                for (let s in seeders) {
                    if (s > 7)
                        break

                    let pick = true
                    let seeder = seeders[Math.floor(Math.random() * seeders.length)]
                    let seederAddress = `${seeder.ip}:${seeder.port}`

                    if (seederAddress === remoteAddress || seeder.lastAccess > __.ACCESS_COOLDOWN)
                        pick = false
                    else {
                        for (let seed of seedersList) {
                            if (seed === seederAddress) {
                                pick = false
                                break
                            }
                        }
                    }

                    if (pick)
                        seedersList.push(seederAddress)
                }

                sendEncrypted(peer, str( ['seeder', message[1], seedersList] ))
                return
            }

        case 'seed':
            /**
             * Tell tracker that I'm seeding this account
             * [1]:string   account public
             */
            {
                if (typeof message[1] !== 'string')
                    return

                if (typeof peer.seeds[message[1]] !== 'undefined')
                    return

                /** @type {Peer[]} */
                let seeders = accountSeeders[message[1]]

                if (typeof seeders === 'undefined'){
                    seeders = []
                    accountSeeders[message[1]] = seeders
                }

                seeders.push(peer)
                peer.seeds[message[1]] = true
                sendEncrypted(peer, str( ['seeding', message[1]] ))
                return
            }

        case 'unseed':
            /**
             * Tell tracker that I'm no longer seed this account
             * [1]:string   account to stop seeding
             */
            {
                if (typeof message[1] !== 'string')
                    return

                if (typeof peer.seeds[message[1]] === 'undefined')
                    return
    
                delete peer.seeds[message[1]]

                /** @type {Peer[]} */
                let seeders = accountSeeders[message[1]]

                if (typeof seeders === 'undefined')
                    return

                for (let s in seeders) {
                    if (seeders[s] === peer) {
                        seeders.splice(s, 1)
                        break
                    }
                }

                sendEncrypted(peer, str( ['unseeding', message[1]] ))
                return
            }

        case 'account':
            /**
             * Download account information from tracker
             * [1]:string   account public key
             */
            {
                if (typeof message[1] !== 'string')
                    return sendEncrypted(peer, ['account-invalid'])

                /** @type {string} */
                let accPub = message[1]
                    
                if (accPub.length > 255)
                    return sendEncrypted(peer, ['account-pub-invalid'])

                if (!Storage.access('acc.' + message[1]))
                    return sendEncrypted(peer, str( ['account-unknown', accPub] ))

                let acc = (await Storage.promise.readBin('acc.' + accPub)).toString('utf-8')

                sendEncrypted(peer, ['account', acc])
                return
            }

        case 'upload':
            /**
             * Upload account to the tracker
             * [1]:string   Account
             * [2]:string   profile image blob
             * [3]:string   cover image blob
             * [4]:string   verification key
             */
            {
                if (typeof message[1] !== 'string' ||
                    typeof message[2] !== 'string' ||
                    typeof message[3] !== 'string' ||
                    typeof message[4] !== 'string')
                    return

                if (typeof verificationKeys[message[4]] !== 'number')
                    return sendEncrypted(peer, ['upload-key-invalid', message[4]])

                let verificationKeyDate = new Date(verificationKeys[message[4]])

                delete verificationKeys[message[4]]

                if (new Date() - verificationKeyDate > 86400000)
                    return sendEncrypted(peer, ['upload-key-expired', message[4]])

                let acc = new Acc(message[1])

                if (!acc.valid)
                    return sendEncrypted(peer, ['upload-account-invalid', acc.key.public])

                /** @type {Buffer} */
                let cover = Return(() => BaseN.decode(message[2], '92'))

                if (!cover)
                    return sendEncrypted(peer, ['upload-cover-invalid', acc.key.public])

                /** @type {Buffer} */
                let profile = Return(() => BaseN.decode(message[3]), '92')

                if (!profile)
                    return sendEncrypted(peer, ['upload-profile-invalid', acc.key.public])

                await Storage.promise.write('acc.' + acc.key.public, acc.exportPub())
                await Storage.promise.writeBin('cover.' + acc.key.public, cover)
                await Storage.promise.writeBin('profile.' + acc.key.public, profile)
                sendEncrypted(peer, str( ['uploaded', message[1]] ))
                return
            }
    }
})

console.log(`Tracker is now on! \n\nPublic key: <${myKey.getPub().toString('base64')}>`)

web.get('/get-key', (req, res) => res.send(getVerificationKey())) // This is just an example, and not designed for production!

module.exports = { getVerificationKey: getVerificationKey }
