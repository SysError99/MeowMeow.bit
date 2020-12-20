/**
 * Micro HTTP server, with basic stuffs.
 */
const FileSystem = require('fs')
const Net = require('net')

const _ = require('./const')
const AsymmetricKey = require('./model/key.asymmetric')
const Crypt = require('./crypt')
const Locale = require('./locale')
const Peer = require('./model/peer')
const Result = require('./model/result')
const SymmetricKey = require('./model/key.symmetric')

const locale = new Locale()
const paramInvalid = new Result({
    message: locale.str.paramInvalid
})

/**
 * Send data to target
 * @param {{ip:string, port:number, data:string}} params Connection parameters
 * @returns {Promise<Result>} Data result
 */
const sendMessage = function(params){
    return new Promise(function(resolve){
        if(typeof params !== 'object'){
            resolve(paramInvalid)
            return
        }
        if(
            typeof params.ip !== 'string' ||
            typeof params.port !== 'number' ||
            typeof params.data !== 'string'
        ){
            resolve(paramInvalid)
            return
        }
        if(params.data.length === 0){
            resolve(new Result({
                message: locale.str.server.strEmpty
            }))
            return
        }
        let socket = Net.createConnection({
            host: params.ip,
            port: params.port
        }, function(){
            let received = ''
            socket.setEncoding('utf-8')
            socket.on('data', function(chunk){
                if(received.length <= _.MAX_PAYLOAD)
                    received += chunk
                else{
                    socket.destroy()
                    resolve(new Result({
                        message: locale.str.server.strTooLarge
                    }))
                }
            })
            socket.on('end', function(){
                socket.destroy()
                resolve(new Result({
                    success: true,
                    data: received
                }))
            })
            socket.on('error', function(err){
                console.error('E -> <Module:Server>.send: Error during connection: ' + err.message)
                resolve(new Result({
                    message: locale.str.server.conErr + err.message
                }))
            })
            socket.end(params.data)
        })
        setTimeout(function(){
            resolve(new Result({
                message: locale.str.server.timeOut
            }))
            socket.destroy()
        },30000)
    })
}

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

    /** @type {Locale} Currently used locale on this server*/
    this.locale = locale

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
         * @param {Object} message Message to be sent
         * @returns {Promise<Result>} Result object
         */
        send: function(peer, message){
            return new Promise(async function(resolve){
                let payload = ''
                let received = null
                if(typeof message !== 'object'){
                    resolve(paramInvalid)
                    return
                }
                if(peer.pub === ''){
                    resolve(new Result({
                        message: locale.str.server.noPub
                    }))
                    return
                }
                if(peer.quality <= 0){
                    peer.quality = 5
                    resolve(new Result({
                        message: locale.str.peer.bad
                    }))
                    return
                }
                peer.quality--
                if(peer.key === null){
                    let newKey = new SymmetricKey()
                    let keyExchangeResult = await sendMessage({
                        ip: peer.ip,
                        port: peer.port,
                        data: Crypt.public.encrpyt(JSON.stringify(newKey.export()), peer.pub)
                    })
                    if(!keyExchangeResult.success){
                        resolve(keyExchangeResult)
                        return
                    }if(newKey.decrypt(keyExchangeResult.data) !== 'nice2meetu'){
                        resolve(await _this.peer.send(peer,message))
                        return
                    }
                    peer.key = newKey
                }
                try{
                    payload += peer.key.encrypt(JSON.stringify(message))
                }catch(e){
                    console.error('E -> Server.peer.send: error while encrypting: ' + e)
                    resolve(new Result({
                        message: locale.str.json.parseErr + e
                    }))
                    return
                }
                received = await sendMessage({
                    ip: peer.ip,
                    port: peer.port,
                    data: payload
                })
                if(!received.success){
                    resolve(received)
                    return
                }
                if(received.data === ''){
                    peer.key = null
                    resolve(await _this.peer.send(peer,message))
                    return
                }
                try{
                    resolve(new Result({
                        success: true,
                        data: JSON.parse(peer.key.decrypt(received.data))
                    }))
                    peer.quality = 5
                }catch(e){
                    console.error('E -> Server.peer.send: Received: While parse: ' + e)
                    resolve(new Result({
                        message: locale.str.server.dataCorrupt
                    }))
                    return
                }
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
        let socketStr = ''
        try{
            if(typeof data === 'object') socketStr = JSON.stringify(data)
            else if(typeof data === 'string') socketStr = data
            if(peer.key !== null) socketStr = peer.key.encrypt(socketStr)
            else if(socketStr !== '') socketStr = ''
        }catch(e){
            console.error('E -> Server.response: ' + e)
            socketStr = ''
        }
        peer.socket.end(socketStr, 'utf-8', function(){
            peer.socket.destroy()
        })
    }

    /** @type {Net.Server} TCP server*/
    let server = Net.createServer({
        allowHalfOpen:true
    }, function(socket){
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
            if(body.length <= _.MAX_PAYLOAD) body += chunk
            else peer.socket.destroy()
        })
        socket.on('end',function(){
            if(peer.key === null){
                try{
                    peer.key = new SymmetricKey(JSON.parse(_this.key.current.decrypt(body)))
                    _this.response(peer, 'nice2meetu')
                }catch(e){
                    console.error('E -> Server.on(\'end\'): while decrypting [0]: ' + e)
                    _this.response(peer)
                }
                return
            }
            try{
                callback(peer, JSON.parse(peer.key.decrypt(body)))
            }catch{
                _this.response(peer)
                peer.key = null
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