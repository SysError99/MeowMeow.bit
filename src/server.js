/**
 * Micro HTTP server, with basic stuffs.
 */
const Net = require('net')

const __ = require('./const')
const AsymmetricKey = require('./model/key.asymmetric')
const Crypt = require('./crypt')
const Locale = require('./locale')
const Peer = require('./model/peer')
const Result = require('./model/result')
const SymmetricKey = require('./model/key.symmetric')

const locale = new Locale()
const paramInvalid = new Result({message: locale.str.paramInvalid})
const storage = require('./storage')(locale)

process.on('uncaughtException', err => {
    switch(err.code){
        case 'ECONNREFUSED':
            console.error(err)
            break
        default:
            throw err
    }
})

/**
 * Send data to target
 * @param {{ip:string, port:number, data:string}} params Connection parameters
 * @returns {Promise<Result>} Data result
 */
const sendMessage = params => {
    return new Promise(resolve => {
        if(params.data.length === 0){
            resolve(new Result({
                message: locale.str.server.strEmpty
            }))
            return
        }
        let socket = Net.createConnection({
            host: params.ip,
            port: params.port
        }, () => {
            let received = ''
            let connTimeout = setTimeout(() => {
                resolve(new Result({
                    message: locale.str.server.timeOut
                }))
                socket.destroy()
            },30000)
            socket.setEncoding('utf-8')
            socket.on('data', chunk => {
                if(received.length <= _.MAX_PAYLOAD)
                    received += chunk
                else{
                    socket.destroy()
                    clearTimeout(connTimeout)
                    resolve(new Result({
                        message: locale.str.server.strTooLarge
                    }))
                }
            })
            socket.on('end', () => {
                socket.destroy()
                clearTimeout(connTimeout)
                if(received.length === 0)
                    resolve(new Result())
                else
                    resolve(new Result({
                        success: true,
                        data: received
                    }))
            })
            socket.on('error', err => {
                console.error('E -> <Module:Server>.send: Error during connection: ' + err.message)
                resolve(new Result({
                    message: locale.str.server.conErr + err.message
                }))
            })
            socket.end(params.data)
        })
    })
}

/**
 * @callback RequestFunction
 * @param {Peer} peer Peer object
 * @param {any[]} data Data object
 */
/**
 * HTTP server object.
 * @param {RequestFunction} callback Callback to handle server
 */
