/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const FileSystem = require('fs')

const __ = require('./const')
const Receiver = require('./fn.receiver')
const Return = require('./fn.try.return')
const Web = require('./fn.web').web
const WebUI = require('./web.ui')
const WebAccount = require('./web.account')
const WebFileServer = require('./web.file.server')

const Acc = require('./data/acc')
const Post = require('./data/post')
const PostLike = require('./data/post.like')

/** @type {string[]} List of all notifications*/
const notifications = []

/** @type {number} Currently read head of timeline post*/
let currentTimelinePost = 0

/** @type {Receiver} Receiver Object*/
const receiver = new Receiver(async (peer, result) => {
    if (!result.success)
        return

    let data = result.data

    if (typeof data[0] !== 'string')
        return

    if (data[0] === 'account') {
        /**
         * Account adding section.
         */

        if (!Array.isArray(data[1]))
            return
        
        let newAcc = new Acc(data[1])

        //TODO: check if this peer is actually need this account
    } else if (typeof data[2] !== 'number' || typeof data[2] !== 'string')
        return
    
    if (!await receiver.storage.promise.access(data[1])) // account not exist
        return

    /**
     * Peer action section.
     * 
     * Commands that do not have [0],[1],[2], will use this general parameters:
     * [0]:string           social Command (such as post, like, comment, share, mention)
     * [1]:string           account public key
     * [2]:number|string    account section (avatar, cover, posts, etc.)
     * :
     * [n]:any
     */
    switch (data[0]) {
        case 'request':
            /**
             * Peer make a request for specific resources.
             * [3]:string       What resource to request
             */
            switch (data[3]) {
                case 'account':
                    /**
                     * Account Request
                     */
                    if (!await receiver.storage.promise.access(data[1]))
                        return receiver.send(peer, ['accountNotFound'])

                    receiver.send(peer, [
                        'account',
                        new Acc(await receiver.storage.promise.read(data[1])).exportPub()
                    ])
                    return

                case 'media':
                    /**
                     * Media request
                     * [4]:string   media index
                     */
                    let requestMediaLocation = `${data[1]}.${data[2]}${typeof data[4] === 'number' ? `.${data[4]}`: ''}`

                    if (!await receiver.storage.promise.access(requestMediaLocation))
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
                        return receiver.send(peer, ['invalidPostFormat'])

                    let requestPostLocation = `${data[1]}.${data[2]}`

                    if (!await receiver.storage.promise.access(requestPostLocation))
                        return receiver.send(peer, ['postNotFound'])

                    let requestPost = new Post(await receiver.storage.promise.read(requestPostLocation))

                    receiver.send(peer, [
                        'post',
                        data[1],
                        data[2],
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

        case 'like':
            /**
             * Like a post
             * [3]:string       like owner
             * [4]:number       like time
             * [5]:string       like signature
             */
            let likeFile = `${data[1]}.${data[2]}.like.${data[3]}`

            if (receiver.storage.access(likeFile)) //like file exists
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

            if (!receiver.storage.write(likeFile, like.export()))
                return
            
            let likeCount = 0
            let likeCountFileLocation = `${data[1]}.${data[2]}.likes`

            if (receiver.storage.access(likeCountFileLocation))
                likeCount = receiver.storage.read(likeCountFileLocation)

            likeCount++

            receiver.storage.write(likeCountFileLocation, likeCount)
            receiver.broadcast(data[1], __.BROADCAST_AMOUNT, data)
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
                !Array.isArray(data[5]) ||
                !Array.isArray(data[5]) ||
                typeof data[7] !== 'string' ||
                typeof data[8] !== 'string' )
                return

            let newPostLocation = `${data[1]}.${data[2]}`

            if (receiver.storage.access(newPostLocation)) //post exists
                return

            let newPost = new Post([
                data[1],
                data[3],
                data[4],
                data[5],
                data[6],
                data[7],
                data[8],
                data[9]
            ])

            if (!newPost.valid)
                return

            if (!receiver.storage.write(newPostLocation, postData))
                return

            receiver.broadcast(data[1], __.BROADCAST_AMOUNT, data)
            return

        case 'media':
            /**
             * !! UNSTABLE, NOT TESTED !!
             * 
             * Sending media stream request
             * [3]:number media index
             * [4]:number media total packets that will be received
             */
            if (typeof peer.mediaStream !== 'undefined')
                return receiver.send(peer, [__.MEDIA_STREAM_NOT_READY])

            if (typeof data[3] !== 'number' ||
                typeof data[3] !== 'string' ||
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
                    mediaHash = new Acc(receiver.storage.read(data[1])).img[data[2]]
                    requestMediaLocation += '.png'
                    break

                default:
                    if (!receiver.storage.access(requestMediaLocation))
                        return receiver.send(peer, [__.MEDIA_STREAM_POST_NOT_FOUND])

                    mediaHash = new Post(receiver.storage.read(requestMediaLocation)).media[data[3]]
                    requestMediaLocation += `.${data[3]}`
                    break
            }

            if (!mediaHash)
                return receiver.send(peer, [__.MEDIA_STREAM_NO_MEDIA])

            if (receiver.storage.bin.access(requestMediaLocation))
                return receiver.send(peer, [__.MEDIA_STREAM_MEDIA_FOUND])

            await peer.openMediaStream(requestMediaLocation, mediaHash, data[4])
            receiver.send(peer, [__.MEDIA_STREAM_READY])
            return

        //unknown messages
        case 'what':
            return

        default:
            receiver.send(peer, [`what`])
            return
    }
})

/** HTTP web front-end app object*/
const web = new Web({port:1024})

/** Web account manager module */
const webAccount = new WebAccount(receiver)

/** Web file server, for serving static files */
const webFileServer = new WebFileServer(receiver, web)

web.get('/', (req,res) => {
    currentTimelinePost = Return(() => receiver.storage.read('posts'), 0) //move to latest post

    res.send(WebUI.body({
        avatar: webAccount.avatar,
        body: WebUI.postSubmit(),
        script: WebUI.script('/web/js/post-fetch.js')
    }))
})
web.get('/me', (req, res) => {
    res.status(302, {Location: '/account-list'})
    res.send('')
})

// Account
web.get('/account-create', async (req, res) => await webAccount.create(res))
web.get('/account-info/:pub', async (req,res) => await webAccount.info(req, res))
web.get('/account-list', async (req, res) => await webAccount.list(res))
web.post('/account-temp-avatar', async (req,res) => await webAccount.tempAvatar(req, res))
web.post('/account-update', async (req, res) => await WebRequest.update(req, res))

// File Server
web.get('/:location/:type/:file', async (req, res) => await webFileServer.serve(req, res))

// Post
web.get('/timeline', (req, res) => {
    if (webAccount.active === undefined)
        return res.send(WebUI.login())

    let currentPostLocation = `${webAccount.active.key.public}.timeline.${currentTimelinePost}`

    if (!receiver.storage.access(currentPostLocation))
        return res.send('') //No such post, leave it blank here

    res.send('UNIMPLEMENTED')
    // let postPointer = new PostPointer(receiver.storage.read(currentPostLocation))
    // TODO: render timeline post
})
web.get('/post/:pub/:number', (req, res) => {
    res.send('UNIMPLEMENTED')
    // TODO: render specified post
})

// Inititialization
if (FileSystem.readdirSync('./data/').length <= FileSystem.readdirSync('./default/').length) {
    let path = require("path")

    /**
     * @param {string} src 
     * @param {string} dest 
     */
    let copyDirSync = (src, dest) => {
        FileSystem.mkdirSync(dest, { recursive: true })

        let entries = FileSystem.readdirSync(src, { withFileTypes: true })

        for (let entry of entries) {
            let srcPath = path.join(src, entry.name)
            let destPath = path.join(dest, entry.name)

            entry.isDirectory() ?
                copyDirSync(srcPath, destPath) :
                FileSystem.copyFileSync(srcPath, destPath)
        }
    }

    copyDirSync('./default', './data')
}

if (!receiver.storage.access('posts'))
    receiver.storage.write('posts', 0)
