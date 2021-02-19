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
 * Convert JSON object to string
 * @param {Array|Object} obj JSON object
 */
const str = obj => JSON.stringify(obj)

/**
 * @callback RequestFunction Event handler function
 * @param {Peer} peer Peer object
 * @param {any[]} data Data object
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
     * Ask trackers to find running port
     */
    let askForSocketPort = setInterval(() => {
        if(self.port > 0)
            return clearInterval(askForSocketPort)

        let tracker = randTracker(self)
        let askForSocketPortPacket = tracker.key.encrypt(`:${BaseN.encode(Crypt.rand(8))}`)
        socket.send(
            askForSocketPortPacket, 0, askForSocketPortPacket,
            tracker.port,
            tracker.ip,
            showError
        )
    }, 1000)

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
                newTracker.portAnnouncer = el.portAnnouncer

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

    /**
     * Handle socket incoming message
     * @param {Array|Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     */
    let handleSocketMessage = (message, remote) => {
        if(message.length === 0)
            return

        let remoteAddress = `${remote.address}:${remote.port}`
        /** @type {Peer} */
        let peer = self.peers[remoteAddress]
        let isTracker = typeof self.trackers[remoteAddress] !== 'undefined'

        if(typeof peer === 'undefined')
            return Try(() => {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.key = self.key.computeSecret(message)

                if(peer.key !== null){
                    peer.connected = true
                    peer.keepAlive = setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError), 8000)
                    self.peers[remoteAddress] = peer
                }
            })

        if(!isTracker){
            //check last access time from peer
            let currentTime = new Date()
            let lastAccess = currentTime - peer.lastAccess
    
            if(peer.lastAccess.getTime() !== 0){
                if(lastAccess <= __.ACCESS_COOLDOWN)
                    return
                else if(lastAccess >= __.LAST_ACCESS_LIMIT){
                    clearInterval(peer.keepAlive)
                    delete self.peers[remoteAddress]
                    return handleSocketMessage(message, remote)
                }
            }
    
            peer.lastAccess = currentTime
        }

        if(Try(() => message = peer.key.decrypt(message)) === null)
            return

        if(isTracker){ // message from tracker
            let cmd = message[0]
            message = message.slice(1, message.length)

            switch(cmd){
                //announcer
                case '*': // peer response back
                    if(!IpRegex.test(message))
                        return

                    let randomResponse = Crypt.rand(32)
                    let responseAddress = ipExtract(message)
                    socket.send(randomResponse, 0, randomResponse.length, responseAddress.port, responseAddress.ip, showError)
                    return

                //tracker
                case '[': //array type
                    if(Try(() => message = JSON.parse('[' +message)) === null)
                        return

                    if(Array.isArray(message))
                        switch(message[0]){
                            case 'welcome': //tracker connected
                                /** @type {Buffer} */
                                let helloMessage
                                if(Try(() => helloMessage = peer.key.encrypt(str( [`hello`, BaseN.encode(self.key.get.pub())] ))) === null)
                                    return
            
                                socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                                peer.keepAlive = setInterval(() => socket.send('', 0, 0, remote.port, remote.address, showError))
                                return
                        }
                    return

                default: //tracker told to send pub again
                    return helloTrackers()
            }
        }

        if(Try(() => message = JSON.parse(message)) === null)
            return

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
        let tracker = randTracker(self)
        let tellPortStr = tracker.key.encrypt(`@${p}`)
        socket.bind(p)
        socket.send(tellPortStr, 0, tellPortStr.length, tracker.port, tracker.ip, showError)
    }

    /**
     * Send message to target
     * @param {Peer} peer Peer to send data to
     * @param {string|Array} message 
     */
    this.send = (peer, message) => {
        /** @type {Datagram.Socket} */
        let conn
        let messageSendFailed = false
        let messageSendFailedReason = ``
        let tracker = randTracker(self)
    
        if(peer.connected || !peer.nat){
            conn = peer.socket
    
            if(Array.isArray(message))
                if(Try(() => message = str(message)) === null)
                    return
            
            if(typeof message !== 'string')
                return
                
            Try(() => {
                message = peer.key.encrypt(message)
                conn.send(message, 0, message.length, peer.port, peer.ip, showError)
            })
            
            return
        }

        /**
         * conn.on('message'): Tracker connection
         * @param {Buffer|string} message 
         * @param {Datagram.RemoteInfo} remote 
         */
        let connMessage_tracker = (message, remote) => {
            if(message.length === 0)
                return
        
            if(typeof self.trackers[`${remote.address}:${remote.port}`] === 'undefined')
                return
            
            message = tracker.key.decrypt(message)
            
            if(message[0] === '+')
                conn.on('message', (message, remote) => connMessage_announce(message,remote))
        }

        /**
         * conn.on('message'): Tracker announcemnt
         * @param {Buffer|string} message 
         * @param {Datagram.RemoteInfo} remote 
         */
        let connMessage_announce = (message, remote) => {
            if(message.length === 0)
                return
    
            let remoteAddress = `${remote.address}:${remote.port}`
            
            /** @type {Peer} */
            let tracker = self.trackers[remoteAddress]
        
            if(typeof tracker === 'object'){ // outgoing connection
                if(Try(() => message = tracker.key.decrypt(message)) === null)
                    return conn.close(() => {
                        messageSendFailed = true
                        messageSendFailedReason = `Decryption from tracker failed.` //LOCALE_NEEDED
                    })
        
                if(message[0] === '-')
                    return conn.close(() => {
                        messageSendFailed = true
                        messageSendFailedReason = `Peer is outdated.` //LOCALE_NEEDED
                    })
        
                if(message[0] === '!')
                    return conn.close(() => {
                        messageSendFailed = true
                        messageSendFailedReason = `Tracker told 'Connection timed out'`
                    })
        
                if(message[0] === '?')
                    return conn.close(() => {
                        messageSendFailed = true
                        messageSendFailedReason = `Tracker does not know specified peer`
                    })
        
                if(!IpRegex.test(message))
                    return conn.close(() => {
                        messageSendFa
                    })
        
                let pubKey = peer.myPub
                let responseAddress = ipExtract(message)
        
                peer.ip = responseAddress.ip
                peer.port = responseAddress.port
                
                conn.send(pubKey, 0, pubKey.length, peer.port, peer.ip, showError)
            }
            else if(remoteAddress === `${peer.ip}:${peer.port}`){
                peer.connected = true
                self.send(peer,message)
            }
        }
    
        conn = Datagram.createSocket({
            type: 'udp4',
            reuseAddr: true
        })
        conn.on('error', showError)
        conn.on('message', (message, remote) => connMessage_tracker(message,remote))

        conn.send(
            peer.myPub, 0, peer.myPub.length,
            tracker.portAnnouncer,
            tracker.ip,
            showError
        )
    
        peer.socket = conn

        console.log(`Announcing ${peer.ip}:${peer.port}`)

        setTimeout(() => {
            peer.quality--

            if(peer.quality <= 0)
                return conn.close(() => {
                    delete self.peers[`${peer.ip}:${peer.port}`]
                    callback(null, new Result({
                        message: `Connection to peer '${BaseN.encode(peer.pub)}' timed out.` //LOCALE_NEEDED
                    }))
                })
            else if(messageSendFailed)
                return conn.close(() => {
                    callback(null, new Result({
                        message: `Message to '${BaseN.encode(peer.pub)}' failed to send due to: ${messageSendFailedReason}` //LOCALE_NEEDED
                    }))
                })
            else if(!peer.connected)
                self.send(peer, message)

        }, 4000)
    }

    /** Socket from receiver module */
    this.socket = socket

    socket.on('error', showError)
    socket.on('message', handleSocketMessage)    

    helloTrackers()

    setInterval(() => { 
        for(t in self.trackers){
            let tracker = self.trackers[t]
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