const Server = function(callback){
    /** This object.*/
    let _ = this

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
        load: location => {
            let keyRead = storage.read(typeof location === 'string' ? location : __.KEY.LOCATION)
            if(keyRead.success) _.key.current = new AsymmetricKey(keyRead.data)
            else _.key.new()
        },
        /**
         * Create a new key for this server
         * @param {string} location Asymmetric key location to be saved
         * @param {string} password Passphrase for this key
         */
        new: (location, password) => {
            _.key.current = new AsymmetricKey(typeof password === 'string' ? password : '')
            let keyWrite = storage.write(typeof location === 'string' ? location : __.KEY.LOCATION, _.key.current.export())
            if(!keyWrite.success) throw keyWrite.message
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
        add: options => {
            let newPeer = new Peer(options)
            _.peer.list.push(newPeer)
            return newPeer
        },
        /**
         * Find active peers, if not found, add it
         * @param {{ip: string, port: number, socket: Net.Socket}} key Key to search
         * @returns {Peer} Found peer
         */
        find: key => {
            /** @type {Peer} Current peer*/
            let thisPeer
            for(let f=0; f < _.peer.list.length; f++){
                thisPeer = _.peer.list[f]
                if(key.ip === thisPeer.ip || key.port === thisPeer.port) return thisPeer
            }
            return null
        },
        /**
         * Send message to peer
         * @param {Peer} peer Target peer
         * @param {Array|string} message Message to be sent
         * @param {boolean|Object} [_keyExchange] (Internal parameter) Key exchange properties, no need to use this manually.
         * @returns {Promise<Result>} Result object
         */
        send: (peer, message, _keyExchange) => {
            return new Promise(async resolve => {
                if(peer.pub.length === 0){
                    resolve(new Result({
                        message: locale.str.server.noPub
                    }))
                    return
                }
                if(peer.quality <= 0){
                    peer.key = null
                    peer.quality = 5
                    resolve(new Result({
                        message: locale.str.peer.bad
                    }))
                    return
                }
                peer.quality--
                if(peer.key === null){
                    /** @type {[SymmetricKey,any]}*/
                    let keyExchange
                    if(Array.isArray(_keyExchange))
                        keyExchange = _keyExchange
                    else{
                        let newKey = new SymmetricKey()
                        keyExchange = [newKey,{
                            ip: peer.ip,
                            port: peer.port,
                            data: Crypt.public.encrypt(JSON.stringify(newKey.export()), peer.pub)
                        }]
                    }
                    let keyExchangeResult = await sendMessage(keyExchange[1])
                    if(keyExchangeResult.success){
                        if(keyExchange[0].decrypt(keyExchangeResult.data) === 'nice2meetu')
                            peer.key = keyExchange[0]
                    }
                    resolve(await _.peer.send(peer,message,keyExchange))
                    return
                }
                try{
                    if(Array.isArray(message)) message = JSON.stringify(message)
                    else if(typeof message !== 'string'){
                        resolve(paramInvalid)
                        return
                    }
                    message = peer.key.encrypt(message)
                }catch(e){
                    console.error('E -> Server.peer.send: while encrypting: ' + e)
                    resolve(new Result({
                        message: locale.str.json.parseErr + e
                    }))
                    return
                }
                let received = await sendMessage({
                    ip: peer.ip,
                    port: peer.port,
                    data: message
                })
                if(received.data === null){
                    resolve(await _.peer.send(peer,message))
                    return
                }
                try{
                    resolve(new Result({
                        success: true,
                        data: JSON.parse(peer.key.decrypt(received.data))
                    }))
                    peer.quality = 5
                }catch(e){
                    console.error('E -> Server.peer.send: received: ' + e)
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
    this.response = (peer, data) => {
        /** @type {string} */
        let socketStr = ''
        if(peer.key !== null){
            if(typeof data === 'string') socketStr = data
            else if(Array.isArray(data)){
                try{
                    socketStr = JSON.stringify(data)
                }catch(e){
                    console.error('E -> Server.response: ' + e)
                }
            }
            if(socketStr.length !== 0) socketStr = peer.key.encrypt(socketStr)
        }
        peer.socket.end(socketStr, 'utf-8', () => {
            peer.socket.destroy()
        })
    }

    /** @type {Net.Server} TCP server*/
    let server = Net.createServer({
        allowHalfOpen:true
    }, socket => {
        let addr = socket.address()
        let peerProperties = {
            ip: addr.address,
            port: addr.port
        }
        let peer = _.peer.find(peerProperties)
        if(peer === null)
            peer = _.peer.add(peerProperties)
        peer.socket = socket
        /** @type {string|string[]} Data received */
        let body = ''
        socket.setEncoding('utf-8')
        socket.on('data', chunk => {
            if(body.length <= __.MAX_PAYLOAD) body += chunk
            else peer.socket.destroy()
        })
        socket.on('end',() => {
            if(body.length === 0){
                _.response(peer)
                return
            }
            if(peer.key === null){
                try{
                    peer.key = new SymmetricKey(_.key.current.decrypt(body))
                    _.response(peer, 'nice2meetu')
                }catch(e){
                    console.error('E -> Server.on(\'end\'): get peer.key' + e)
                    _.response(peer)
                }
                return
            }
            try{
                body = JSON.parse(peer.key.decrypt(body))
                if(!Array.isArray(body)){
                    _.response(peer)
                    return
                }
            }catch(e){
                _.response(peer)
                peer.key = null
                return
            }
            callback(peer, body)
        })
        socket.on('error', err => {
            console.error('E -> Server.on(\'error\'): ' + err.message)
        })
    })

    /**
     * Start a server.
     */
    this.start = () => {
        _.port = 1024 + Math.floor(Math.random() * 64510)
        try{
            server.listen(_.port)
            _.online = true
            console.log('Server is now listening on port '+String(_.port))
        }catch(err){
            console.error('E -> Port '+String(_.port)+' can\'t be established due to: ' + err + ', trying other port.')
            setTimeout(_.start,1000)
        }
    }

    if(typeof callback === 'function') {
        _.key.load()
        _.start()
    }
}

module.exports = Server