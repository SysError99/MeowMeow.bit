// UNSTABLE, NOT TESTED
const Datagram = require('dgram')

const Crypt = require('./fn.crypt')
const Try = require('./fn.try.catch')
const Locale = require('./locale/locale')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer')
const Result = require('./data/result')

/** Peer hole */
const peers = {}

/** List of sending in progress peers*/
const sending = {}

/** @type {Peer[]} List of trackers*/
const trackers = Try(() => {
    /** @type {Array} */
    let trackersLoaded = JSON.parse(require('./fn.storage')(new Locale()).read('trackers').data)
    /** @type {Peer[]} */
    let trackersImported = []

    trackersLoaded.forEach((el, ind) => {
        trackersImported.push(new Peer([
            el.ip,
            el.port,
            el.pub
        ]))
        delete trackersLoaded [ind]
    })
    
    return trackersImported
}, [])

/** @type {RegExp} IP address regular expression*/
const IpRegex = require('./data/ip.regex')

/**
 * @param {Error} err 
 */
const showError = err => err ? console.error(err) : 0

/**
 * @callback RequestFunction Event handler function
 * @param {Peer} peer Peer object
 * @param {any[]} data Data object
 */

/**
 * Handle incoming message from other peers
 * @param {Receiver} pm Peer manager
 * @param {Datagram.Socket} socket Socket to be used
 * @param {Buffer|string} message Incoming message
 * @param {Datagram.RemoteInfo} remote Remote target
 * @returns {Array} If the connection is established, it will return Array
 */
const handleIncomingMessage = (pm, socket, message, remote) => {
    if(message.length === 0) return

    let remoteAddress = `${remote.address}:${remote.port}`
    /** @type {Peer} */
    let peer = peers[remoteAddress]

    if(typeof peer === 'undefined'){
        Try(() => {
            peer = new Peer([
                remote.address,
                remote.port, 
                message,
                new Date().toUTCString()
            ])
            peer.key = pm.key.current.computeSecret(message)
            setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 4000)
            peers[remoteAddress] = peer
        })
        return
    }

    peer.connected = true
    peer.connectedPort = remote.port

    message = peer.key.decrypt(message)

    if(message[0] === '*') Try(() => {
        message = message.slice(1, message.length)
        if(!IpRegex.test(message)) return
        message = message.split(':')
        message[1] = parseInt(message[1])
        /** @type {Buffer} */
        let pubKey
        if(sending[remoteAddress]) pubKey = pm.key.current.get.pub()
        else pubKey = Crypt.rand(32)
        socket.send(pubKey, 0, pubKey.length, message[1], message[0], showError)
    })

    else if(message[0] === ':'){
        if(typeof trackers[remoteAddress] === 'undefined') return
        pm.port = Try(() => parseInt(message.slice(1,message.length)), 0)
    }
    
    else{
        message = Try(() => JSON.parse(peer.key.decrypt(message)), message)
        if(Array.isArray(message)) pm.callback(peer, new Result({
            success: true,
            data: received
        }))
    }
}

/**
 * Retrieve an tracker randomly
 * @returns {Peer} An annoucer
 */
const randTracker = () => trackers[Math.floor(Math.random() * trackers.length)]

/**
 * Peer receiver.
 * @param {RequestFunction} callback Callback to handle server
 */
const Receiver = function(callback){
    /** This object*/
    let _ = this
    /** @type {string} This is 'Receiver' object*/
    this.isPeerManager = true

    /** Locale being used in this object */
    let locale = new Locale()

    /** Receiver socket module*/
    let socket = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })

    /** Storage module*/
    let storage = require('./fn.storage')(locale)

    /** @type {RequestFunction} Callback function for this object */
    this.callback = typeof callback === 'function' ? callback : () => false

    /** Key manager, only used for a receiver*/
    this.key = {
        /** @type {ECDHKey} Currently used key*/
        current: null,
        /**
         * Load key from specific location, if can't, build a new one.
         * @param {string} location Key location
         */
        load: location => {
            let keyRead = storage.read(typeof location === 'string' ? location : __.KEY.LOCATION)
            if(keyRead.success) _.key.current = new ECDHKey(keyRead.data)
            else _.key.new()
        },
        /**
         * Create a new key for this server
         * @param {string} location Asymmetric key location to be saved
         * @param {string} password Passphrase for this key
         */
        new: location => {
            _.key.current = new ECDHKey()
            let keyWrite = storage.write(typeof location === 'string' ? location : __.KEY.LOCATION, _.key.current.export())
            if(!keyWrite.success) throw keyWrite.message
        }
    }

    /** @type {Locale} Locale being used*/
    this.locale = locale

    /** @type {number} Currently used port*/
    this.port = 0

    /**
     * Send message to target
     * @param {Peer} peer Peer to send data to
     * @param {string|Array} message 
     */
    this.send = (peer, message) => {
        let fullAddress = `${peer.ip}:${peer.port}`

        if(sending[fullAddress]) return callback(peer, new Result({
            message: `${peer.ip}:${peer.port} message still in pending`
        }))

        let tracker = randTracker()
        /** @type {Datagram.Socket} */
        let conn
        let date = new Date().toUTCString()
        let encryptedFullAddress

        if(peer.connected){
            conn = peers[fullAddress].socket
            if(Array.isArray(message)) message = JSON.stringify(message)
            Try(() => {
                message = peer.key.encrypt(message)
                conn.send(message, 0, message.length, peer.port, peer.ip, showError)
                delete sending[fullAddress]
            })
            return
        }

        conn = Datagram.createSocket({
            type: 'udp4',
            reuseAddr: true
        })
        conn.on('error', showError)
        conn.on('message', (msg, remote) => handleIncomingMessage(_, conn, msg, remote))
        if(Try(() => encryptedFullAddress = tracker.key.encrypt(fullAddress))) return
        conn.send(
            encryptedFullAddress, 0, encryptedFullAddress.length,
            tracker.port,
            tracker.ip,
            showError
        )

        peer.socket = conn
        peer.lastAccess = date
        tracker.lastAccess = date
        peers[fullAddress] = peer
        peers[`${tracker.ip}:${tracker.port}`] = tracker
        sending[fullAddress] = true

        console.log(`Announcing ${fullAddress}`)

        setTimeout(() => {
            delete sending[fullAddress]
            _.send(peer, message)
        }, 4000)
    }

    socket.on('error', showError)
    socket.on('message', (msg, remote) =>  handleIncomingMessage(_, socket, msg, remote))    

    trackers.forEach(tracker => {
        let myPub = tracker.myPub
        socket.send(
            myPub, 0, myPub.length,
            tracker.port,
            tracker.ip,
            showError
        )
    })

    let findSocketPort = setInterval(() => {
        if(_.port > 0) return clearInterval(findSocketPort)
        let tracker = randTracker()
        socket.send(
            tracker.key.encrypt('?'), 0, 1,
            tracker.port,
            tracker.ip,
            showError
        )
    }, 1000)

    setInterval(() => 
        trackers.forEach(tracker => {
            socket.send(
                '', 0, 0,
                tracker.port,
                tracker.ip,
                showError
            )
        })
    , 4000)
}

if(trackers.length === 0) throw Error('No trackers has been set')

module.exports = Receiver