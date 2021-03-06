const Datagram = require('dgram')

const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Try = require('./fn.try.catch')
const Locale = require('./locale/locale')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer')
const Result = require('./data/result')
const Tracker = require('./data/tracker')

/** @type {number} Current time in real-time (milliseconds)*/
let currentTime = new Date().getTime()

setInterval(() => currentTime = new Date().getTime(), 1000)

/** @type {RegExp} IP address regular expression*/
const IpRegex = require('./data/ip.regex')

/** Account seeders, contains string[] of seeder peers (shares across all receivers)*/
const seeders = {}

/** Position of this peer, on peer seeders (shares across all receivers)*/
const seedersMyPos = {}

/** For storing seeder update status, to check if it needs to be sorted again (shares across all receivers)*/
const seedersSorted = {}

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
 * @returns {Tracker} An annoucer
 */
const randTracker = receiver => receiver.peers[receiver.trackerList[Math.floor(Math.random() * receiver.trackerList.length)]]

/** Peer receiver */
const Receiver = class {
    /** @type {string} This is 'Receiver' object*/
    isReceiver = true

    /** @type {RequestFunction} Callback function for this object */
    callback = () => false

    /** @type {ECDHKey} Receiver generated key, always brand-new */
    key = new ECDHKey()

    /** Locale being used in this object */
    locale = new Locale()

    /** @type {string} My public key */
    myPub = BaseN.encode(this.key.getPub(), '62')

    /** @type {Peer[]} Connected peers */
    peers = {}

    /** Receiver socket module*/
    socket = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })

    /** @type {Datagram.Socket[]} List of all sockets*/
    sockets = [this.socket]

    /** Storage module */
    storage = require('./fn.storage')(this.locale)

    /** @type {string[]} List of trackers as "ip:port" */
    trackerList = []

    /**
     * Add peer to known list
     * @param {Peer} peer Peer to be added
     * @returns {boolean} Did peer been added?
     */
    addPeer (peer) {
        let remoteAddress = `${peer.ip}:${peer.port}`

        if(typeof this.peers[remoteAddress] === 'undefined'){
            this.peers[remoteAddress] = peer

            let remotePub = BaseN.encode(peer.pub, '62')

            if(typeof this.peers[remotePub] === 'undefined')
                this.peers[remotePub] = peer

            return true
        }

        return false
    }

    /**
     * Broadcast data to certain amount of peers
     * @param {string} account Account
     * @param {number} n Amount of peers to broadcast
     * @param {Array|string} data Data to be sent
     */
    broadcast (account, n, data) {
        if(n <= 0)
            return false

        /** @type {string[]} */
        let peers = seeders[account]

        if(!Array.isArray(peers))
            return false

        if(Array.isArray(data))
            data = str(data)
        else if(typeof data !== 'string')
            return false

        if(data.length > __.MTU)
            return false

        if(!seedersSorted[account]){
            let x = 0
            let y = 0

            peers.sort()

            //find self position
            while(y < peers.length){
                let arr = peers[y]

                if(arr[0] === account[0])
                    break

                y++
            }

            x = 1

            while(y < peers.length){
                let arr = peers[y]

                if(arr[x] === account[x]){
                    if(x < account.length)
                        x++
                    else
                        break
                }
                else
                    y++
            }

            if(y < peers.length)
                seedersMyPos[account] = y
            else{
                peers.push(this.myPub)
                return this.broadcast(account, n, data)
            }

            seedersSorted[account] = true
        }

        /** @type {string[]} */
        let peersSelected = []
        let peerToAdd = ''
        let pos = 0

        while(n > 0){
            if(p > 0)
                pos = - Math.abs(pos)
            else
                pos =  Math.abs(pos) + 1

            peerToAdd = array[y + pos]

            if(typeof str === 'string')
                peersSelected.push(peerToAdd)

            n--
        }

        while(peersSelected.length > 0){
            this.send(peersSelected[0], data)
            peersSelected.splice(0,1)
        }

        return true
    }

    /**
     * Delete a peer from known list
     * @param {Peer} peer Peer to delete
     */
    deletePeer (peer) {
        let remoteAddress = `${peer.ip}:${peer.port}`
        let remotePub = BaseN.encode(peer.pub, '62')

        if(peer.mediaStream !== null){
            peer.mediaStream.close()
            this.storage.remove(peer.mediaStreamLocation)
        }

        if(typeof this.peers[remoteAddress] === 'object')
            delete this.peers[remoteAddress]

        if(typeof this.peers[remotePub] === 'object')
            delete this.peers[remotePub]
    }

    /**
     * Do port forwarding and avoid NAT.
     * @param {number} p Port to forward to
     */
    forwardPort (p) {
        this.socket.bind(p)
        for(let t in this.trackerList){
            /** @type {Tracker} */
            let tracker = this.peers[this.trackerList[t]]
            let tellPortStr = tracker.key.encrypt(str( [`forwardPort`, p] ))

            this.socket.send(tellPortStr, 0, tellPortStr.length, tracker.port, tracker.ip, showError)
        }
    }

    /**
     * Handshake to a tracker
     * @param {Tracker} tracker Tracker to be initialized
     * @param {number} sock Number of socket number to be used
     */
    helloTracker (tracker, sock) {
        let myPub = tracker.myPubs[sock]

        this.sockets[sock].send(
            myPub, 0, myPub.length,
            tracker.port,
            tracker.ip,
            showError
        )
    }

    /**
     * Handle socket incoming message
     * @param {Array|Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     * @param {number} sock socket number
     * @returns {Promise<void>}
     */
    async handleSocketMessage (message, remote, sock) {
        /** @type {Peer|Tracker} */
        let peer = this.peers[`${remote.address}:${remote.port}`]

        console.log(message.length)

        if(typeof peer === 'undefined'){
            if(message.length !== Crypt.ecdh.length)
                return 

            let computeKey = this.key.computeSecret(message)

            if(computeKey !== null){
                let helloMessage = computeKey.encrypt(str( ['nice2meetu'] ))

                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.isSender = true
                peer.key = computeKey
                this.addPeer(peer)
                this.sockets[sock].send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
            }
            else
                this.sockets[sock].send(Crypt.rand(22), 0, 22, remote.port, remote.address, showError)

            return 
        }

        if(peer.isPeer)
            return this.handlePeerMessage(message, remote, sock, peer)
            
        if(peer.isTracker)
            return this.handleTrackerMessage(message, remote, sock, peer)
    }

    /**
     * Handle Message have sent from peers
     * @param {string} message Encrypted message received
     * @param {Datagram.RemoteInfo} remote Remote info
     * @param {number} sock Socket number
     * @param {Peer} peer Peer sent this
     */
    handlePeerMessage (message, remote, sock, peer) {
        if(message.length === 0){
            if(peer.isSender)
                this.sockets[sock].send('', 0, 0, remote.port, remote.address, showError)

            peer.lastAccess = currentTime
            return
        }

        if(!peer.isSender){
            if(!peer.connected()){
                if(Try(() => json(peer.key.decrypt(message))) === null)
                    return

                // NAT transversal successful
                if(typeof peer.callback === 'function'){
                    peer.callback()
                    peer.callback = null
                }

                this.startPolling(peer, sock)
                return
            }
        }

        if(peer.mediaStream !== null){
            if(Try(() => message = peer.key.decrypt(message)) === null)
                return this.handleBadPeer(message, remote, sock, peer)

            if(message[0] === __.EOF){
                peer.mediaStream.close()
                peer.mediaStream = null

                let mediaLocation = peer.mediaStreamLocation.split('.')
                // [ <owner>, <post-number>, 'media', <media-number> ]
                // TODO: continue verifying file
                return
            }

            if(peer.mediaStreamPacketsReceived > __.MAX_PAYLOAD){
                peer.mediaStream.close()
                peer.mediaStream = null
                this.storage.remove(peer.mediaStreamLocation)
                return this.handleBadPeer(message, remote, sock, peer)
            }

            let okMessage = peer.key.encrypt(str( [``] ))
            peer.mediaStream.write(message, showError)
            peer.mediaStreamPacketsReceived += message.length
            this.sockets[sock].send(okMessage, 0, okMessage.length, remote.port, remote.address, showError)
            return
        }

        //check last access time from peer
        if(peer.lastAccess !== 0){
            let lastAccess = currentTime - peer.lastAccess

            if(lastAccess <= __.ACCESS_COOLDOWN)
                return
            else if(lastAccess >= __.LAST_ACCESS_LIMIT)
                return this.handleBadPeer(message, remote, sock, peer)
        }

        peer.lastAccess = currentTime

        if(Try(() => message = json(peer.key.decrypt(message))) === null)
            return this.handleBadPeer(message, remote, sock, peer)

        if(!Array.isArray(message))
            return this.handleBadPeer(message, remote, sock, peer)

        if(message[0] === ''){
            if(typeof peer.mediaStreamReady === 'function'){
                peer.mediaStreamReady()
                peer.mediaStreamReady = null
            }
            return
        }

        this.callback(peer, new Result({
            success: true,
            data: message
        }))
    }

    /**
     * Handle messages from tracker
     * @param {string} message Message received
     * @param {Datagram.RemoteInfo} remote Remote Info
     * @param {number} sock Socket number
     * @param {Tracker} tracker Tracker have sen message
     */
    handleTrackerMessage (message, remote, sock, tracker) {
        if(Try(() => message = json(tracker.keys[sock].decrypt(message))) === null){
            let trackerPub = tracker.myPubs[sock]

            this.sockets[sock].send(trackerPub, 0, trackerPub.length, tracker.port, tracker.address, showError)
            return
        }

        /**
         * Tracker section
         * 
         * [0]:string tracker command
         */
        switch(message[0]){

            //announcer
            case 'unknown':
                /**
                 * Tracker told this peer is unknown
                 */

                this.callback(null, new Result({
                    message: `Peer ${message[1]} is unknown.` //LOCALE_NEEDED
                }))
                return

            case 'sendpub':
                /**
                 * Tracker told to send public key to target
                 * 
                 * [1]: peer ip
                 * [2]: peer port
                 */
                /** @type {Peer} Requested peer */
                let peerPort = typeof message[2] === 'number' ? message[2] : 0
                let peer = this.peers[`${message[1]}:${peerPort}`]

                if(typeof peer === 'undefined' || !IpRegex.test(message[1]) || peerPort <= 1024 || peerPort > 65535)
                    return this.callback(null, new Result({
                        message: `Tracker ${BaseN.encode(tracker.pub, '62')} had sent an invalid address.` //LOCALE_NEEDED
                    }))

                peer.ip = message[1]
                peer.port = peerPort
                this.sockets[sock].send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
                return

            case 'sendrand':
                /**
                 * Tracker told to send random value back to requester
                 * 
                 * [1]:string   peer IP
                 * [2]:number   peer port
                 */
                if(typeof message[1] !== 'string' || typeof message[2] !== 'number')
                    return

                if(!IpRegex.test(message[1]))
                    return

                let randomResponse = Crypt.rand(145)

                this.sockets[sock].send(randomResponse, 0, randomResponse.length, message[2], message[1], showError)
                return

            //tracker
            case 'welcome':
                /**
                 * Tracker says welcome!
                 */
                tracker.keepAlive[sock] = setInterval(() => this.sockets[sock].send('', 0, 0, remote.port, remote.address, showError), 10000)
                return

            case 'follower':
                /**
                 * Set list of followers
                 * 
                 * [1]:string       account public key
                 * [2]:string[]     list of following peers
                 */
                if( typeof message[1] !== 'string' ||
                    !Array.isArray(message[2]) )
                    return

                /** @type {string[]} */
                let followerPeers = message[2]

                for(let p = 0; p < followerPeers.length; p++){
                    let followerPeer = new Peer(followerPeers[p])

                    this.addPeer(followerPeer)
                    followerPeers[p] = BaseN.encode(peer.public, '62')
                }

                if(typeof seeders[message[1]] === 'undefined'){
                    seeders[message[1]] = followerPeers
                    seedersMyPos [message[1]] = 0
                    seedersSorted[message[1]] = false
                }
                else{
                    /** @type {string[]} */
                    let oldSeeders = seeders[message[1]]

                    oldSeeders.concat(followerPeers)
                    seedersSorted[message[1]] = false
                }
                return
        }
    }

    /**
     * Handle Bad Peer from socket
     * @param {Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     * @param {number} sock Socket number
     * @param {Peer} peer 
     */
    handleBadPeer (message, remote, sock, peer) {
        if(peer.isSender){
            this.deletePeer(peer)
            this.handleSocketMessage(message, remote, sock)
        }
        else{
            this.stopPolling(peer)
            this.sockets[sock].send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
        }
    }

    /**
     * Initialize connection for the target
     * @param {Peer} peer Peer to initialize connection
     * @param {number} sock Socket to be used (handle automatically)
     * @returns {Promise<boolean>} Is connection successfully established?
     */
    initializeConnection (peer, sock) {
        return new Promise(resolve => {
            if(peer.connected())
                return resolve(true)

            if(peer.public){
                this.sockets[sock].send(
                    peer.myPub, 0, peer.myPub.length,
                    peer.port,
                    peer.ip,
                    showError
                )
                resolve(true)
                return
            }

            sock = typeof sock === 'number' ? sock : 0

            let tracker = randTracker(this)
            let announceMessage = tracker.keys[sock].encrypt(str( [`announce`, `${peer.ip}:${peer.port}`] ))

            peer.socket = sock
            peer.callback = () => resolve(true)
            this.sockets[sock].send(announceMessage, 0, announceMessage.length, tracker.port, tracker.ip, showError)

            setTimeout(() => {
                if(peer.quality <= 0)
                    return resolve(false)

                if(peer.connected())
                    return

                peer.quality--
                this.initializeConnection(peer, sock + 1 < __.MAX_TRIAL - 1 ? sock + 1 : 0)
            }, 4000)
        })
    }

    /**
     * Send message to specific peer
     * @param {Peer} peer Peer to send data to
     * @param {string|Array|Buffer} data Data to be sent
     * @param {boolean} wait If sending this need to wait peer to response back
     * @returns {Promise<boolean>} Is the connection successfully established?
     */
    async send (peer, data, wait) {
        if(Array.isArray(data))
            if(Try(() => data = str(data)) === null)
                return false
        
        if(typeof data !== 'string')
            return false

        if(typeof peer === 'string'){
            /** @type {string} */
            let peerStr = peer
            peer = this.peers[peerStr]

            if(typeof peer === 'undefined')
                peer = new Peer(['', 0, BaseN.decode(peerStr, '62')])
        }
        else if(typeof peer !== 'object')
            return false

        this.addPeer(peer)

        if(!peer.connected()){
            peer.quality = __.MAX_TRIAL
            if(!await this.initializeConnection(peer))
                return false
        }

        Try(() => {
            data = peer.key.encrypt(data)
            this.sockets[peer.socket].send(data, 0, data.length, peer.port, peer.ip, showError)
        })

        if(wait)
            return await (() =>
                new Promise(resolve => {
                    let waitTimeout = setTimeout(() => {
                        peer.mediaStreamReady = null
                        resolve(false)
                    }, 1000)

                    peer.mediaStreamReady = () =>{
                        clearTimeout(waitTimeout)
                        resolve(true)
                    }
                })
            )()

        return true
    }

    /**
     * Start polling on this peer
     * @param {Peer} peer Peer to start polling
     * @param {number} sock Socket to start polling.
     */
    startPolling (peer, sock) {
        if(peer.connected())
            return false

        peer.keepAlive = setInterval(() => this.sockets[sock].send('', 0, 0, peer.port, peer.ip, showError), 10000)
        return true
    }

    /**
     * Stop polling on this peer
     * @param {Peer} peer Peer to stop polling
     */
    stopPolling (peer) {
        if(peer.connected()){
            clearInterval(peer.keepAlive)
            peer.keepAlive = null
            return true
        }

        return false
    }

    /**
     * Create a new receiver
     * @param {RequestFunction} callback Callback to be used
     */
    constructor (callback) {
        if(typeof callback !== 'function')
            throw Error(`Callback for receiver must be a function!`)

        this.callback = callback
        this.socket.on('error', showError)
        this.socket.on('message', (msg, remote) => this.handleSocketMessage(msg, remote, 0))

        // handshake to trackers
        if(Try(() => {
            /** @type {Array} */
            let trackersLoaded = this.storage.read('trackers').data

            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Tracker([
                    el.ip,
                    el.port,
                    el.pub
                ])

                delete trackersLoaded [ind]

                if(newTracker.key === null)
                    return

                let trackerAddress = `${el.ip}:${el.port}`
                this.peers[trackerAddress] = newTracker
                this.trackerList.push(trackerAddress)
            })
        }))
            return

        if(this.trackerList.length === 0)
            throw Error('No trackers has been set')

        

        for(let t in this.trackerList){
            /** @type {Tracker} */
            let tracker = this.peers[this.trackerList[t]]

            for(let i = __.MAX_TRIAL - 1; i >= 0; i--){
                let newSocket = Datagram.createSocket({
                    type: 'udp4',
                    reuseAddr: true
                })

                newSocket.on('error', showError)
                newSocket.on('message', (msg, remote) => this.handleSocketMessage(msg, remote, i))
                this.sockets[i] = newSocket
                this.helloTracker(tracker, i)
            }
        }

        console.log(`Receiver will be known as '${this.myPub}'.`)
    }
}

module.exports = Receiver