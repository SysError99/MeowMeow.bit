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
 * @returns {Peer} An annoucer
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

    /** @type {} */
    myPub = BaseN.encode(this.key.getPub(), '62')

    /** @type {Peer[]} Connected peers */
    peers = {}

    /** Receiver socket module*/
    socket = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })

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
        let remotePub = BaseN.encode(peer.pub, '62')

        if(typeof this.peers[remoteAddress] === 'undefined'){
            this.peers[remoteAddress] = peer

            if(typeof this.peers[remotePub] === 'undefined')
                this.peers[remotePub] = peer

            peer.keepAlive = setInterval(() => peer.socket.send('', 0, 0, peer.port, peer.ip, showError), 10000)
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
        peer.connected = false

        if(peer.keepAlive !== null){
            clearInterval(peer.keepAlive)
            peer.keepAlive = null
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
            /** @type {Peer} */
            let tracker = this.peers[this.trackerList[t]]
            let tellPortStr = tracker.key.encrypt(str( [`forwardPort`, p] ))
            this.socket.send(tellPortStr, 0, tellPortStr.length, tracker.port, tracker.ip, showError)
        }
    }

    /**
     * Handshake to a tracker
     * @param {Peer} tracker Tracker to be initialized
     */
    helloTracker (tracker) {
        if(tracker.quality <= 0)
            return false

        let myPub = tracker.myPub

        tracker.quality--
        this.socket.send(
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
    helloTrackers () {
        this.peers = {}
        this.trackerList = []
        if(Try(() => {
            /** @type {Array} */
            let trackersLoaded = this.storage.read('trackers').data

            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Peer([
                    el.ip,
                    el.port,
                    el.pub
                ])
                newTracker.isTracker = true
                newTracker.socket = this.socket

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
            /** @type {Peer} */
            let tracker = this.peers[this.trackerList[t]]
            this.helloTracker(tracker)
        }

        console.log(`Receiver will be known as '${this.myPub}'.`)
    }


    /**
     * Handle Bad Peer from socket
     * @param {Peer} peer 
     * @param {Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     */
    handleBadPeer (peer, message, remote) {
        if(peer.isTracker){
            if(!helloTracker(peer))
                this.callback(new Result({
                    message: `Can't establish secure connection with trackers. `+
                    `Key may be invalid or connection may be hijacked.` //LOCALE_NEEDED
                }))
        }
        else{
            let conn = peer.socket
            if(conn === this.socket){
                this.deletePeer(peer)
                return this.handleSocketMessage(message, remote)
            }
            else{
                peer.connected = false
                conn.send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
            }
        }
    }

    /**
     * Handle socket incoming message
     * @param {Array|Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     * @param {Peer} _peer (optional)
     * @returns {Promise<void>}
     */
    async handleSocketMessage (message, remote, _peer) {
        let remoteAddress = `${remote.address}:${remote.port}`
        /** @type {Peer} */
        let peer = typeof _peer === 'object' ? _peer : this.peers[remoteAddress]

        if(typeof peer === 'undefined')
            return Try(() => {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.key = this.key.computeSecret(message)
                peer.socket = this.socket

                if(peer.key !== null){
                    let helloMessage = peer.key.encrypt(`[""]`)
                    this.addPeer(peer)
                    peer.connected = true
                    peer.socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                }
                else
                    peer.socket.send(Crypt.rand(22), 0, 22, remote.port, remote.address, showError)
            })

        if(message.length === 0){
            if(typeof peer.mediaStreamReady === 'function'){
                peer.mediaStreamReady()
                peer.mediaStreamReady = null
            }
            return
        }

        if(Try(() => message = peer.key.decrypt(message)) === null)
            return this.handleBadPeer(peer, message, remote)

        if(peer.mediaStream !== null){
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
                return this.handleBadPeer(peer, message, remote)
            }

            peer.mediaStream.write(message, showError)
            peer.mediaStreamPacketsReceived += message.length
            peer.socket.send('', 0, 0, remote.port, remote.address, showError)
            return
        }

        if(Try(() => message = json(message)) === null)
            return this.handleBadPeer(peer, message, remote)

        if(!Array.isArray(message))
            return this.handleBadPeer(peer, message, remote)

        if(peer.isTracker){
            /**
             * Tracker section
             * 
             * [0]:string tracker command
             */
            switch(message[0]){

                //announcer
                case 'announce':
                    /**
                     * Announce to peer
                     * 
                     * [1]:string       peer IP
                     * [2]:number       peer port
                     */
                    if(typeof message[1] !== 'string' || typeof message[2] !== 'number')
                        return

                    if(!IpRegex.test(message[1]))
                        return

                    let randomResponse = Crypt.rand(32)
                    peer.socket.send(randomResponse, 0, randomResponse.length, message[2], message[1], showError)
                    return

                //tracker
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
                    let peers = message[2]
                    /** @type {string[]} */

                    if(typeof seeders[message[1]] === 'undefined'){
                        seeders[message[1]] = peers
                        seedersMyPos [message[1]] = 0
                        seedersSorted[message[1]] = false
                    }
                    else{
                        /** @type {string[]} */
                        let oldSeeders = seeders[message[1]]

                        oldSeeders.concat(peers)
                        seedersSorted[message[1]] = false
                    }
                    return

                case 'keyExists':
                    /**
                     * Tracker told that this key exists
                     */
                    this.key = new ECDHKey()
                    this.myPub = BaseN.encode(this.key.getPub(), '62')

                case 'welcome':
                    /**
                     * Tracker says welcome, say hello with your pub key!
                     */
                    /** @type {Buffer} */
                    let helloMessage
                    if(Try(() => helloMessage = peer.key.encrypt(str( [`hello`, this.myPub] ))) === null)
                        return

                    peer.socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
                    return

                case 'hello':
                    /**
                     * Tracker accepted your pub key!
                     */
                    peer.keepAlive = setInterval(() => peer.socket.send('', 0, 0, remote.port, remote.address, showError), 10000)
                    return

                default:
                    return
            }
        }
        else{ //check last access time from peer
            let currentTime = new Date()

            if(peer.lastAccess.getTime() === 0)
                peer.lastAccess = currentTime
            else{
                let lastAccess = currentTime - peer.lastAccess

                if(lastAccess <= __.ACCESS_COOLDOWN)
                    return
                else if(lastAccess >= __.LAST_ACCESS_LIMIT)
                    return this.handleBadPeer(peer, message, remote)
            }
        }

        this.callback(peer, new Result({
            success: true,
            data: message
        }))

    }

    /**
     * Initialize connection for the target
     * @param {Peer} peer Peer to initialize connection
     * @returns {Promise<boolean>} Is connection successfully established?
     */
    initializeConnection (peer) {
        return new Promise(resolve => {
            /** @type {Datagram.Socket} */
            let conn
            let connState = 0
            let tracker = randTracker(this)
            let targetPub = BaseN.encode(peer.pub, '62')

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
                if(peer.connected)
                    this.handleSocketMessage(message, remote, peer)

                if(message.length === 0)
                    return

                let remoteAddress = `${remote.address}:${remote.port}`

                // establish connection with peer
                if(`${peer.ip}:${peer.port}` === remoteAddress){
                    if(Try(() => message = json(peer.key.decrypt(message))) === null)
                        return

                    peer.quality = __.MAX_TRIAL
                    peer.connected = true

                    connState = 2
                    resolve(true)
                    this.addPeer(peer)
                }

                // find peer from tracker
                if(this.peers[remoteAddress] !== tracker)
                    return

                if(Try(() => message = json(tempTracker.key.decrypt(message))) === null){
                    peer.quality = 0
                    this.callback(new Result({
                        message:`${targetPub} decryption from tracker failed.` //LOCALE_NEEDED
                    }))
                    return
                }

                switch(connState){
                    case 0: // connect to tracker
                        if(message[0] === 'welcome'){
                            let announceMessage = tempTracker.key.encrypt(str( [`announce`, targetPub] ))
                            conn.send(announceMessage, 0, announceMessage.length, tempTracker.port, tempTracker.ip, showError)
                            connState = 1
                            return 1
                        }
                        else{
                            this.callback(new Result({
                                message: `${targetPub} connection is interrupetd` //LOCALE_NEEDED
                            }))
                            peer.quality = 0
                        }
                        return

                    case 1:
                        if(message[0] === 'tooOld'){
                            peer.quality = 0
                            this.callback(new Result({
                                message:`${targetPub} is outdated.` //LOCALE_NEEDED
                            }))
                            return
                        }

                        if(message[0] === 'unknown'){
                            peer.quality = 0
                            this.callback(new Result({
                                message: `${targetPub} is unknown by a tracker.` //LOCALE_NEEDED
                            }))
                            return
                        }

                        if(!IpRegex.test(message[0]) || typeof message[1] !== 'number'){
                            peer.quality = 0
                            this.callback(new Result({
                                message: `Tracker ${BaseN.encode(tempTracker.myPub, '62')} had sent an invalid address.` //LOCALE_NEEDED
                            }))
                            return
                        }

                        peer.ip = message[0]
                        peer.port = message[1]
                        
                        conn.send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
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
                if(peer.connected)
                    return resolve(true)

                if(peer.quality <= 0)
                    return resolve(false)

                peer.quality--
                this.initializeConnection(peer)
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

        if(!peer.connected){
            peer.quality = __.MAX_TRIAL
            if(!await this.initializeConnection(peer))
                return false
        }

        Try(() => {
            let conn = peer.socket
            data = peer.key.encrypt(data)
            conn.send(data, 0, data.length, peer.port, peer.ip, showError)
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
     * Create a new receiver
     * @param {RequestFunction} callback Callback to be used
     */
    constructor (callback) {
        if(typeof callback !== 'function')
            throw Error(`Callback for receiver must be a function!`)

        this.callback = callback
        this.socket.on('error', showError)
        this.socket.on('message', (msg, remote) => this.handleSocketMessage(msg, remote))    

        this.helloTrackers()
    }
}

module.exports = Receiver