// UNSTABLE, NOT TESTED
const Datagram = require('dgram')

const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Try = require('./fn.try.catch')
const Locale = require('./locale/locale')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer')
const Result = require('./data/result')

/** @type {Peer[]} List of trackers*/
const trackers = Try(() => {
    /** @type {Array} */
    let trackersLoaded = require('./fn.storage')().read('trackers').data
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
}, null)

if(trackers === null)
    throw Error('No trackers has been set')

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
    if(message.length === 0)
        return

    let remoteAddress = `${remote.address}:${remote.port}`
    let socket = peer.socket

    if(peer.key.isSymmetricKey)
        if(Try(() => message = peer.key.decrypt(message)))
            return
    
    if(peer.isReceiver){ //incoming connection
        peer = receiver.peers[remoteAddress]

        if(typeof peer === 'undefined')
            return Try(() => {
                setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 10000)

                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.connected = true
                peer.key = receiver.key.computeSecret(message)
                
                if(peer.key !== null)
                    receiver.peers[remoteAddress] = peer
            })

        if(typeof trackers[remoteAddress] !== 'undefined') //receive data
            switch(message[0]){ // tracker responses
                case '*': // peer response back
                    message = message.slice(1, message.length)

                    if(!IpRegex.test(message))
                        return

                    message = message.split(':')
                    message[1] = parseInt(message[1])

                    let randomResponse = Crypt.rand(32)
                    socket.send(randomResponse, 0, randomResponse.length, message[1], message[0], showError)
                    return
                case ':': //port set
                    receiver.port = Try(() => parseInt(message.slice(1,message.length)), 0)
                    return
            }
        else{
            message = Try(() => JSON.parse(message))
            if(Array.isArray(message))
                receiver.callback(peer, new Result({
                    success: true,
                    data: received
                }))
        }
    }
    else{
        if(typeof trackers[remoteAddress] !== 'undefined'){ // outgoing connection
            let pubKey = peer.myPub
            socket.send(pubKey, 0, pubKey.length, peer.port, peer.ip, showError)
        }
        else if(remoteAddress === `${peer.ip}:${peer.port}`){
            peer.connected = true
            return true //outgoing connection established
        }
    }
    
}

/**
 * Retrieve a tracker randomly
 * @returns {Peer} An annoucer
 */
const randTracker = () => trackers[Math.floor(Math.random() * trackers.length)]

/**
 * Send message to target
 * @param {Receiver} receiver Receiver object
 * @param {Peer} peer Peer to send data to
 * @param {string|Array|Buffer} message Message to be sent
 */
const sendMessage = (receiver, peer, message) => {
    /** @type {Datagram.Socket} */
    let conn
    let date = new Date()
    let messageSent = false
    let tracker = randTracker()

    if(peer.connected || !peer.nat){
        conn = peer.socket

        if(Array.isArray(message))
            message = JSON.stringify(message)
        else if(typeof message !== 'string')
            return
            
        Try(() => {
            message = peer.key.encrypt(message)
            conn.send(message, 0, message.length, peer.port, peer.ip, showError)
        })
        return
    }

    /** @type {Buffer} */
    let encryptedPeerPub
    if(Try(() => encryptedPeerPub = tracker.key.encrypt(`>${BaseN.encode(peer.pub)}`)))
        return

    conn = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })
    conn.on('error', showError)
    conn.on('message', (msg, remote) => {
        if(handleIncomingMessage(receiver, peer, msg, remote)){
            sendMessage(receiver, peer, message)
            messageSent = true
        }
    })
    conn.send(
        encryptedPeerPub, 0, encryptedPeerPub.length,
        tracker.port,
        tracker.ip,
        showError
    )

    peer.socket = conn
    peer.lastAccess = date
    tracker.lastAccess = date

    console.log(`Announcing ${fullAddress}`)

    setTimeout(() => {
        if(!messageSent)
            sendMessage(receiver, peer, message)
    }, 4000)
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

    /** @type {RequestFunction} Callback function for this object */
    this.callback = typeof callback === 'function' ? callback : () => false

    /** @type {string} This is local IP address to be used with handleIncomingMessage() */
    this.ip = '127.0.0.1'

     /** @type {ECDHKey} Receiver generated key, always brand-new */
    this.key = new ECDHKey()

    /** @type {Locale} Locale being used*/
    this.locale = locale

    /** @type {number} Currently used port*/
    this.port = 0

    /** @type {Peer[]} Connected peers */
    this.peers = {}

    /**
     * Do port forwarding and avoid NAT.
     * @param {number} p Port to forward to
     */
    this.forwardPort = p => {
        let tracker = randTracker()
        let tellPortStr = tracker.key.encrypt(`@${p}`)
        socket.bind(p)
        socket.send(tellPortStr, 0, tellPortStr.length, tracker.port, tracker.ip, showError)
    }

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
        _.peers[t] = tracker
    }

    let askForSocketPort = setInterval(() => {
        if(_.port > 0)
            return clearInterval(askForSocketPort)

        let tracker = randTracker()
        let askForSocketPortPacket = tracker.key.encrypt(`?${BaseN.encode(Crypt.rand(8))}`)
        socket.send(
            askForSocketPortPacket, 0, askForSocketPortPacket,
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
    }, 10000)
}

module.exports = Receiver