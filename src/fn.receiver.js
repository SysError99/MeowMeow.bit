const Datagram = require('dgram')
const FileSystem = require('fs')

const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Try = require('./fn.try.catch')
const Return = require('./fn.try.return')
const Locale = require('./locale/locale')
const {json, str} = require('./fn.json')

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
 * @param {Error} err 
 */
const showError = err => err ? console.error(err) : 0

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
    broadcast (account, n, data) {
        if(n <= 0)
            return false

        /** @type {string[]} */
        let peers = seeders[account]
        let y = 0

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
                peers.push(this.myAddress)
                return this.broadcast(account, n, data)
            }

            seedersSorted[account] = true
        }

        /** @type {string[]} */
        let peersSelected = []
        let peerToAdd = ''
        let pos = 0

        y = seedersMyPos[account]

        while(n > 0){
            if(p > 0)
                pos = - Math.abs(pos)
            else
                pos =  Math.abs(pos) + 1

            peerToAdd = peers[y + pos]

            if(typeof peerToAdd === 'string')
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

        if(peer.mediaStream >= 0)
            peer.closeMediaStream()

        if(typeof this.peers[remoteAddress] === 'object')
            delete this.peers[remoteAddress]
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
     */
    helloTracker (tracker) {
        let myPub = tracker.myPub
        let trialCount = __.MAX_TRIAL

        let tryToConnect = setInterval(() => {
            if(tracker.connected || trialCount < 0)
                return clearInterval(tryToConnect)

            trialCount--
            this.socket.send(
                myPub, 0, myPub.length,
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

        if(typeof peer === 'undefined'){
            if(message.length !== Crypt.ecdh.length)
                return 

            let computeKey = this.key.computeSecret(message)

            if(typeof computeKey !== 'undefined'){
                let helloMessage = computeKey.encrypt(str( ['nice2meetu'] ))

                peer = new Peer([
                    remote.address,
                    remote.port
                ])
                peer.isSender = true
                peer.key = computeKey
                this.addPeer(peer)
                this.startPolling(peer)
                this.socket.send(helloMessage, 0, helloMessage.length, remote.port, remote.address, showError)
            }
            else
                this.socket.send(Crypt.rand(22), 0, 22, remote.port, remote.address, showError)

            return 
        }

        if(peer.isPeer)
            return this.handlePeerMessage(message, remote, peer)
            
        if(peer.isTracker)
            return this.handleTrackerMessage(message, remote, peer)
    }

    /**
     * Handle Message have sent from peers
     * @param {Buffer|string} message Encrypted message received
     * @param {Datagram.RemoteInfo} remote Remote info
     * @param {Peer} peer Peer sent this
     */
    async handlePeerMessage (message, remote, peer) {
        if(message.length === 0){
            peer.lastAccess = currentTime
            return
        }

        if(!peer.connected()){
            if(typeof Return(() => json(peer.key.decryptToString(message))) === 'undefined')
                return

            // NAT transversal successful
            if(typeof peer.callback === 'function'){
                peer.callback(__.MAX_TRIAL - peer.quality)
                peer.callback = undefined
            }

            this.startPolling(peer)
            return
        }

        //check last access time from peer
        if(peer.lastAccess !== 0){
            let lastAccess = currentTime - peer.lastAccess

            if(lastAccess <= __.ACCESS_COOLDOWN && peer.mediaStream < 0)
                return
            else if(lastAccess >= __.LAST_ACCESS_LIMIT)
                return this.handleBadPeer(message, remote, peer)
        }

        peer.lastAccess = currentTime

        if(Try(() => message = peer.key.decrypt(message)))
            return this.handleBadPeer(message, remote, peer)

        if(Try(() => message = json(message))){
            if(peer.mediaStream >= 0){
                // Streaming media
                if(message[0] === 255 && message[1] === 255){
                    let dataReceivedSignature = await Crypt.hash(peer.getMediaStreamTempLocation())

                    if(dataReceivedSignature === peer.getMediaStreamHash()){
                        let mediaAcceptMessage = peer.key.encrypt(str( [__.MEDIA_STREAM_ACCEPTED] ))

                        this.socket.send(mediaAcceptMessage, 0, mediaAcceptMessage.length, peer.port, peer.ip, showError)
                        
                        if(!peer.closeMediaStream()){
                            let mediaStreamCloseErrorMessage = peer.key.encrypt(str( [__.MEDIA_STREAM_PEER_ERR] ))
    
                            this.socket.send(mediaStreamCloseErrorMessage, 0, mediaStreamCloseErrorMessage.length, peer.port, peer.ip, showError)
                        }
                        return
                    }
                    else
                        //set packet bigger that accepted rate to trigger decline
                        peer.mediaStreamPacketsReceived = peer.mediaStreamPacketsTotal + 1
                }
    
                if(peer.mediaStreamPacketsReceived > peer.mediaStreamPacketsTotal){
                    // Packet number exceeds the limited amount
                    let mediaDeclineMessage = peer.key.encrypt(str( [__.MEDIA_STREAM_DECLINED] ))

                    this.socket.send(mediaDeclineMessage, 0, mediaDeclineMessage.length, peer.port, peer.ip, showError)
                    peer.closeMediaStream()
                    return
                }
    
                //write packet
                let packetNumber = message[0] * message[1]

                if(message.length <= 2 || Try(() => FileSystem.writeSync(peer.mediaStream, message, 2, message.length - 2, packetNumber * __.MTU))){
                    let mediaStreamErrorMessage = peer.key.encrypt(str( [__.MEDIA_STREAM_PEER_ERR] ))

                    this.socket.send(mediaStreamErrorMessage, 0, mediaStreamErrorMessage.length, peer.port, peer.ip, showError)
                    return
                }

                let ackMessage = peer.key.encrypt(str [__.MEDIA_STREAM_ACK])

                peer.mediaStreamPacketsReceived++
                this.socket.send(ackMessage, 0, ackMessage.length, peer.port, peer.ip, showError)
                return
            }
            else if(!Array.isArray(message))
                return this.handleBadPeer(message, remote, peer)
        }

        if(typeof peer.mediaStreamCb === 'function'){
            switch(message[0]){
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
                    peer.mediaStreamCb(message)
                    return
            }
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
     * @param {Tracker} tracker Tracker have sen message
     */
    async handleTrackerMessage (message, remote, tracker) {
        if(Try(() => message = json(tracker.key.decryptToString(message)))){
            let trackerPub = tracker.myPub

            this.socket.send(trackerPub, 0, trackerPub.length, remote.port, remote.address, showError)
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
                if( typeof message[1] !== 'string' ||
                    typeof message[2] !== 'number' )
                    return

                let peerPort = typeof message[2] === 'number' ? message[2] : 0
                /** @type {Peer} Requested peer */
                let peer = this.peers[`${message[1]}:${peerPort}`]

                if(typeof message[3] === 'string') 
                    peer.pub = Return(() => BaseN.decode(message[3], '62'), Buffer.alloc(0))

                if( typeof peer === 'undefined' ||
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
                    if(peer.connected())
                        return clearInterval(tryToConnect)

                    if(peer.quality < 0){
                        if(typeof peer.callback === 'function'){
                            peer.callback(__.MAX_TRIAL + 1)
                            peer.callback = undefined
                        }

                        clearInterval(tryToConnect)
                        return
                    }

                    peer.quality--
                    peer.setPeerPub(peer.pub)
                    this.socket.send(peer.myPub, 0, peer.myPub.length, peer.port, peer.ip, showError)
                }, 1000)
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

                let tryToResponseCount = 0
                let tryToResponse = setInterval(() => {
                    let randomResponse = Crypt.rand(Crypt.ecdh.length)

                    if(typeof this.peers[`${message[1]}:${message[2]}`] !== 'undefined')
                        return clearInterval(tryToResponse)

                    this.socket.send(randomResponse, 0, randomResponse.length, message[2], message[1], showError)
                    tryToResponseCount++

                    if(__.MAX_TRIAL < tryToResponseCount)
                        return clearInterval(tryToResponse)
                }, 1000)

                return

            //tracker
            case 'welcome':
                /**
                 * Tracker says welcome!
                 */
                let setPubMessage = tracker.key.encrypt(str( ['setPub', this.myPub] ))

                if(typeof message[1] === 'string' && typeof message[2] === 'number'){
                    let myAddress = `${message[1]}:${message[2]}`

                    if(this.myAddress.length <= 0)
                        console.log(`Your public address: ${myAddress}`)

                    this.myAddress = myAddress
                }

                this.ready = true
                tracker.connected = true
                this.socket.send(setPubMessage, 0, setPubMessage.length, remote.port, remote.address, showError)
                tracker.keepAlive = setInterval(() => this.socket.send('', 0, 0, remote.port, remote.address, showError), 6000)
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
     * @param {Peer} peer 
     */
    async handleBadPeer (message, remote, peer) {
        if(peer.isSender){
            this.deletePeer(peer)
            this.handleSocketMessage(message, remote)
        }
        else{
            this.stopPolling(peer)
            this.socket.send(peer.myPub, 0, peer.myPub.length, remote.port, remote.address, showError)
        }
    }

    /**
     * Initialize connection for the target
     * @param {Peer} peer Peer to initialize connection
     * @returns {Promise<number>} How many tries used to connect to peer (__.MAX_trial means unsuccessful)
     */
    initializeConnection (peer) {
        return new Promise(resolve => {
            if(peer.connected())
                return resolve(1)

            if(peer.public){
                this.socket.send(
                    peer.myPub, 0, peer.myPub.length,
                    peer.port,
                    peer.ip,
                    showError
                )
                resolve(1)
                return
            }

            let tracker = randTracker(this)
            let announceMessage = tracker.key.encrypt(str( [`announce`, `${peer.ip}:${peer.port}`] ))

            peer.callback = trial => resolve(trial)
            this.socket.send(announceMessage, 0, announceMessage.length, tracker.port, tracker.ip, showError)

            // Have a look at this.handleTrackerMessage() -> 'sendpub' to find more clues.
        })
    }

    /**
     * Send message to specific peer
     * @param {Peer} peer Peer to send data to
     * @param {string|Array|Buffer} data Data to be sent
     * @returns {Promise<number>} How many tries used to connect to peer? (0 means parameters invalid, __.MAX_TRIAL means unsuccessful)
     */
    async send (peer, data) {
        if(Array.isArray(data))
            if(Try(() => data = str(data)))
                return 0
        
        if(typeof data !== 'string')
            return 0

        if(data.length > __.MTU){
            console.log(`Receiver.send() should only be used with small streams (< ${__.MTU} bytes) `) //LOCALE_NEEDED
            return 0
        }

        if(typeof peer === 'string'){
            /** @type {string} */
            let peerStr = peer
            peer = this.peers[peerStr]

            if(typeof peer === 'undefined'){
                let ipAndPort = peerStr.split(':')

                if(ipAndPort.length !== 2)
                    return 0

                if(!IpRegex.test(ipAndPort[0]))
                    return 0

                peer = new Peer([
                    ipAndPort[0],
                    Return(() => parseInt(ipAndPort[1]), 1)
                ])
            }
        }
        else if(typeof peer !== 'object')
            return 0

        let connectionTrialCounter = 1

        this.addPeer(peer)

        if(!peer.connected()){
            peer.quality = __.MAX_TRIAL
            connectionTrialCounter = await this.initializeConnection(peer)

            if(__.MAX_TRIAL < connectionTrialCounter)
                return connectionTrialCounter
        }

        if(Try(() => {
            data = peer.key.encrypt(data)
            this.socket.send(data, 0, data.length, peer.port, peer.ip, showError)
        }))
            return 0

        return connectionTrialCounter
    }

    /**
     * Send media to target peer
     * @param {Peer} peer Peer to send file to
     * @param {{
     *   owner:string,
     *   position:string,
     *   index:number
     * }} info Media Information
     * @returns {Promise<Number>}
     */
    async sendMedia (peer, info) {
        let dummyQueue = {}
        let queueAwait = () => new Promise(resolve => {
            setInterval(() =>{
                if(peer.mediaStreamQueue[0] === dummyQueue)
                    resolve()
            })
        })

        peer.mediaStreamQueue.push(dummyQueue)
        await queueAwait()

        let sendMediaResult = await this.#sendMedia(peer, info)

        peer.mediaStreamQueue.splice(0,1)
        return sendMediaResult
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
        if(typeof info !== 'object')
            return __.MEDIA_STREAM_INFO_INVALID

        if( typeof info.owner !== 'string' ||
            typeof info.index !== 'number' ||
            typeof info.index !== 'string' ||
            typeof info.media !== 'number' )
            return __.MEDIA_STREAM_INFO_INVALID

        let fileLocation = `./data/${info.owner}.${info.index}`
        /** @type {FileSystem.Stats} */
        let fileStats

        switch(info.media){
            case 'avatar':
            case 'cover':
                fileLocation += '.png'
                break
            
            default:
                fileLocation += `.${info.media}`
        }

        if(Try(() => FileSystem.accessSync(fileLocation)))
            return __.MEDIA_STREAM_FILE_NOT_FOUND

        if(Try(() => fileStats = FileSystem.statSync(fileLocation)))
            return __.MEDIA_STREAM_FILE_NOT_READY

        if(fileStats.size > __.MAX_PAYLOAD || fileStats.size > 65536)
            return __.MEDIA_STREAM_FILE_TOO_LARGE

        let fileStream = FileSystem.createReadStream(fileLocation)
        let fileStreamIndex0 = 0
        let fileStreamIndex1 = 0
        let fileStreamByte = Buffer.from([])
        let fileStreamStatus
        /** @type {NodeJS.Timeout} */
        let fileStreamTimeout
        let fileStreamResolver = resolve => {
            clearTimeout(fileStreamTimeout)
            resolve(fileStreamStatus)
            fileStreamTimeout = undefined
        }
        let fileStreamAwaiter = time => {
            fileStreamTimeout = setTimeout(() => {
                fileStreamStatus = __.MEDIA_STREAM_TIME_OUT
                fileStreamResolver()
            }, time)

            return new Promise(fileStreamResolver)
        }
        let mediaSendMessage = peer.key.encrypt(
            str([
                info.owner,
                info.index,
                'media',
                typeof info.media === 'number' ? info.media : 0,
                Math.ceil(fileStats.size / 1024)
            ])
        )
        let fileStreamResendCount = 0
        /** @type {Buffer} */
        let fileStreamMissedPacket

        peer.mediaStreamCb = message => {
            if(fileStreamStatus === __.MEDIA_STREAM_DECLINED)
                return

            fileStreamStatus = message[0]
            fileStreamResolver()
        }

        this.socket.send(mediaSendMessage, 0, mediaSendMessage.length, peer.port, peer.ip, showError)

        if(await fileStreamAwaiter(8000) !== __.MEDIA_STREAM_READY)
            return fileStreamStatus

        while(true){
            if(fileStreamStatus === __.MEDIA_STREAM_DECLINED)
                // peer declined the package
                return fileStreamStatus

            if(fileStreamResendCount > __.MAX_TRIAL){
                //Too many resends, cancel package
                let mediaCancelMessage = peer.key.encrypt(Buffer.from([255,255]))

                this.socket.send(mediaCancelMessage, 0, mediaCancelMessage.length, peer.port, peer.ip, showError)
                return __.MEDIA_STREAM_TIME_OUT
            }

            if(typeof fileStreamMissedPacket === 'undefined')
                fileStreamByte = fileStream.read(__.MTU)
            else{
                // If peer missed the package, send the old one
                fileStreamByte = fileStreamMissedPacket
                fileStreamMissedPacket = undefined
            }
            
            if(!fileStreamByte) // FALSY
                break

            let mediaStream = peer.key.encrypt(
                Buffer.concat([
                    Buffer.from([
                        fileStreamIndex0,
                        fileStreamIndex1
                    ]),
                    fileStreamByte
                ])
            )

            this.socket.send(mediaStream, 0, mediaStream.length, peer.port, peer.ip, showError)
            

            if(await fileStreamAwaiter(10000) === __.MEDIA_STREAM_TIME_OUT){
                fileStreamMissedPacket = fileStreamByte
                fileStreamResendCount++
                continue
            }
            else{
                fileStreamResendCount = 0

                if(fileStreamIndex1 < 255)
                    fileStreamIndex1++
                else{
                    fileStreamIndex1 = 0

                    if(fileStreamIndex0 < 255)
                        fileStreamIndex0++
                    else
                        break
                }
            }
        }

        fileStream.close()
        
        while(true){
            // wait for peer to accept the packet
            if(fileStreamResendCount > __.MAX_TRIAL)
                return __.MEDIA_STREAM_TIME_OUT
            else
                fileStreamResendCount++

            let endOfFileMessage = peer.key.encrypt(
                Buffer.concat([
                    Buffer.from([255, 255]),
                    Crypt.rand(128 + Math.floor(Math.random() * 128))
                ])
            )

            this.socket.send(
                endOfFileMessage,
                0,
                endOfFileMessage.length,
                peer.port,
                peer.ip,
                showError
            )

            if(await fileStreamAwaiter(10000) === __.MEDIA_STREAM_TIME_OUT)
                continue
            else
                break
        }

        peer.mediaStreamCb = undefined
        return fileStreamStatus
    }

    /**
     * Start polling on this peer
     * @param {Peer} peer Peer to start polling
     */
    startPolling (peer) {
        if(peer.connected())
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
        if(typeof peer === 'number'){
            /** @type {Peer} */
            let peerToDelete = this.pollingList[peer]

            if(typeof peerToDelete === 'object'){
                if(peerToDelete.connected()){
                    this.pollingList.splice(peer, 1)
                    return true
                }
            }

            return false
        }

        if(peer.connected()){
            peer.keepAlive = false

            for(let i = 0; i < this.pollingList.length; i++){
                if(this.pollingList[i] === peer){
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
        if(typeof callback !== 'function')
            throw Error(`Callback for receiver must be a function!`)

        this.callback = callback
        this.socket.on('error', showError)
        this.socket.on('message', (msg, remote) => this.handleSocketMessage(msg, remote, 0))

        // handshake to trackers
        if(Try(() => {
            /** @type {Array} */
            let trackersLoaded = this.storage.read('trackers')

            trackersLoaded.forEach((el, ind) => {
                let newTracker = new Tracker([
                    el.ip,
                    el.port,
                    el.pub
                ])

                delete trackersLoaded [ind]

                if(typeof newTracker.key === 'undefined')
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

            this.helloTracker(tracker)
        }

        console.log(`Receiver will be known as '${this.myPub}'.`)

        //Polling
        setInterval(() => {
            let i = 0
            /** @type {Peer} */
            let peer

            while(i < this.pollingList.length){
                peer = this.pollingList[i]

                if(currentTime - peer.lastAccess > __.LAST_ACCESS_LIMIT){
                    this.stopPolling(peer)

                    if(peer.isSender)
                        this.deletePeer(peer)
                    continue
                }

                this.socket.send('', 0, 0, peer.port, peer.ip, showError)
                i++
            }
        },10000)
    }
}

module.exports = Receiver