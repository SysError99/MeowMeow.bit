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

    let storage = require('./fn.storage')(locale)

    /**
     * Add peer to peer list
     * @param {Peer} peer Peer to be added
     * @returns {boolean} Did peer been added?
     */
    let addPeer = peer => {
        let remoteAddress = `${peer.ip}:${peer.port}`
        if(typeof self.peers[remoteAddress] === 'undefined'){
            self.peers[remoteAddress] = peer
            return true
        }
        return false
    }

    /**
     * Delete a peer from known list
     * @param {Peer} peer Peer to delete
     */
    let deletePeer = peer => {
        let remoteAddress = `${peer.ip}:${peer.port}`
        peer.connected = false

        if(peer.keepAlive !== null){
            clearInterval(peer.keepAlive)
            peer.keepAlive = null
        }

        if(typeof self.peers[remoteAddress] === 'object')
            delete self.peers[remoteAddress]
    }

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
            let trackersLoaded = storage.read('trackers').data
            /** @type {Peer[]} */
            let trackersImported = {}
        
            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Peer([
                    el.ip,
                    el.port,
                    el.pub
                ])
                newTracker.socket = socket

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
     * @param {Peer} _peer (optional)
     * @returns {Promise<void>}
     */
    let handleSocketMessage = async (message, remote, _peer) => {
        let remoteAddress = `${remote.address}:${remote.port}`
        /** @type {Peer} */
        let peer = typeof _peer === 'object' ? _peer : self.peers[remoteAddress]

        if(typeof peer === 'undefined')
            return Try(() => {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.key = self.key.computeSecret(message)

                if(peer.key !== null){
                    addPeer(peer)
                    peer.socket = socket
                    peer.connected = true
                    let helloMessage = peer.key.encrypt(str(`[""]`))
                    peer.socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                }
                else
                    peer.socket.send(Crypt.rand(22), 0, 22, remote.port, remote.address, showError)
            })

        if(message.length === 0){
            peer.mediaStreamReady = true
            return
        }

        let isTracker = typeof self.trackers[remoteAddress] === 'object'

        if(!isTracker){ //check last access time from peer
            if(peer.mediaStream !== null){
                message = peer.key.decrypt(message)

                if(message[0] === __.EOF){
                    peer.mediaStream.close()
                    peer.mediaStream = null
                    return
                }
 
                if(peer.mediaStreamBytesReceived > __.MAX_PAYLOAD){
                    peer.mediaStream.close()
                    peer.mediaStream = null
                    storage.remove(peer.mediaStreamLocation)
                    return
                }

                peer.mediaStream.write(message, showError)
                peer.mediaStreamBytesReceived += message.length
                peer.socket.send('', 0, 0, remote.port, remote.address, showError)
                return
            }

            let currentTime = new Date()
            let lastAccess = currentTime - peer.lastAccess
    
            if(peer.lastAccess.getTime() !== 0){
                if(lastAccess <= __.ACCESS_COOLDOWN)
                    return
                else if(lastAccess >= __.LAST_ACCESS_LIMIT){
                    deletePeer(peer)
                    handleSocketMessage(message, remote)
                    return 
                }
            }
        }

        if(Try(() => message = json(peer.key.decrypt(message))) === null){
            if(isTracker){
                if(!helloTracker(peer))
                    callback(new Result({
                        message: `Can't establish secure connection with trackers. `+
                        `Key may be invalid or connection may be hijacked.` //LOCALE_NEEDED
                    }))
            }
            else{
                deletePeer(peer)
                handleSocketMessage(message, remote)
            }
            return
        }
        else
            peer.quality = __.MAX_TRIAL

        if(!Array.isArray(message))
            return

        if(isTracker){ // message from tracker
            switch(message[0]){

                //announcer
                case 'announce': // peer response back
                    if(typeof message[1] !== 'string' || typeof message[2] !== 'number')
                        return

                    if(!IpRegex.test(message[1]))
                        return

                    let randomResponse = Crypt.rand(32)
                    peer.socket.send(randomResponse, 0, randomResponse.length, message[2], message[1], showError)
                    return
                
                //tracker
                case 'keyExists':
                    self.key = new ECDHKey()

                case 'welcome':
                    /** @type {Buffer} */
                    let helloMessage
                    if(Try(() => helloMessage = peer.key.encrypt(str( [`hello`, BaseN.encode(self.key.get.pub())] ))) === null)
                        return

                    peer.socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                    return

                case 'hello':
                    peer.keepAlive = setInterval(() => peer.socket.send('', 0, 0, remote.port, remote.address, showError), 10000)
                    return
            }
            return
        }

        callback(peer, new Result({
            success: true,
            data: message
        }))

    }

    /**
     * Initialize connection for the target
     * @param {Peer} peer Peer to initialize connection
     * @returns {Promise<boolean>} Is connection successfully established?
     */
    let initializeConnection = peer => new Promise(resolve => {
        /** @type {Datagram.Socket} */
        let conn
        let connState = 0
        let tracker = randTracker(self)
        let targetPub = BaseN.encode(peer.pub)

        let tempTracker = new Peer([
            tracker.ip,
            tracker.port,
            tracker.pub
        ])

        if(peer.connected)
            return resolve(true)

        /**
         * conn.on('message'): Tracker connection
         * @param {Buffer|string} message 
         * @param {Datagram.RemoteInfo} remote 
         */
        let connMessage = (message, remote) => {
            if(connState === 2)
                handleSocketMessage(message, remote, peer)

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
                        let announceMessage = tempTracker.key.encrypt(str( [`announce`, targetPub] ))
                        conn.send(announceMessage, 0, announceMessage.length, tempTracker.port, tempTracker.ip, showError)
                        connState = 1
                        return 1
                    }
                    else{
                        callback(new Result({
                            message: `${targetPub} connection is interrupetd` //LOCALE_NEEDED
                        }))
                        peer.quality = 0
                    }
                    return

                case 1:
                    /** @type {Peer} */
                    let tracker = self.trackers[remoteAddress]
                
                    if(typeof tracker === 'object'){ // outgoing connection
                        if(Try(() => message = json(tempTracker.key.decrypt(message))) === null){
                            peer.quality = 0
                            callback(new Result({
                                message:`${targetPub} decryption from tracker failed.` //LOCALE_NEEDED
                            }))
                            return
                        }
                
                        if(message[0] === 'tooOld'){
                            peer.quality = 0
                            callback(new Result({
                                message:`${targetPub} is outdated.` //LOCALE_NEEDED
                            }))
                            return
                        }
                
                        if(message[0] === 'unknown'){
                            peer.quality = 0
                            callback(new Result({
                                message: `${targetPub} is unknown by a tracker.` //LOCALE_NEEDED
                            }))
                            return
                        }
        
                        if(!IpRegex.test(message[0]) || typeof message[1] !== 'number'){
                            peer.quality = 0
                            callback(new Result({
                                message: `Tracker ${BaseN.encode(tempTracker.myPub)} had sent an invalid address.` //LOCALE_NEEDED
                            }))
                            return
                        }
        
                        peer.ip = message[0]
                        peer.port = message[1]
                        
                        conn.send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
                    }
                    else if(remoteAddress === `${peer.ip}:${peer.port}`){
                        if(Try(() => message = json(peer.key.decrypt(message))) === null && peer.connected){
                            deletePeer(peer)
                            initializeConnection(peer)
                            return
                        }

                        peer.quality = __.MAX_TRIAL
                        peer.connected = true

                        addPeer(peer)
                        resolve(true)
                        connState = 2
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

        conn.send(
            tempTracker.myPub, 0, tempTracker.myPub.length,
            tempTracker.port,
            tempTracker.ip,
            showError
        )

        setTimeout(() => {
            if(peer.quality <= 0)
                return resolve(false)

            peer.quality--
            initializeConnection(peer)
        }, 4000)
    })


    /** @type {RequestFunction} Callback function for this object */
    this.callback = typeof callback === 'function' ? callback : () => false

     /** @type {ECDHKey} Receiver generated key, always brand-new */
    this.key

    /** @type {Locale} Locale being used*/
    this.locale = locale

    /** @type {Peer[]} Connected peers */
    this.peers = {}

    /** Storage being used */
    this.storage = storage

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
     * @param {Peer|string} peer Peer to send data to
     * @param {string|Array|Buffer} data Data to be sent
     * @returns {Promise<boolean>} Is the connection successfully established?
     */
    this.send = async (peer, data) => {
        if(Array.isArray(data))
            if(Try(() => data = str(data)) === null)
                return false
        
        if(typeof data !== 'string')
            return false

        if(typeof peer === 'string'){
            /** @type {string} */
            let peerStr = peer
            peer = self.peers[peerStr]

            if(typeof peer === 'undefined')
                peer = new Peer(['', 0, peerStr])
        }
        
        if(!peer.connected){
            if(!await initializeConnection(peer))
                return false
        }

        Try(() => {
            let conn = peer.socket
            data = peer.key.encrypt(data)
            conn.send(data, 0, data.length, peer.port, peer.ip, showError)
        })

        return true
    }

    /** Socket from receiver module */
    this.socket = socket

    socket.on('error', showError)
    socket.on('message', handleSocketMessage)    

    helloTrackers()
}

module.exports = Receiver