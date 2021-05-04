const Datagram = require('dgram')
const FileSystem = require('fs')
const FileSystemPromises = FileSystem.promises

const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Debugger = require('./fn.debugger')
const Try = require('./fn.try.catch')
const TryAsync = require('./fn.try.catch.async')
const Return = require('./fn.try.return')
const Locale = require('./locale/locale')
const {json, str} = require('./fn.json')

const ECDHKey = require('./data/key.ecdh')
const Peer = require('./data/peer.extended')
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
 * @param {Error} err 
 */
const showError = err => err ? Debugger.error(err) : 0

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

    /** @type {string} My public address (told by tracker)*/
    myAddress = ``

    /** @type {string} My public key */
    myPub = BaseN.encode(this.key.getPub(), '62')

    /** @type {Peer[]} Connected peers */
    peers = {}

    /** @type {Peer[]} List of connected peer and needs polling*/
    pollingList = []

    /** @type {boolean} If this receiver is now ready (at least one tracker has found) */
    ready = false

    /** Receiver socket module*/
    socket = Datagram.createSocket({
        type: 'udp4',
        reuseAddr: true
    })

    /** Storage module */
    storage = require('./storage')(this.locale)

    /** @type {string[]} List of trackers as "ip:port" */
    trackerList = []

    /**
     * Add peer to known list
     * @param {Peer} peer Peer to be added
     * @returns {boolean} Did peer been added?
     */
    addPeer (peer) {
        let remoteAddress = `${peer.ip}:${peer.port}`

        if (typeof this.peers[remoteAddress] === 'undefined') {
            this.peers[remoteAddress] = peer
            return true
        }

        return false
    }

    /**
     * Broadcast data to certain amount of peers
     * @param {string} account Account Public key (Base62)
     * @param {number} n Amount of peers to broadcast
     * @param {Array|string} data Data to be sent
     */
    async broadcast (account, n, data) {
        if (n <= 0)
            return false

        /** @type {string[]} */
        let peers = seeders[account]
        let y

        if (!Array.isArray(peers))
            return false

        if (Array.isArray(data))
            data = str(data)
        else if (typeof data !== 'string')
            return false

        if (data.length > __.MTU)
            return false

        if (!seedersSorted[account]) {
            peers.sort()

            //find self position
            while (y < peers.length) {
                if (peers[y] === this.myAddress)
                    break

                y++
            }

            if (y < peers.length)
                seedersMyPos[account] = y
            else {
                peers.push(this.myAddress)
                return await this.broadcast(account, n, data)
            }

            seedersSorted[account] = true
        }

        /** @type {string[]} */
        let peersSelected = []
        let peerToAdd = ''
        let pos = 0

        y = seedersMyPos[account]

        while (n > 0) {
            if (p > 0)
                pos = - Math.abs(pos)
            else
                pos =  Math.abs(pos) + 1

            peerToAdd = peers[y + pos]

            if (typeof peerToAdd === 'string') {
                let addThis = true

                for (let p of peersSelected) {
                    if (p === peerToAdd) {
                        addThis = false
                        break
                    }
                        
                }

                if (addThis)
                    peersSelected.push(peerToAdd)
            }

            n--
        }

        while (peersSelected.length > 0) {
            if (peersSelected[0] !== this.myAddress)
                await this.send(peersSelected[0], data)

            peersSelected.splice(0,1)
        }

        return true
    }

    /**
     * Delete a peer from known list
     * @param {Peer} peer Peer to delete
     * @returns {Promise<void>}
     */
    async deletePeer (peer) {
        let remoteAddress = `${peer.ip}:${peer.port}`

        if (typeof peer.mediaStream !== 'undefined')
            await peer.closeMediaStream()

        if (typeof this.peers[remoteAddress] === 'object')
            delete this.peers[remoteAddress]
    }

    /**
     * Do port forwarding and avoid NAT.
     * @param {number} p Port to forward to
     */
    forwardPort (p) {
        this.socket.bind(p)
        for (let tracker of this.trackerList)
            this.#sendEncrypted(this.peers[tracker], str( [`forwardPort`, p] ))
    }

    /**
     * Handshake to a tracker
     * @param {Tracker} tracker Tracker to be initialized
     */
    helloTracker (tracker) {
        let myPub = tracker.myPub
        let trialCount = __.MAX_TRIAL

        let tryToConnect = setInterval(() => {
            if (tracker.connected || trialCount < 0)
                return clearInterval(tryToConnect)

            trialCount--
            this.socket.send(
                myPub,
                0,
                myPub.length,
                tracker.port,
                tracker.ip,
                showError
            )
        }, 1000)
    }

    /**
     * Handle socket incoming message
     * @param {Array|Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     * @returns {Promise<void>}
     */
    async handleSocketMessage (message, remote) {
        /** @type {Peer|Tracker} */
        let peer = this.peers[`${remote.address}:${remote.port}`]

        if (typeof peer === 'undefined') {
            //Add peer to active list
            if (message.length !== Crypt.ecdh.length)
                return Debugger.warn(`${remote.address}:${remote.port} sent invalid key length.`)

            let computeKey = this.key.computeSecret(message)

            if (typeof computeKey !== 'undefined') {
                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.isSender = true
                peer.key = computeKey
                this.addPeer(peer)
                this.startPolling(peer)
                this.#sendEncrypted(peer, str( ['nice2meetu'] ))
                Debugger.log(`Welcome ${remote.address}:${remote.port}!`)
            }
            else {
                Debugger.warn(`${remote.address}:${remote.port} sent invalid key.`)
                this.socket.send(
                    Crypt.rand(22),
                    0,
                    22,
                    remote.port,
                    remote.address,
                    showError
                )
            }
            return 
        }

        if (peer.isPeer)
            return this.#handlePeerMessage(message, remote, peer)

        if (peer.isTracker)
            return this.#handleTrackerMessage(message, remote, peer)
    }

    /**
     * Handle Message have sent from peers
     * @param {Buffer|string} message Encrypted message received
     * @param {Datagram.RemoteInfo} remote Remote info
     * @param {Peer} peer Peer sent this
     */
    async #handlePeerMessage (message, remote, peer) {
        if (message.length === 0) {
            peer.lastAccess = currentTime
            return
        }

        if (!peer.connected()) {
            if (typeof Return(() => json(peer.key.decryptToString(message))) === 'undefined') {
                peer.quality--

                if (peer.quality <= 0) {
                    Debugger.warn(`${peer.ip}:${peer.port} trying too much of connection, assuming trolling, kicking out.`)
                    this.#handleBadPeer(message, remote, peer)
                    return
                }

                Debugger.warn(`${peer.ip}:${peer.port} is trying to connect, but have sent unknown message.`)
                return
            }

            // NAT transversal successful
            if (typeof peer.callback === 'function') {
                Debugger.log(`Connection to ${remote.address}:${remote.port} is successful.`)
                peer.callback(__.MAX_TRIAL - peer.quality)
                peer.callback = undefined
            }

            this.startPolling(peer)
            return
        }

        if (peer.lastAccess !== 0) {
            //check last access time from peer
            let lastAccess = currentTime - peer.lastAccess

            if (lastAccess <= __.ACCESS_COOLDOWN && typeof peer.mediaStream === 'undefined')
                return Debugger.warn(`${remode.address}:${remote.port} send packets too frequent!`)
            else if (lastAccess >= __.LAST_ACCESS_LIMIT)
                return this.#handleBadPeer(message, remote, peer)
        }

        peer.lastAccess = currentTime

        if (message.length === 1 && typeof peer.mediaStreamCb === 'function')
            return peer.mediaStreamCb(__.MEDIA_STREAM_ACK)

        if (Try(() => message = peer.key.decrypt(message)))
            return this.#handleBadPeer(message, remote, peer)

        if (Try(() => message = json(message))) {
            if (typeof peer.mediaStream !== 'undefined')
                return this.#handleMediaStream(message, peer)
            else
                return this.#handleBadPeer(message, remote, peer)
        }

        if (typeof peer.mediaStreamCb === 'function') {
            switch (message[0]) {
                /**
                 * Peer low-level commands
                 */
                case __.MEDIA_STREAM_NOT_READY:
                    /**
                     * Peer is not ready
                     */
                case __.MEDIA_STREAM_INFO_INVALID:
                    /**
                     * Peer told that the information is invalid
                     */
                case __.MEDIA_STREAM_FILE_TOO_LARGE:
                    /**
                     * Peer told that file is too large
                     */
                case __.MEDIA_STREAM_POST_NOT_FOUND:
                    /**
                     * Peer told that such post is not found
                     */
                case __.MEDIA_STREAM_NO_MEDIA:
                    /**
                     * Peer told that no such media ever included in post
                     */
                case __.MEDIA_STREAM_MEDIA_FOUND:
                    /**
                     * Peer told that such media is already exists
                     */
                case __.MEDIA_STREAM_READY:
                    /**
                     * Peer is now ready to receive a media
                     */
                case __.MEDIA_STREAM_ACCEPTED:
                    /**
                     * Peer accepted your file
                     */
                case __.MEDIA_STREAM_DECLINED:
                    /**
                     * Peer has declined that package
                     */
                case __.MEDIA_STREAM_PEER_ERR:
                    /**
                     * Peer has encountered an error while streaming
                     */
                case __.MEDIA_STREAM_ACK:
                    /**
                     * Peer responds with ACK
                     */
                    peer.mediaStreamCb(message[0])
                    return
            }
        }

        this.callback(peer, new Result({
            success: true,
            data: message
        }))
    }

    /**
     * Handle Message have sent from peers
     * @param {Buffer|string} message Encrypted message received
     * @param {Peer} peer Peer sent this
     */
    async #handleMediaStream (message, peer) {
        // Streaming media
        if (message[0] === 255 && message[1] === 255) {
            //Verifying signature
            let dataReceivedSignature = await Crypt.hash(peer.getMediaStreamTempLocation())

            if (dataReceivedSignature === peer.getMediaStreamHash()) {
                Debugger.log(`Media accepted ${peer.mediaStreamLocation} from ${peer.ip}:${peer.port}!`)

                if (await peer.closeMediaStream()) { // If can't close properly
                    this.#sendEncrypted(peer, str( [__.MEDIA_STREAM_PEER_ERR] ))
                    peer.mediaStream = undefined
                }

                this.#sendEncrypted(peer, str( [__.MEDIA_STREAM_ACCEPTED] ))
                return
            }
            else
                //Set it to be bigger that accepted rate to trigger 'media decline'
                peer.mediaStreamPacketsReceived = peer.mediaStreamPacketsTotal + 1
        }

        if (peer.mediaStreamPacketsReceived > peer.mediaStreamPacketsTotal) {
            // Decline file
            Debugger.warn(`Media declined ${peer.mediaStreamLocation} from ${peer.ip}:${peer.port}`)
            this.#sendEncrypted(peer, str( [__.MEDIA_STREAM_DECLINED] ))
            await peer.closeMediaStream()
            return
        }

        if (packetNumber !== peer.mediaStreamPreviousPacket) {
            //write packet
            let packetNumber = message[0] * message[1]

            if (message.length <= 2 || await TryAsync(async () => FileSystemPromises.write(peer.mediaStream, message, 2, message.length - 2, packetNumber * __.MTU))) {
                Debugger.error(`Media error: ${peer.ip}:${peer.port}!`)
                this.#sendEncrypted(peer, str( [__.MEDIA_STREAM_PEER_ERR] ))
                return
            }

            Debugger.log(`Media: write ${packetNumber} [${peer.mediaStreamPacketsReceived / peer.mediaStreamPacketsTotal}%] ${peer.ip}:${peer.port}/${peer.mediaStreamLocation}`)
        }

        //Return ACK signal
        peer.mediaStreamPacketsReceived++
        peer.mediaStreamPreviousPacket = packetNumber
        this.socket.send(
            Buffer.from([
                Math.floor(Math.random() * 256)
            ]),
            0,
            1,
            peer.port,
            peer.ip,
            showError
        )
    }

    /**
     * Handle messages from tracker
     * @param {string} message Message received
     * @param {Datagram.RemoteInfo} remote Remote Info
     * @param {Tracker} tracker Tracker have sen message
     */
    async #handleTrackerMessage (message, remote, tracker) {
        if (Try(() => message = json(tracker.key.decryptToString(message))))
            return this.socket.send(
                tracker.myPub,
                0,
                tracker.myPub.length,
                remote.port, 
                remote.address,
                showError
            )

        Debugger.log(`${tracker.ip}:${tracker.port}://${message[0]}/.,,`)

        /**
         * Tracker section
         * 
         * [0]:string tracker command
         */
        switch (message[0]) {

            //announcer
            case 'unknown':
                /**
                 * Tracker told this peer is unknown
                 */

                this.callback(undefined, new Result({
                    message: `Peer ${message[1]} is unknown.` //LOCALE_NEEDED
                }))
                return

            case 'sendpub':
                /**
                 * Tracker told to send public key to target
                 * 
                 * [1]string: peer ip
                 * [2]number: peer port
                 * [3]string: peer pub
                 */
                if (typeof message[1] !== 'string' ||
                    typeof message[2] !== 'number' )
                    return

                let peerPort = typeof message[2] === 'number' ? message[2] : 0
                /** @type {Peer} Requested peer */
                let peer = this.peers[`${message[1]}:${peerPort}`]

                if (typeof message[3] === 'string') 
                    peer.pub = Return(() => BaseN.decode(message[3], '62'), Buffer.alloc(0))

                if (typeof peer === 'undefined' ||
                    !IpRegex.test(message[1]) ||
                    peerPort <= 1024 ||
                    peerPort > 65535 ||
                    peer.pub.length <= 0 )
                    return this.callback(undefined, new Result({
                        message: `Tracker ${BaseN.encode(tracker.pub, '62')} had sent an invalid address.` //LOCALE_NEEDED
                    }))

                peer.ip = message[1]
                peer.port = peerPort

                let tryToConnect = setInterval(() => {
                    if (peer.connected())
                        return clearInterval(tryToConnect)

                    if (peer.quality < 0) {
                        if (typeof peer.callback === 'function') {
                            peer.callback(__.MAX_TRIAL + 1)
                            peer.callback = undefined
                        }

                        clearInterval(tryToConnect)
                        return
                    }

                    Debugger.log(`Connecting to ${peer.ip}:${peer.port}...`)
                    peer.quality--
                    peer.setPeerPub(peer.pub)
                    this.socket.send(
                        peer.myPub,
                        0,
                        peer.myPub.length,
                        peer.port,
                        peer.ip,
                        showError
                    )
                }, 1000)
                return

            case 'sendrand':
                /**
                 * Tracker told to send random value back to requester
                 * 
                 * [1]:string   peer IP
                 * [2]:number   peer port
                 */
                if (typeof message[1] !== 'string' || typeof message[2] !== 'number')
                    return

                if (!IpRegex.test(message[1]))
                    return

                let tryToResponseCount = 0
                let tryToResponse = setInterval(() => {
                    let randomResponse = Crypt.rand(Crypt.ecdh.length)

                    if (typeof this.peers[`${message[1]}:${message[2]}`] !== 'undefined')
                        return clearInterval(tryToResponse)

                    Debugger.log(`Responding to ${peer.ip}:${peer.port}`)
                    this.socket.send(
                        randomResponse,
                        0,
                        randomResponse.length,
                        message[2],
                        message[1],
                        showError
                    )
                    tryToResponseCount++

                    if (__.MAX_TRIAL < tryToResponseCount)
                        return clearInterval(tryToResponse)
                }, 1000)

                return

            //tracker
            case 'welcome':
                /**
                 * Tracker says welcome!
                 */
                if (typeof message[1] === 'string' && typeof message[2] === 'number') {
                    let myAddress = `${message[1]}:${message[2]}`

                    if (this.myAddress.length <= 0)
                        Debugger.log(`Your public address: ${myAddress}`)

                    this.myAddress = myAddress
                }

                this.ready = true
                tracker.connected = true
                this.#sendEncrypted(tracker, str( ['setPub', this.myPub] ))
                tracker.keepAlive = setInterval(
                    () =>
                        this.socket.send(
                            '',
                            0,
                            0,
                            remote.port,
                            remote.address,
                            showError
                        ),
                    6000)
                return

            case 'seeder':
                /**
                 * Set list of seeders
                 * 
                 * [1]:string       account public key
                 * [2]:string[]     list of seeding peers
                 */
                if (typeof message[1] !== 'string' ||
                    !Array.isArray(message[2]) )
                    return

                /** @type {string[]} */
                let seederPeers = message[2]

                if (typeof seeders[message[1]] === 'undefined') {
                    seeders[message[1]] = seederPeers
                    seedersMyPos [message[1]] = 0
                } else {
                    /** @type {string[]} */
                    let oldSeeders = seeders[message[1]]

                    oldSeeders.concat(seederPeers)
                }

                seedersSorted[message[1]] = false
                return

            case 'seeding':
                /**
                 * Tracker told that you are seeding this account
                 * [1]:string   seeding account
                 */
                if (typeof message[1] !== 'string')
                    return

                Debugger.log(`Seeding ${message[1]}`)
                return

            case 'unseeding':
                /**
                 * Tracker told that you are unseeding this account
                 * [1]:string   unseeding account
                 */
                if (typeof message[1] !== 'string')
                    return

                Debugger.log(`Unseeding ${message[1]}`)
                return
        }
    }

    /**
     * Handle Bad Peer from socket
     * @param {Buffer|string} message 
     * @param {Datagram.RemoteInfo} remote 
     * @param {Peer} peer 
     */
    async #handleBadPeer (message, remote, peer) {    
        Debugger.log(`${peer.ip}:${peer.port} is known but sent malformed message, assuming the peer is bad.`)

        if (peer.isSender) {
            await this.deletePeer(peer)
            await this.handleSocketMessage(message, remote)
        } else {
            this.stopPolling(peer)
            this.socket.send(
                peer.myPub,
                0,
                peer.myPub.length,
                remote.port,
                remote.address,
                showError
            )
        }
    }

    /**
     * Initialize connection for the target
     * @param {Peer} peer Peer to initialize connection
     * @returns {Promise<number>} How many tries used to connect to peer (__.MAX_trial means unsuccessful)
     */
    initializeConnection (peer) {
        return new Promise(resolve => {
            if (peer.connected())
                return resolve(1)

            if (peer.public) {
                this.socket.send(
                    peer.myPub,
                    0,
                    peer.myPub.length,
                    peer.port,
                    peer.ip,
                    showError
                )
                resolve(1)
                return
            }

            let tracker = randTracker(this)

            peer.callback = trial => resolve(trial)
            this.#sendEncrypted(tracker, str( [`announce`, `${peer.ip}:${peer.port}`] ))
            // Have a look at this.handleTrackerMessage() -> 'sendpub' to find more clues.
        })
    }

    /**
     * Tell trackers that I'm seeding this account
     * @param {string} account Account public key
     */
    async seed (account) {
        if (this.trackerList.length === 0)
            return Debugger.error('No active trackers')

        account = `${account}`

        for (let tracker of this.trackerList)
            this.sendEncrypted(this.peers[tracker], str( ['seed', account] ))
    }

    /**
     * Tell trackers that I'm seeding this account
     * @param {string} account Account public key
     */
    async unseed (account) {
        if (this.trackerList.length === 0)
            return Debugger.error('No active trackers')

        account = `${account}`

        for (let tracker of this.trackerList)
            this.sendEncrypted(this.peers[tracker], str( ['unseed', account] ))
    }

    /**
     * Send message to specific peer
     * @param {Peer} peer Peer to send data to
     * @param {string|Array|Buffer} data Data to be sent
     * @returns {Promise<number>} How many tries used to connect to peer? (0 means parameters invalid, __.MAX_TRIAL means unsuccessful)
     */
    async send (peer, data) {
        if (Array.isArray(data))
            if (Try(() => data = str(data)))
                return 0
        
        if (typeof data !== 'string') {
            Debugger.error(`'data' parameter contains malformed type.`)
            return 0
        }

        if (data.length > __.MTU) {
            Debugger.log(`Receiver.send() should only be used with small streams (< ${__.MTU} bytes) `) //LOCALE_NEEDED
            return 0
        }

        if (typeof peer === 'string') {
            /** @type {string} */
            let peerStr = peer
            peer = this.peers[peerStr]

            if (typeof peer === 'undefined') {
                let ipAndPort = peerStr.split(':')

                if (ipAndPort.length !== 2)
                    return 0

                if (!IpRegex.test(ipAndPort[0]))
                    return 0

                peer = new Peer([
                    ipAndPort[0],
                    Return(() => parseInt(ipAndPort[1]), 1)
                ])
            }
        } else if (typeof peer !== 'object')
            return 0

        let connectionTrialCounter = 1

        this.addPeer(peer)

        if (!peer.connected()) {
            peer.quality = __.MAX_TRIAL
            connectionTrialCounter = await this.initializeConnection(peer)

            if (__.MAX_TRIAL < connectionTrialCounter)
                return connectionTrialCounter
        }

        Debugger.log(`Send packet to ${peer.ip}:${peer.port}`)

        if (Try(() => this.#sendEncrypted(peer, data)))
            return 0

        return connectionTrialCounter
    }

        /**
     * Encrypt a string and send to specific peer
     * @param {Peer} peer Peer to send the message
     * @param {Buffer|string} message message to send
     */
    #sendEncrypted (peer, message) {
        message = peer.key.encrypt(message)
        this.socket.send(
            message,
            0,
            message.length,
            peer.port, 
            peer.ip,
            showError
        )
    }

    /**
     * Send media to target peer
     * @param {Peer} peer Peer to send file to
     * @param {{
     *   owner:string,
     *   index:number|string,
     *   media:number
     * }} info Media Information\
     * @returns {Promise<void>}
     */
    async sendMedia (peer, info) {
        let dummyQueue = {}
        let queueAwait = () => new Promise(resolve => {
            setInterval(() =>{
                if (peer.mediaStreamQueue[0] === dummyQueue)
                    resolve()
            })
        })

        Debugger.log(
            `Media stream Queued: ${info.owner}.${info.index}${
                typeof info.media !== 'undefined' ?
                    `.${info.media}`:
                    ''
            }`
        )
        peer.mediaStreamQueue.push(dummyQueue)
        await queueAwait()

        await this.#sendMedia(peer, info)

        peer.mediaStreamQueue.splice(0,1)
        return
    }

    /**
     * Send media to target peer
     * @param {Peer} peer Peer to send file to
     * @param {{
     *   owner:string,
     *   index:number|string,
     *   media:number
     * }} info Media Information
     * @returns {Promise<Number>}
     */
    async #sendMedia (peer, info) {
        if (typeof info !== 'object')
            return Debugger.error(`Parameter 'info' is invalid.`)

        if (typeof info.owner !== 'string' ||
            typeof info.index !== 'number' ||
            typeof info.index !== 'string' ||
            typeof info.media !== 'number' )
            return Debugger.error(`Parameter 'info' contains invalid varaible types.`)

        let fileLocation = `./data/${info.owner}.${info.index}`
        /** @type {FileSystem.Stats} */
        let fileStats

        switch (info.media) {
            case 'avatar':
            case 'cover':
                fileLocation += '.png'
                break
            
            default:
                fileLocation += `.${info.media}`
        }

        if (await TryAsync(async () => FileSystemPromises.access(fileLocation)))
            return Debugger.warn(`MediaStream: file "${fileLocation}" is not found.`)

        if (await TryAsync(async () => fileStats = FileSystemPromises.stat(fileLocation)))
            return Debugger.warn(`MediaStream: file "${fileLocation}" is not ready.`)

        if (fileStats.size > __.MAX_PAYLOAD || fileStats.size > 65536)
            return Debugger.warn(`MediaStream: file "${fileLocation}" is too large`)

        let fileStream = FileSystem.createReadStream(fileLocation)
        let fileStreamIndex0 = 0
        let fileStreamIndex1 = 0
        let fileStreamByte = Buffer.from([])
        let fileStreamStatus
        /** @type {NodeJS.Timeout} */
        let fileStreamTimeout
        let fileStreamResolver = resolve => {
            clearTimeout(fileStreamTimeout)
            fileStreamTimeout = undefined
            resolve(fileStreamStatus)
        }
        let fileStreamAwaiter = time => {
            fileStreamTimeout = setTimeout(() => {
                fileStreamStatus = __.MEDIA_STREAM_TIME_OUT
                fileStreamResolver()
            }, time)

            return new Promise(fileStreamResolver)
        }
        let fileStreamResendCount = 0
        /** @type {Buffer} */
        let fileStreamMissedPacket

        peer.mediaStreamCb = message => {
            if (fileStreamStatus === __.MEDIA_STREAM_DECLINED)
                return

            fileStreamStatus = message
            fileStreamResolver()
        }

        Debugger.log(`MediaStream: sending request to ${peer.ip}:${peer.port}`)
        this.#sendEncrypted(peer, str([
            'media',
            info.owner,
            info.index,
            typeof info.media === 'number' ? info.media : 0,
            Math.ceil(fileStats.size / 1024)
        ]))

        if (await fileStreamAwaiter(8000) !== __.MEDIA_STREAM_READY)
            return Debugger.warn(`MediaStream: ${peer.ip}:${peer.port} seems not right (${fileStreamStatus})`)

        while (true) {
            if (fileStreamStatus === __.MEDIA_STREAM_DECLINED)
                // peer declined the packet
                return Debugger.warn(`MediaStream: ${peer.ip}:${peer.port} declined the packet.`)

            if (fileStreamResendCount > __.MAX_TRIAL) {
                this.#sendEncrypted(peer, Buffer.from([255,255]))
                return Debugger.warn(`MediaStream: ${peer.ip}:${peer.port} timed out.`)
            }

            if (typeof fileStreamMissedPacket === 'undefined')
                fileStreamByte = fileStream.read(__.MTU)
            else {
                // If peer missed the package, send the old one
                fileStreamByte = fileStreamMissedPacket
                fileStreamMissedPacket = undefined
            }
            
            if (!fileStreamByte) // FALSY
                break

            Debugger.log(`MediaStream: write ${fileStreamIndex0 * fileStreamIndex1} to ${peer.ip}:${peer.port}`)
            this.#sendEncrypted(peer, Buffer.concat([
                    Buffer.from([
                        fileStreamIndex0,
                        fileStreamIndex1
                    ]),
                    fileStreamByte
                ]))

            let waitForAck = await fileStreamAwaiter(10000)

            if (waitForAck === __.MEDIA_STREAM_ACK) {
                fileStreamResendCount = 0

                if (fileStreamIndex1 < 255)
                    fileStreamIndex1++
                else {
                    fileStreamIndex1 = 0

                    if (fileStreamIndex0 < 255)
                        fileStreamIndex0++
                    else
                        break
                }
            } else if (waitForAck === __.MEDIA_STREAM_TIME_OUT) {
                fileStreamMissedPacket = fileStreamByte
                fileStreamResendCount++
                continue
            }
        }

        fileStream.close()
        
        while (true) {
            // wait for peer to accept the packet
            if (fileStreamResendCount > __.MAX_TRIAL)
                return Debugger.warn(`MediaStream: completed but no responses from ${peer.ip}:${peer.port}`)
            else
                fileStreamResendCount++

            Debugger.log(`MediaStream: waiting ${peer.ip}:${peer.port} to accept the media...`)
            this.#sendEncrypted(
                peer,
                Buffer.concat([
                    Buffer.from([255, 255]),
                    Crypt.rand(128 + Math.floor(Math.random() * 128))
                ])
            )

            if (await fileStreamAwaiter(1000) === __.MEDIA_STREAM_TIME_OUT)
                continue
            else
                break
        }

        Debugger.log(`MediaStream: ${peer.ip}:${peer.port} completed!`)
        peer.mediaStreamCb = undefined
        return fileStreamStatus
    }

    /**
     * Start polling on this peer
     * @param {Peer} peer Peer to start polling
     */
    startPolling (peer) {
        if (peer.connected())
            return false

        this.pollingList.push(peer)
        peer.keepAlive = true
        return true
    }

    /**
     * Stop polling on this peer
     * @param {Peer} peer Peer to stop polling
     */
    stopPolling (peer) {
        if (typeof peer === 'number') {
            /** @type {Peer} */
            let peerToDelete = this.pollingList[peer]

            if (typeof peerToDelete === 'object') {
                if (peerToDelete.connected()) {
                    this.pollingList.splice(peer, 1)
                    return true
                }
            }

            return false
        }

        if (peer.connected()) {
            peer.keepAlive = false

            for (let i in this.pollingList) {
                if (this.pollingList[i] === peer) {
                    this.pollingList.splice(i, 1)
                    return true
                }
            }
        }

        return false
    }

    /**
     * Create a new receiver
     * @param {RequestFunction} callback Callback to be used
     */
    constructor (callback) {
        if (typeof callback !== 'function')
            throw Error(`Callback for receiver must be a function!`)

        this.callback = callback
        this.socket.on('error', showError)
        this.socket.on('message', (msg, remote) => this.handleSocketMessage(msg, remote, 0))

        // handshake to trackers
        if (Try(() => {
            /** @type {Array} */
            let trackersLoaded = this.storage.read('trackers')

            Debugger.log(`Trackers loaded, contains ${trackersLoaded.length} trackers`)
            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Tracker([
                    el.ip,
                    el.port,
                    el.pub
                ])

                delete trackersLoaded [ind]

                if (typeof newTracker.key === 'undefined')
                    return

                Debugger.log(`Adding ${el.ip}:${el.port} to tracker list.`)
                let trackerAddress = `${el.ip}:${el.port}`
                this.peers[trackerAddress] = newTracker
                this.trackerList.push(trackerAddress)
            })
        }))
            return

        if (this.trackerList.length === 0)
            throw Error('No trackers has been set')

        for (let tracker of this.trackerList){
            /** @type {Peer} */
            let peer = this.peers[tracker]

            Debugger.log(`Saying hello to tracker ${peer.ip}:${peer.port}`)
            this.helloTracker(peer)
        }

        Debugger.log(`Receiver will be known as '${this.myPub}'.`)

        //Polling
        setInterval(() => {
            let i = 0
            /** @type {Peer} */
            let peer

            while (i < this.pollingList.length) {
                peer = this.pollingList[i]

                if (currentTime - peer.lastAccess > __.LAST_ACCESS_LIMIT) {
                    Debugger.warn(`${peer.ip}:${peer.port} is no longer available.`)
                    this.stopPolling(peer)

                    if (peer.isSender)
                        this.deletePeer(peer)
                    continue
                }

                this.socket.send(
                    '',
                    0,
                    0,
                    peer.port,
                    peer.ip,
                    showError
                )
                i++
            }
        },10000)
    }
}

module.exports = Receiver