/**
 * Micro HTTP server, with basic stuffs.
 */
const Net = require('net')

const BaseN = require('../src/base.n')
const Try = require('../src/try.catch')

const __ = require('../src/const')
const ECDHKey = require('../src/data/key.ecdh')
const Locale = require('../src/locale')
const Peer = require('../src/data/peer')
const Result = require('../src/data/result')
const SymmetricKey = require('../src/data/key.symmetric')

const locale = new Locale()
const paramInvalid = new Result({message: locale.str.paramInvalid})
const storage = require('../src/storage')(locale)

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
                if(received.length <= __.MAX_PAYLOAD)
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
                console.error(err)
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
    let self = this

    /** @type {boolean} This is 'Server' object*/
    this.isServer = true

    /** Key manager*/
    this.key = {
        /** @type {ECDHKey} Currently used key*/
        current: null,
        /**
         * Load key from specific location, if can't, build a new one.
         * @param {string} location Key location
         */
        load: location => {
            let keyRead = storage.read(typeof location === 'string' ? location : __.KEY.LOCATION)
            if(keyRead.success) self.key.current = new ECDHKey(keyRead.data)
            else self.key.new()
        },
        /**
         * Create a new key for this server
         * @param {string} location Asymmetric key location to be saved
         * @param {string} password Passphrase for this key
         */
        new: location => {
            self.key.current = new ECDHKey()
            let keyWrite = storage.write(typeof location === 'string' ? location : __.KEY.LOCATION, self.key.current.export())
            if(!keyWrite.success) throw keyWrite.message
        }
    }

    /** @type {Locale} Currently used locale on this server*/
    this.locale = locale

    /** Peer functions*/
    this.peer = {
        /** @type {Peer[]} List of active peers*/
        list: [],
        /**
         * Add peer to list
         * @param {{ip: string, port: number}} options Peer parameters
         */
        add: options => {
            let newPeer = new Peer([
                options.ip,
                options.port
            ])
            self.peer.list.push(newPeer)
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
            for(let f=0; f < self.peer.list.length; f++){
                thisPeer = self.peer.list[f]
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
                    resolve(new Result({
                        message: locale.str.peer.bad
                    }))
                    peer.quality = 5
                    return
                }
                peer.quality--
                if(peer.key === null || _keyExchange === true){
                    /** @type {[SymmetricKey,any]}*/
                    let keyExchange
                    if(Array.isArray(_keyExchange)) keyExchange = _keyExchange
                    else if(Try(() => {
                        let newEC = new ECDHKey()
                        let newKey = newEC.computeSecret(peer.pub)
                        keyExchange = [newKey,{
                            ip: peer.ip,
                            port: peer.port,
                            data: newEC.get.pub()
                        }]
                    })){
                        resolve(new Result({
                            message: locale.str.peer.pubErr
                        }))
                        return
                    }
                    let keyExchangeResult = await sendMessage(keyExchange[1])
                    if(keyExchangeResult.success){
                        if(keyExchange[0].decrypt(keyExchangeResult.data) === 'nice2meetu')
                            peer.key = keyExchange[0]
                    }
                    resolve(await self.peer.send(peer,message,keyExchange))
                    return
                }
                if(Try(() => {
                    if(Array.isArray(message)) message = JSON.stringify(message)
                    else if(typeof message !== 'string'){
                        resolve(paramInvalid)
                        return
                    }
                    message = peer.key.encrypt(message)
                })){
                    resolve(new Result({
                        message: locale.str.json.parseErr
                    }))
                    return
                }
                let received = await sendMessage({
                    ip: peer.ip,
                    port: peer.port,
                    data: message
                })
                if(received.data === null){
                    resolve(await self.peer.send(peer,message, true))
                    return
                }
                resolve(Try(() => 
                    new Result({
                        success: true,
                        data: JSON.parse(peer.key.decrypt(received.data))
                    }),
                    new Result({
                        message: locale.str.server.dataCorrupt
                    })
                ))
                peer.quality = 5
            })
        }
    }

    /** @type {number} Running port*/
    this.port = 25420

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
            else if(Array.isArray(data)) Try(() => socketStr = JSON.stringify(data))
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
        let peer = self.peer.find(peerProperties)
        if(peer === null) peer = self.peer.add(peerProperties)
        peer.socket = socket
        /** @type {string} Data received */
        let body = ''
        socket.setEncoding('utf-8')
        socket.on('data', chunk => {
            if(body.length <= __.MAX_PAYLOAD) body += chunk
            else peer.socket.destroy()
        })
        socket.on('end',() => {
            if(Try(() => {
                if(body.length === 0) throw 'Bad Peer'
                if(peer.key === null){
                    if(body.length !== 194) throw 'Illegal key length'
                    peer.key = self.key.current.computeSecret(BaseN.decode(body, '62'))
                    self.response(peer, 'nice2meetu')
                    return
                }
                body = JSON.parse(peer.key.decrypt(body))
            })) peer.key = null
            if(!Array.isArray(body)){
                self.response(peer)
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
        server.listen(self.port)
        self.port = server.address().port
        console.log('Server is now listening on port '+String(self.port))
    }

    if(typeof callback === 'function') {
        self.key.load()
        self.start()
    }
}

module.exports = Server