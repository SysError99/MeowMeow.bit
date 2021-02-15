// UNSTABLE, NOT TESTED
const Datagram = require('dgram')

const __ = require('./const')
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
 * Extract IP address to array of ip address
 * @param {string|string[]} message message to be extracted
 * @returns {{ip:string,port:number}} IP and port
 */
const ipExtract = message => {
    message = message.split(':')
    return {
        ip: message[0],
        port: parseInt(message[1])
    }
}

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
 * @param {Peer|Receiver} peer Peer called
 * @param {Buffer|string} message Incoming message
 * @param {Datagram.RemoteInfo} remote Remote target
 */
const handleIncomingMessage = (receiver, peer, message, remote) => {
    if(message.length === 0)
        return 'emptyMessage'

    let remoteAddress = `${remote.address}:${remote.port}`
    let socket = peer.socket
    
    if(peer.isPeer){ //incoming connection
        /** @type {Peer} */
        let tracker = trackers[remoteAddress]

        if(typeof tracker === 'object'){ // outgoing connection
            if(Try(() => message = tracker.key.decrypt(message)))
                return 'decryptErr'

            if(message[0] === '-') //peer is too old
                return 'tooOld'

            if(message[0] === '!')
                return 'timeOut'

            if(message[0] === '?')
                return 'unknownPeer'

            if(!IpRegex.test(message))
                return 'ipRegexErr'

            let pubKey = peer.myPub
            let responseAddress = ipExtract(message)

            peer.ip = responseAddress.ip
            peer.port = responseAddress.port
            
            socket.send(pubKey, 0, pubKey.length, peer.port, peer.ip, showError)
        }
        else if(remoteAddress === `${peer.ip}:${peer.port}`){
            peer.connected = true
            return 'connected' //outgoing connection established
        }
    }
    else{
        peer = receiver.peers[remoteAddress]

        if(typeof peer === 'undefined')
            return Try(() => {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.key = receiver.key.computeSecret(message)

                if(peer.key !== null){
                    peer.connected = true
                    peer.keepAlive = setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 10000)
                    receiver.peers[remoteAddress] = peer
                }
            })
        
        let deltaTime = new Date() - peer.lastAccess

        if(deltaTime < 20000 && !__.TEST)
            return 'peerTooFast'
        else if(deltaTime > __.LAST_ACCESS_LIMIT){
            clearInterval(peer.keepAlive)
            delete receiver.peers[remoteAddress]
            return handleIncomingMessage(receiver,peer, message, remote)
        }

        if(Try(() => message = peer.key.decrypt(message)))
            return 'peerDecryptErr'

        if(typeof trackers[remoteAddress] !== 'undefined'){ //receive data
            let cmd = message[0]
            message = message.slice(1, message.length)

            switch(cmd){ // tracker responses
                case '*': // peer response back
                    if(!IpRegex.test(message))
                        return 'trackerIpRegexErr'

                    let randomResponse = Crypt.rand(32)
                    let responseAddress = ipExtract(message)
                    socket.send(randomResponse, 0, randomResponse.length, responseAddress.port, responseAddress.ip, showError)
                    return

                case ':': //port set
                    receiver.port = Try(() => parseInt(message.slice(1,message.length)), 0)
                    return

                default: //tracker told to send pub again
                    return receiver.sendPubToTrackers()
            }
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
        let connectionResponse = handleIncomingMessage(receiver, peer, msg, remote)

        switch(connectionResponse){
            case 'connected':
                sendMessage(receiver, peer, message)
                messageSent = true
                return

            case 'decryptErr':
            case 'ipRegexError':
            case 'timeOut':
            case 'tooOld':
            case 'unknownPeer':
                peer.quality = 0
                return
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
        peer.quality--

        if(peer.quality <= 0)
            delete receiver.peers[`${peer.ip}:${peer.port}`]
        else if(!messageSent)
            sendMessage(receiver, peer, message)
    }, 4000)
}

/**
 * Peer receiver.
 * @param {RequestFunction} callback Callback to handle server
 */
const Receiver = function(callback){
    /** This object*/
    let self = this
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
    this.key

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
    this.send = (peer, message) => sendMessage(self, peer, message)

    /**
     * Send public key to trackers
     */
    this.sendPubToTrackers = () => {
        self.key = new ECDHKey()

        for(t in trackers){
            let tracker = trackers[t]
            let myPub = tracker.myPub
            socket.send(
                myPub, 0, myPub.length,
                tracker.port,
                tracker.ip,
                showError
            )
            this.peers[t] = tracker
        }

        console.log(`Receiver will be known as '${BaseN.encode(this.key.get.pub())}'.`)
    }

    /** Socket from receiver module */
    this.socket = socket

    socket.on('error', showError)
    socket.on('message', (msg, remote) => handleIncomingMessage(self, self, msg, remote))    

    let askForSocketPort = setInterval(() => {
        if(self.port > 0)
            return clearInterval(askForSocketPort)

        let tracker = randTracker()
        let askForSocketPortPacket = tracker.key.encrypt(`:${BaseN.encode(Crypt.rand(8))}`)
        socket.send(
            askForSocketPortPacket, 0, askForSocketPortPacket,
            tracker.port,
            tracker.ip,
            showError
        )
    }, 1000)

    this.sendPubToTrackers()

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