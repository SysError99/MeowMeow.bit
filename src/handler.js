/*!
 * Peer packet handler
 * 
 * Used to handle packets sent from other peers in the network.
 */
const __ = require('./const')
const Debugger = require('./fn.debugger')
const Receiver = require('./receiver')
const WebAccount = require('./web.account')
const WebFileServer = require('./web.file.server')
const WebPost = require('./web.post')

const Acc = require('./data/acc')
const Peer = require('./data/peer.extended')
const Post = require('./data/post')
const PostPointer = require('./data/post.pointer')
const PostLike = require('./data/post.like')
const Result = require('./data/result')
const SignKey = require('./data/key.sign')
const TimeString = require('./data/time.string')

/** Peer command handler */
const Handler = class {
    /** @type {Receiver} */
    receiver
    /** @type {WebAccount} */
    webAccount
    /** @type {WebFileServer} */
    webFileServer
    /** @type {WebPost} */
    webPost

    /**
     * @param {Peer} peer 
     * @param {Result} result
     */
    async handle (peer, result) {
        if (!result.success)
            return Debugger.error(result.message)

        let allow = true
        let data = result.data
        let receiver = this.receiver
        let storage = receiver.storage.promise
        let address = `${peer.ip}:${peer.port}`
    
        if (typeof data[0] !== 'string' ||
            typeof data[1] !== 'string' ||
            typeof data[2] !== 'number' ||
            typeof data[2] !== 'string' )
            return Debugger.warn(`${address} sent malformed packet.`)

        if (!await storage.access(data[1])) // account not exist
            allow = false

        Debugger.log(`${address}://${data[0]}/${data[1]}/${data[2]}`)

        /**
         * Peer high-permission action section.
         * 
         * Commands that do not have [0],[1],[2], will use this general parameters:
         * [0]:string           social Command (such as post, like, comment, share, mention)
         * [1]:string           account public key
         * [2]:number|string    account section: avatar, cover, post (number)
         * :
         * [n]:any
         */
        switch (data[0]) {
            case 'request':
                /**
                 * Peer make a request for specific resources.
                 * [3]:string       What resource to request
                 */
                if (!allow) 
                    return

                switch (data[3]) {
                    case 'account':
                        /**
                         * Account Request
                         */
                        let requestAcc = new Acc(await storage.read(data[1]))
    
                        receiver.send(peer, [
                            'account',
                            requestAcc.description,
                            requestAcc.key.public,
                            requestAcc.name,
                            requestAcc.img.avatar,
                            requestAcc.img.cover,
                            requestAcc.public,
                            requestAcc.tag,
                            requestAcc.signature
                        ])
                        return
    
                    case 'media':
                        /**
                         * Media request
                         * [4]:string   media index
                         */
                        let requestMediaLocation = `${data[1]}.${data[2]}${typeof data[4] === 'number' ? `.${data[4]}`: ''}`
    
                        if (!await storage.access(requestMediaLocation))
                            return
    
                        receiver.sendMedia(peer, {
                            owner: data[1],
                            index: data[2],
                            media: typeof data[4] === 'number' ? media : undefined 
                        })
                        return
    
                    case 'post':
                        /**
                         * Post request
                         */
                        if (typeof data[2] !== 'number')
                            return receiver.send(peer, ['invalidPostFormat', data[1]])
    
                        let requestPostLocation = `${data[1]}.${data[2]}`
    
                        if (!await storage.access(requestPostLocation))
                            return receiver.send(peer, ['postNotFound', data[1]])
    
                        let requestPost = new Post(await storage.read(requestPostLocation))
    
                        receiver.send(peer, [
                            'post',
                            data[1],
                            requestPost.number,
                            requestPost.media,
                            requestPost.mediaType,
                            requestPost.mention,
                            requestPost.tag,
                            requestPost.text,
                            requestPost.time,
                            requestPost.signature
                        ])
                        return
                }
                return

            case 'account':
                /**
                 * Account create & update
                 * [1]:string       account public key
                 * [2]:string       account description
                 * [3]:string       account name
                 * [4]:string       account avatar (hash)
                 * [5]:string       account cover (hash)
                 * [6]:boolean      account public (anyone can post to this)
                 * [7]:string[]     account tag
                 * [8]:string       account signature
                 */
                if (typeof data[3] !== 'string' ||
                    typeof data[4] !== 'string' ||
                    typeof data[5] !== 'string' ||
                    typeof data[6] !== 'boolean' ||
                    !Array.isArray(data[7] ||
                    typeof data[8] !== 'string') )
                    return

                if (this.webAccount.followPending.indexOf(data[1]) < 0 && !await storage.access(data[1]))
                    return

                let newAcc = new Acc([
                    data[2],
                    new SignKey([
                        '',
                        '',
                        data[1]
                    ]),
                    data[3],
                    [
                        data[4],
                        data[5]
                    ],
                    0,
                    data[6],
                    data[7],
                    data[8]
                ])

                if (!newAcc.valid)
                    return

                await storage.write(data[1], newAcc.exportPub())
                await storage.write('following', (await storage.read('following')).push(data[1]))

                if (newAcc.img.avatar.length > 0) {
                    let awaitForData = resolve => {
                        let counter = __.MAX_TRIAL
                        let interval = setInterval(async () => {
                            if (await storage.access(`${data[1]}.avatar`)) {
                                clearInterval(interval)
                                resolve(true)
                            } else if (counter > 0)
                                counter--
                            else {
                                clearInterval(interval)
                                resolve(false)
                            }
                        }, 10000)
                    } 

                    receiver.send(peer, [
                        'request',
                        data[1],
                        'avatar',
                        'account'
                    ])

                    if (!await new Promise(awaitForData))
                        return
                }

                if (newAcc.img.cover.length > 0) {
                    let awaitForData = resolve => {
                        let counter = __.MAX_TRIAL
                        let interval = setInterval(async () => {
                            if (await storage.access(`${data[1]}.cover`)) {
                                clearInterval(interval)
                                resolve(true)
                            } else if (counter > 0)
                                counter--
                            else {
                                clearInterval(interval)
                                resolve(false)
                            }
                        }, 10000)
                    }

                    receiver.send(peer, [
                        'request',
                        data[1],
                        'cover',
                        'account'
                    ])

                    if (!await new Promise(awaitForData))
                        return
                }
                return

            case 'like':
                /**
                 * Like a post
                 * [3]:string       like owner
                 * [4]:number       like time
                 * [5]:string       like signature
                 */
                let likeFile = `${data[1]}.${data[2]}.like.${data[3]}`
    
                if (await storage.access(likeFile)) //like file exists
                    return
    
                let like = new PostLike([
                    d[3],
                    d[4],
                    d[0],
                    d[1],
                    d[5]
                ])
    
                if (!like.valid)
                    return
    
                if (!await storage.write(likeFile, like.export()))
                    return
                
                let likeCount = 0
                let likeCountFileLocation = `${data[1]}.${data[2]}.likes`
    
                if (await storage.access(likeCountFileLocation))
                    likeCount = await storage.read(likeCountFileLocation)
    
                likeCount++
    
                await storage.write(likeCountFileLocation, likeCount)
                await receiver.broadcast(data[1], __.BROADCAST_AMOUNT, data)
                return
    
            case 'post':
                /**
                 * Make a new post, can also be used for comments (mention)
                 * [3]:string[]     post media
                 * [4]:string[]     post media type
                 * [5]:PostPointer  post mention (exported as array)
                 * [6]:string[]     post tag (public key)
                 * [7]:string       post text
                 * [8]:nubmer       post time
                 * [9]:string       post signature
                 */
                if (!Array.isArray(data[3]) ||
                    !Array.isArray(data[4]) ||
                    //Ignore 5, not needed
                    !Array.isArray(data[6]) ||
                    typeof data[7] !== 'string' ||
                    typeof data[8] !== 'number' ||
                    typeof data[9] !== 'string' )
                    return
    
                let newPostLocation = `${data[1]}.${data[2]}`
    
                if (await storage.access(newPostLocation)) //post exists
                    return
    
                let newPost = new Post([
                    data[2],
                    data[1],
                    data[3],
                    data[4],
                    Array.isArray(data[5]) ? new PostPointer(data[5]) : undefined,
                    data[6],
                    data[7],
                    data[8],
                    data[9]
                ])
    
                if (!newPost.valid)
                    return
    
                if (!await storage.write(newPostLocation, postData))
                    return

                // TODO: categorize post by tag, and add it to timeline.
                // * If the post is the mention request, don't add it to timeline
    
                await receiver.broadcast(data[1], __.BROADCAST_AMOUNT, data)
                return
    
            case 'media':
                /**
                 * !! UNSTABLE, NOT TESTED !!
                 * 
                 * Incoming media stream
                 * [3]:number media index
                 * [4]:number media total packets that will be received
                 */
                if (!allow)
                    return

                if (typeof peer.mediaStream !== 'undefined')
                    return receiver.send(peer, [__.MEDIA_STREAM_NOT_READY])
    
                if (typeof data[3] !== 'number' ||
                    typeof data[4] !== 'number' )
                    return receiver.send(peer, [__.MEDIA_STREAM_INFO_INVALID])
    
                if (data[4].length > __.MAX_PAYLOAD || data[4].length > 65536)
                    return receiver.send(peer, [__.MEDIA_STREAM_FILE_TOO_LARGE])
                
                /** @type {string} */
                let mediaHash
                let requestMediaLocation = `${data[1]}.${data[2]}`
    
                switch (data[2]) {
                    case 'avatar':
                    case 'cover':
                        mediaHash = new Acc(await storage.read(data[1])).img[data[2]]
                        requestMediaLocation += '.png'
                        break
    
                    default:
                        if (!await storage.access(requestMediaLocation))
                            return receiver.send(peer, [__.MEDIA_STREAM_POST_NOT_FOUND])
    
                        mediaHash = new Post(await storage.read(requestMediaLocation)).media[data[3]]
                        requestMediaLocation += `.${data[3]}`
                        break
                }
    
                if (!mediaHash)
                    return receiver.send(peer, [__.MEDIA_STREAM_NO_MEDIA])
    
                if (await storage.bin.access(requestMediaLocation))
                    return receiver.send(peer, [__.MEDIA_STREAM_MEDIA_FOUND])
    
                await peer.openMediaStream(requestMediaLocation, mediaHash, data[4])
                receiver.send(peer, [__.MEDIA_STREAM_READY])
                return
    
            // Hello test
            case 'hello':
                receiver.send(peer, [`what`])
                return
        }
    }
}

module.exports = Handler