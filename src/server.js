/**
 * Micro HTTP server, with basic stuffs.
 */
const FileSystem = require('fs')
const Net = require('net')

const _ = require('./const')
const AsymmetricKey = require('./model/key.asymmetric')
const Crypt = require('./crypt')
const Peer = require('./model/peer')
const Result = require('./model/result')
const SymmetricKey = require('./model/key.symmetric')

/**
 * @callback RequestFunction
 * @param {Peer} peer Peer object
 * @param {Object} data Data object
 */
/**
 * HTTP server object.
 * @param {RequestFunction} callback Callback to handle server
 */
const Server = function(callback){
    /** This object.*/
    let _this = this

    /** @type {boolean} This is 'Server' object*/
    this.isServer = true

    /** Key manager*/
    this.key = {
        /** @type {AsymmetricKey} Currently used asymmetric key*/
        current: null,
        /**
         * Load key from specific location, if can't, build a new one.
         * @param {string} location Key location
         */
        load: function(location){
            try{
                _this.key.current = new AsymmetricKey(JSON.parse(FileSystem.readFileSync(typeof location === 'string' ? location : _.KEY.LOCATION, {encoding: 'utf-8'})))
            }catch{
                console.log('W -> Server.Create: It seems like you don\'t have any active key, creating a new one.')
                _this.key.new()
            }
        },
        /**
         * Create a new key for this server
         * @param {string} location Asymmetric key location to be saved
         * @param {string} password Passphrase for this key
         */
        new: function(location, password){
            _this.key.current = new AsymmetricKey((typeof password === 'string') ? password : '')
            try{
                FileSystem.writeFileSync(typeof location === 'string' ? location : _.KEY.LOCATION, JSON.stringify(_this.key.current.export()))
            }catch(ee){
                console.error('E -> Server.key.new: Can\'t save new key file, ' + ee)
            }
        }
    }

    /** @type {boolean} Is server online now?*/
    this.online = false

    /** Peer functions*/
    this.peer = {
        /** @type {Peer[]} List of active peers*/
        list: [],
        /**
         * Add peer to list
         * @param {{ip: string, port: number}} options Peer parameters
         */
        add: function(options){
            let newPeer = new Peer(options)
            _this.peer.list.push(newPeer)
            return newPeer
        },
        /**
         * Find active peers, if not found, add it
         * @param {{ip: string, port: number, socket: Net.Socket}} key Key to search
         * @returns {Peer} Found peer
         */
        find: function(key){
            /** @type {Peer} Current peer*/
            let thisPeer
            for(let f=0; f < _this.peer.list.length; f++){
                thisPeer = _this.peer.list[f]
                if(
                    key.ip === thisPeer.ip ||
                    key.port === thisPeer.port
                )
                    return thisPeer
            }
            return null
        },
        /**
         * Send message to peer
         * @param {Peer} peer Target peer
         * @param {Object|string} message Message to be sent
         * @param {boolean} reset Reset symmetric key?
         * @returns {Promise<Result>} Result object
         */
        send: function(peer, message, reset){
            return new Promise(function(resolve){
                let socket = Net.createConnection({
                    host: peer.ip,
                    port: peer.port
                }, function(){
                    if(peer.pub === ''){
                        resolve(new Result({
                            message: 'Don\'t know target public key, can\'t communicate safely'
                        }))
                        return
                    }
                    /** @type {string|null} */
                    let payload = ''
                    if(peer.key === null){
                        peer.key = new SymmetricKey()
                        payload += Crypt.public.encrpyt(JSON.stringify(peer.key.export()), peer.pub) + '\n'
                    }
                    if(typeof message === 'string'){
                        if(message !== '')
                            payload += peer.key.encrypt(message)
                        else{
                            resolve(new Result({
                                message: 'Message is empty'
                            }))
                            return
                        }
                    }else if(typeof message === 'object'){
                        try{
                            payload += peer.key.encrypt(JSON.stringify(message))
                        }catch(e){
                            console.error('E -> Server.peer.send: error while encrypting: ' + e)
                            payload = null
                        }
                    }else{
                        resolve(new Result({
                            message: 'Invalid message type'
                        }))
                        return
                    }
                    let received = ''
                    socket.setEncoding('utf-8')
                    socket.on('data', function(chunk){
                        if(received.length <= _.MAX_PAYLOAD)
                            received += chunk
                        else
                            socket.destroy()
                    })
                    socket.on('end', function(){
                        peer.knowMyKey = true
                        if(received === ''){
                            resolve(new Result({
                                message: 'Server responded with nothing'
                            }))
                            return
                        }
                        /** @type {Object} */
                        let decrypted
                        try{
                            decrypted = JSON.parse(peer.key.decrypt(received))
                        }catch(e){
                            console.error('E -> Server.peer.send: Received: While parse: ' + e)
                            decrypted = received
                        }
                        socket.destroy()
                        resolve(new Result({
                            success: true,
                            data: decrypted
                        }))
                    })
                    socket.on('error', function(err){
                        resolve(new Result({
                            message: 'Error occured during connection: ' + err.message
                        }))
                    })
                    if(payload !== null)
                        socket.end(payload + (typeof reset === 'boolean' ? (reset ? '\n' : '') : ''))
                    else{
                        console.error('E -> Server.send: Invalid data type')
                        resolve(new Result({
                            message: 'Data structure to be set is invalid'
                        }))
                        socket.destroy()
                    }
                })
            })
        }
    }

    /** @type {number} Running port*/
    this.port = 8080

    /**
     * Send data back to client (peer)
     * @param {Peer} peer Peer object
     * @param {string|any} data JSON object or string
     */
    this.response = function(peer, data){
        /** @type {string} */
        let socketStr
        try{
            if(typeof data === 'object')
                socketStr = JSON.stringify(data)
            else if(typeof socket === 'string')
                socketStr = data
            else
                socketStr = ''
            socketStr = peer.key.encrypt(socketStr)
        }catch(e){
            socketStr = ''
            console.error('E -> Server.response: ' + e)
        }
        peer.socket.end(socketStr, 'utf-8', function(){
            peer.socket.destroy()
        })
    }

    /** @type {Net.Server} TCP server*/
    let server = Net.createServer(
        {
            allowHalfOpen:true
        },
    function(socket){
        let addr = socket.address()
        let peerProperties = {
            ip: addr.address,
            port: addr.port
        }
        let peer = _this.peer.find(peerProperties)
        if(peer === null)
            peer = _this.peer.add(peerProperties)
        peer.socket = socket
        /** @type {string|string[]} Data received */
        let body = ''
        socket.setEncoding('utf-8')
        socket.on('data', function(chunk){
            if(body.length <= _.MAX_PAYLOAD)
                body += chunk
            else
                _this.response(peer)
        })
        socket.on('end',function(){
            let decryptIndex = 1
            body = body.split('\n')
            if(body.length === 1)
                decryptIndex = 0
            else if(body[0].length > 0){ // decrypt a key
                if(peer.key === null || body.length === 3){ // no key or key changing request
                    try{
                        peer.key = new SymmetricKey(JSON.parse(_this.key.current.decrypt(body[0])))
                    }catch(e){
                        console.error('E -> Server.on(\'end\'): while decrypting [0]: ' + e)
                    }
                }
            }
            if(peer.key === null){
                _this.response(peer)
                return
            }
            try{
                /** @type {{res: string, data: any}} Data received*/
                let decrypted = JSON.parse(peer.key.decrypt(body[decryptIndex]))
                callback(peer, decrypted)
            }catch(e){
                console.error('E -> Server.on(\'end\'): Error on decrypting [1]: ' + e)
                _this.response(peer)
            }
        })
        socket.on('error',function(err){
            console.error('E -> Server.on(\'error\'): Error on socket: ' + err.message)
        })
    })

    /**
     * Start a server.
     */
    this.start = function(){
        _this.port = 1024 + Math.floor(Math.random() * 64510)
        try{
            server.listen(_this.port)
            _this.online = true
            console.log('Server is now listening on port '+String(_this.port))
        }catch(err){
            console.error('E -> Port '+String(_this.port)+' can\'t be established due to: ' + err + ', trying other port.')
            setTimeout(_this.start,1000)
        }
    }
    
    if(typeof callback === 'function') {
        _this.key.load()
        _this.start()
    }
}

module.exports = Server