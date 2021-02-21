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

/** @type {RegExp} IP address regular expression*/
const IpRegex = require('./data/ip.regex')

/**
 * Convert JSON string to object or array
 * @param {string} str String to be converted
 * @returns {Array} JSON object
 */
const json = str => JSON.parse(str)

/**
 * @param {Error} err 
 */
const showError = err => err ? console.error(err) : 0

/**
 * Convert JSON object to string
 * @param {Array|Object} obj JSON object
 * @returns {string} 
 */
const str = obj => JSON.stringify(obj)

/**
 * @callback RequestFunction Event handler function
 * @param {Peer} peer Peer object
 * @param {Result} data Data object
 */

/**
 * Retrieve a tracker randomly
 * @param {Receiver} receiver Receiver object
 * @returns {Peer} An annoucer
 */
const randTracker = receiver => receiver.trackers[receiver.trackerList[Math.floor(Math.random() * receiver.trackerList.length)]]

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

    /**
     * Handshake to a tracker
     * @param {Peer} tracker Tracker to be initialized
     */
    let helloTracker = tracker => {
        if(tracker.quality <= 0)
            return false

        let myPub = tracker.myPub

        tracker.quality--
        socket.send(
            myPub, 0, myPub.length,
            tracker.port,
            tracker.ip,
            showError
        )

        return true
    }

    /**
     * Handshake to trackers
     */
    let helloTrackers = () => {
        self.key = new ECDHKey()
        self.peers = {}
        self.trackerList = []
        self.trackers = Try(() => {
            /** @type {Array} */
            let trackersLoaded = require('./fn.storage')().read('trackers').data
            /** @type {Peer[]} */
            let trackersImported = {}
        
            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Peer([
                    el.ip,
                    el.port,
                    el.pub
                ])

                delete trackersLoaded [ind]

                if(newTracker.key === null)
                    return

                let trackerAddress = `${el.ip}:${el.port}`
                trackersImported [trackerAddress] = newTracker
                self.trackerList.push(trackerAddress)
            })
            
            return trackersImported
        }, null)
        
        if(self.trackerList.length === 0)
            throw Error('No trackers has been set')

        for(t in this.trackers){
            /** @type {Peer} */
            let tracker = this.trackers[t]
            helloTracker(tracker)
            this.peers[t] = tracker
        }

        console.log(`Receiver will be known as '${BaseN.encode(this.key.get.pub())}'.`)
    }

    /**
     * Handle socket incoming message
     * @param {Array|Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     */
    let handleSocketMessage = (message, remote) => {
        if(message.length === 0)
            return socket.send('', 0, 0, remote.port, remote.address, showError)

        let remoteAddress = `${remote.address}:${remote.port}`
        /** @type {Peer} */
        let peer = self.peers[remoteAddress]
        let isTracker = typeof self.trackers[remoteAddress] === 'object'

        if(typeof peer === 'undefined')
            return Try(() => {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.key = self.key.computeSecret(message)

                if(peer.key !== null){
                    peer.connected = true
                    self.peers[remoteAddress] = peer
                    socket.send(Crypt.rand(16), 0, 16, remote.port, remote.address, showError)
                }
            })

        if(!isTracker){ //check last access time from peer
            let currentTime = new Date()
            let lastAccess = currentTime - peer.lastAccess
    
            if(peer.lastAccess.getTime() !== 0){
                if(lastAccess <= __.ACCESS_COOLDOWN)
                    return
                else if(lastAccess >= __.LAST_ACCESS_LIMIT){
                    clearInterval(peer.keepAlive)
                    delete self.peers[remoteAddress]
                    handleSocketMessage(message, remote)
                    return 
                }
            }
    
            peer.lastAccess = currentTime
        }

        if(Try(() => message = json(peer.key.decrypt(message))) === null){
            if(isTracker){
                if(!helloTracker(peer))
                    callback(new Result({
                        message: `Can't establish secure connection with trackers. `+
                        `Key may be invalid or connection may be hijacked.` //LOCALE_NEEDED
                    }))
                return 
            }
        }
        else
            peer.quality = __.MAX_TRIAL

        if(isTracker){ // message from tracker
            switch(message[0]){

                //announcer
                case 'announce': // peer response back
                    if(typeof message[1] !== 'string' || typeof message[2] !== 'number')
                        return

                    if(!IpRegex.test(message[1]))
                        return

                    let randomResponse = Crypt.rand(32)
                    socket.send(randomResponse, 0, randomResponse.length, message[2], message[1], showError)
                    return
                
                //tracker
                case 'keyExists':
                    self.key = new ECDHKey()

                case 'welcome':
                    /** @type {Buffer} */
                    let helloMessage
                    if(Try(() => helloMessage = peer.key.encrypt(str( [`hello`, BaseN.encode(self.key.get.pub())] ))) === null)
                        return

                    socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                    return

                case 'hello':
                    peer.keepAlive = setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 10000)
                    return
            }
            return
        }

        if(Array.isArray(message))
            callback(peer, new Result({
                success: true,
                data: message
            }))

    }

    /** @type {RequestFunction} Callback function for this object */
    this.callback = typeof callback === 'function' ? callback : () => false

     /** @type {ECDHKey} Receiver generated key, always brand-new */
    this.key

    /** @type {Locale} Locale being used*/
    this.locale = locale

    /** @type {Peer[]} Connected peers */
    this.peers = {}

    /** @type {Peer} List of all trackers */
    this.trackers = {}

    /** @type {string[]} List of trackers, as array of string to be pointed at this.trackers */
    this.trackerList = []

    /**
     * Do port forwarding and avoid NAT.
     * @param {number} p Port to forward to
     */
    this.forwardPort = p => {
        socket.bind(p)
        for(t in self.trackers){
            /** @type {Peer} */
            let tracker = self.trackers[t]
            let tellPortStr = tracker.key.encrypt(str( [`forwardPort`, p] ))
            socket.send(tellPortStr, 0, tellPortStr.length, tracker.port, tracker.ip, showError)
        }
    }

    /**
     * Send message to target
     * @param {Peer} peer Peer to send data to
     * @param {string|Array|Buffer} data Data to be sent
     */
    this.send = (peer, data) => {
        /** @type {Datagram.Socket} */
        let conn
        let connState = 0
        let messageSendFailed = false
        let messageSendFailedReason = ``
        let tracker = randTracker(self)

        let tempTracker = new Peer([
            tracker.ip,
            tracker.port,
            tracker.pub
        ])

        if(peer.connected){
            conn = peer.socket
    
            if(Array.isArray(data))
                if(Try(() => data = str(data)) === null)
                    return
            
            if(typeof data !== 'string')
                return
                
            Try(() => {
                data = peer.key.encrypt(data)
                conn.send(data, 0, data.length, peer.port, peer.ip, showError)
            })
            
            return
        }

        /**
         * conn.on('message'): Tracker connection
         * @param {Buffer|string} message 
         * @param {Datagram.RemoteInfo} remote 
         */
        let connMessage = (message, remote) => {
            if(message.length === 0)
                return

            let remoteAddress = `${remote.address}:${remote.port}`

            switch(connState){
                case 0:
                    if(typeof self.trackers[remoteAddress] === 'undefined')
                        return
                
                    if(Try(() => message = json(tempTracker.key.decrypt(message))) === null)
                        return
        
                    if(message[0] === 'welcome'){
                        let announceMessage = tempTracker.key.encrypt(str( [`announce`, BaseN.encode(peer.pub)] ))
                        conn.send(announceMessage, 0, announceMessage.length, tempTracker.port, tempTracker.ip, showError)
                        connState = 1
                    }
                    else{
                        messageSendFailed = true
                        messageSendFailedReason = `Communication interrupted` //LOCALE_NEEDED
                        return
                    }

                    return
                case 1:
                    /** @type {Peer} */
                    let tracker = self.trackers[remoteAddress]
                
                    if(typeof tracker === 'object'){ // outgoing connection
                        if(Try(() => message = json(tempTracker.key.decrypt(message))) === null){
                            messageSendFailed = true
                            messageSendFailedReason = `Decryption from tracker failed.` //LOCALE_NEEDED
                            return
                        }
                
                        if(message[0] === 'tooOld'){
                            messageSendFailed = true
                            messageSendFailedReason = `Peer is outdated.` //LOCALE_NEEDED
                            return
                        }
                
                        if(message[0] === 'unknown'){
                            messageSendFailed = true
                            messageSendFailedReason = `Tracker does not know specified peer` //LOCALE_NEEDED
                            return
                        }
        
                        if(!IpRegex.test(message[0]) || typeof message[1] !== 'number'){
                            messageSendFailed = true
                            messageSendFailedReason = `Invalid target address from tracker` //LOCALE_NEEDED
                            return
                        }
        
                        peer.ip = message[0]
                        peer.port = message[1]
                        
                        conn.send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
                    }
                    else if(remoteAddress === `${peer.ip}:${peer.port}`){
                        peer.connected = true
                        self.send(peer, data)
                    }

                    return
            }
        }

        conn = Datagram.createSocket({
            type: 'udp4',
            reuseAddr: true
        })
        conn.on('error', showError)
        conn.on('message', connMessage)
        peer.socket = conn

        if(!peer.nat){
            connState = 1
            conn.send(
                peer.myPub, 0, peer.myPub.length,
                peer.port,
                peer.ip,
                showError
            )
            return
        }

        //conn.on('message', (message, remote) => connMessage_tracker(message,remote))
        conn.send(
            tempTracker.myPub, 0, tempTracker.myPub.length,
            tempTracker.port,
            tempTracker.ip,
            showError
        )

        setTimeout(() => {
            peer.quality--

            if(peer.quality <= 0){
                delete self.peers[`${peer.ip}:${peer.port}`]
                callback(null, new Result({
                    message: `Connection to peer '${BaseN.encode(peer.pub)}' timed out.` //LOCALE_NEEDED
                }))
                return
            }
            else if(messageSendFailed)
                return callback(null, new Result({
                    message: `Message to '${BaseN.encode(peer.pub)}' failed to send due to: ${messageSendFailedReason}` //LOCALE_NEEDED
                }))
            else if(!peer.connected)
                self.send(peer, data)

        }, 4000)
    }

    /** Socket from receiver module */
    this.socket = socket

    socket.on('error', showError)
    socket.on('message', handleSocketMessage)    

    helloTrackers()
}

module.exports = Receiver