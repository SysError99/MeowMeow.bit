// UNSTABLE, NOT TESTED
const Datagram = require('dgram')

const Crypt = require('./fn.crypt')
const Try = require('./fn.try.catch')
const Locale = require('./locale/locale')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer')
const Result = require('./data/result')

/** @type {Peer[]} List of trackers*/
const trackers = Try(() => {
    /** @type {Array} */
    let trackersLoaded = JSON.parse(require('./fn.storage')(new Locale()).read('trackers').data)
    /** @type {Peer[]} */
    let trackersImported = {}

    trackersLoaded.forEach((el, ind) => {
        trackersImported [`${el.ip}:${el.port}`] = new Peer([
            el.ip,
            el.port,
            el.pub,
        ])
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
 * @param {Receiver} receiver Receiver object
 * @param {Peer} peer Peer called
 * @param {Buffer|string} message Incoming message
 * @param {Datagram.RemoteInfo} remote Remote target
 */
const handleIncomingMessage = (receiver, peer, message, remote) => {
    if(message.length === 0) return

    let remoteAddress = `${remote.address}:${remote.port}`
    let socket = peer.socket

    if(peer.isReceiver){
        if(typeof receiver.peers[remoteAddress] === 'undefined')
            return Try(() => {
                setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 4000)
                if(!peer.isPeer){
                    peer = new Peer([
                        remote.address,
                        remote.port, 
                        message,
                        new Date().toUTCString()
                    ])
                }
                peer.connected = true
                remote.peers[remoteAddress] = peer
            })
        else
            peer = receiver.peers[remoteAddress]
    }
    else if(remoteAddress === `${peer.ip}:${peer.port}`){
        peer.connected = true
        return true
    }
    
    if(Try(() => message = peer.key.decrypt(message))) return

    if(typeof trackers[remoteAddress] !== 'undefined')
        switch(message[0]){
            case '*': //start connection
                message = message.slice(1, message.length)
                if(!IpRegex.test(message)) return
                message = message.split(':')
                message[1] = parseInt(message[1])

                /** @type {Buffer} */
                let pubKey
                if(peer.isReceiver)
                    pubKey = Crypt.rand(32) // response back
                else
                    pubKey = receiver.key.current.get.pub() // send temp pub key
                socket.send(pubKey, 0, pubKey.length, message[1], message[0], showError)
                return
            case ':': //port set
                receiver.port = Try(() => parseInt(message.slice(1,message.length)), 0)
                return
        }

    message = Try(() => JSON.parse(message))

    if(Array.isArray(message)) receiver.callback(peer, new Result({
        success: true,
        data: received
    }))

}

/**
 * Retrieve an tracker randomly
 * @returns {Peer} An annoucer
 */
const randTracker = () => trackers[Math.floor(Math.random() * trackers.length)]

/**
 * Send message to target
 * @param {Receiver} receiver Receiver object
 * @param {Peer} peer Peer to send data to
 * @param {string|Array} message Message to be sent
 */
const sendMessage = (receiver, peer, message) => {
    let fullAddress = `${peer.ip}:${peer.port}`
    let tracker = randTracker()
    /** @type {Datagram.Socket} */
    let conn
    let date = new Date()
    let encryptedFullAddress
    let messageSent = false

    if(peer.connected){
        conn = peer.socket
        if(Array.isArray(message)) message = JSON.stringify(message)
        Try(() => {
            message = peer.key.encrypt(message)
            conn.send(message, 0, message.length, peer.port, peer.ip, showError)
        })
        return
    }

    conn = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })
    conn.on('error', showError)
    conn.on('message', (msg, remote) => {
        if(handleIncomingMessage(receiver, peer, msg, remote)) 
            sendMessage(receiver, peer, message)
    })

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

    console.log(`Announcing ${fullAddress}`)

    if(!messageSent) setTimeout(() => sendMessage(receiver, peer, message), 4000)
}

/**
 * Peer receiver.
 * @param {RequestFunction} callback Callback to handle server
 */
const Receiver = function(callback){
    /** This object*/
    let _ = this
    /** @type {string} This is 'Receiver' object*/
    this.isReceiver = true

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

    /** @type {Peer[]} Connected peers */
    this.peers = {}

    /**
     * Send message to target
     * @param {Peer} peer Peer to send data to
     * @param {string|Array} message 
     */
    this.send = (peer, message) => sendMessage(_, peer, message)

    /** Socket from receiver module */
    this.socket = socket

    socket.on('error', showError)
    socket.on('message', (msg, remote) => 
        handleIncomingMessage(_, _, msg, remote))    

    for(t in trackers){
        let tracker = trackers[t]
        let myPub = tracker.myPub
        socket.send(
            myPub, 0, myPub.length,
            tracker.port,
            tracker.ip,
            showError
        )
    }

    let askForSocketPort = setInterval(() => {
        if(_.port > 0) return clearInterval(askForSocketPort)
        let tracker = randTracker()
        socket.send(
            tracker.key.encrypt('?'), 0, 1,
            tracker.port,
            tracker.ip,
            showError
        )
    }, 1000)

    setInterval(() => { 
        for(t in trackers){
            let tracker = trackers[t]
            socket.send(
                '', 0, 0,
                tracker.port,
                tracker.ip,
                showError
            )
        }   
    }, 4000)
}

if(trackers.length === 0) throw Error('No trackers has been set')

module.exports = Receiver