/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const FileSystem = require('fs')

const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Receiver = require('./fn.receiver')
const Try = require('./fn.try.catch')
const Web = require('./fn.web')

const Acc = require('./data/acc')
const Post = require('./data/post')
const PostLike = require('./data/post.like')

/** Debugging parameters */
const debug = {
    packetCount: 0
}

/** @type {string} Web Directory */
const wDir = `./src/web/`

/**
 * Stringify JSON object or array
 * @param {Object} o JSON or array object to be stringified
 * @returns {string}
 */
const str = o => JSON.stringify(o)

/** @type {string} Page body to be used as template */
const appBody = FileSystem.readFileSync(`${wDir}html/body.html`, {encoding: 'utf-8'})

/** HTTP web front-end app object*/
const app = new Web()
app.get('/', (req,res) => {
    res.send(
        appBody
            .split(`{{title}}`)
            .join(``)
            .split(`{{noti-number}}`)
            .join(``)
            .split(`{{noti-list}}`)
            .join(``)
            .split('{{url-my-avatar}}')
            .join(`/web/img/avatar2.png`)
    )
})
app.get('/web/:type/:file', async (req, res) => {
    let fileLocation = wDir + req.params.type + '/' + req.params.file

    if(Try(() => FileSystem.accessSync(fileLocation)))
        return

    /** @type {string} */
    let contentType
    let encoding = 'utf-8'
    /** @type {string[]} */
    let fileName = req.params.file.split('.')

    switch(req.params.type){
        case 'html':
            contentType = 'text/html'
            break

        case 'css':
            contentType = 'text/css'
            break

        case 'js':
            contentType = 'text/javascript'
            break

        case 'text':
            contentType = 'text/plain'
            break

        case 'img':
            contentType = `image/${fileName[fileName.length - 1]}`
            encoding = 'binary'
            break

        case 'fas':
            switch(fileName[fileName.length - 1]){
                case 'css':
                case 'txt':
                    contentType = 'text/css'
                    break

                case 'svg':
                    contentType = 'image/svg+xml'
                    break
                
                case 'ttf':
                case 'woff':
                case 'woff2':
                    contentType = `fonts/${fileName[fileName.length - 1]}`
                    encoding = 'binary'
                    break
            }
            break

        default:
            contentType = 'appliaction/octet-stream'
            encoding = 'binary'
            break
    }

    let file = FileSystem.readFileSync(fileLocation, {encoding: encoding})

    res.contentType(contentType)
    res.send(file, encoding)
})

/** Receiver Object*/
const receiver = new Receiver((peer, result) => {
    if(!result.success)
        return

    let data = result.data

    /**
     * [0]:string   post owner (public key)
     * [1]:number   post position
     * [2]:string   social Command (such as post, like, comment, share, mention)
     * :
     * [.]:any
     * [n]:string   Signature (optional)
     */

    if( typeof data[0] !== 'string' ||
        typeof data[1] !== 'number' ||
        typeof data[2] !== 'string' )
        return

    if(!receiver.storage.access(`${data[0]}`)) // account not exist
        return

    switch(data[2]){

        case 'like':
            /**
             * Like a post
             * 
             * [3]:string       like owner
             * [4]:number       like time
             * [5]:string       like signature
             */
            let likeFile = `${data[0]}.${data[1]}.like.${data[3]}`

            if(receiver.storage.access(likeFile)) //like file exists
                return

            let like = new PostLike([
                d[3],
                d[4],
                d[0],
                d[1],
                d[5]
            ])

            if(!like.valid)
                return

            if(!receiver.storage.write(likeFile, like.export()).success)
                return
            
            let likeCount = 0
            let likeCountFileLocation = `${data[0]}.${data[1]}.likes`
            let readLikeCountFile = receiver.storage.read(likeCountFileLocation)

            if(readLikeCountFile.success)
                likeCount = readLikeCountFile.data

            likeCount++

            if(!receiver.storage.write(likeCountFileLocation, likeCount).success)
                return

            receiver.broadcast(data[0], __.BROADCAST_AMOUNT, data)
            return

        case 'post':
            /**
             * - Can also be used for comments (mention)
             * 
             * [3]:string[]     post media
             * [4]:string[]     post media type
             * [5]:PostPointer  post mention (exported as array)
             * [6]:string[]     post tag (public key)
             * [7]:string       post text
             * [8]:nubmer       post time
             * [9]:string       post signature
             */
            if( !Array.isArray(data[3]) ||
                !Array.isArray(data[4]) ||
                !Array.isArray(data[5]) ||
                !Array.isArray(data[5]) ||
                typeof data[7] !== 'string' ||
                typeof data[8] !== 'string' )
                return

            let newPostLocation = `${data[0]}.${data[1]}`

            if(receiver.storage.access(newPostLocation)) //post exists
                return

            let newPost = new Post([
                data[0],
                data[3],
                data[4],
                data[5],
                data[6],
                data[7],
                data[8],
                data[9]
            ])

            if(!newPost.valid)
                return

            if(!receiver.storage.write(newPostLocation, postData).success)
                return

            receiver.broadcast(data[0], __.BROADCAST_AMOUNT, data)
            return

        case 'media':
            /**
             * !! UNSTABLE, NOT TESTED !!
             * 
             * [3]:number media index
             * [4]:number media total packets that will be received
             */
            if(peer.mediaStream)
                return

            if( typeof data[3] !== 'number' ||
                typeof data[4] !== 'number' )
                return

            if(data[4].length > __.MAX_PAYLOAD)
                return
            
            let mediaPostLocation = `${data[0]}.${data[1]}`
            let mediaLocation = `${mediaPostLocation}.media.${data[3]}`
            let postMediaFile = receiver.storage.read(mediaPostLocation)

            if(!postMediaFile.success) //no such post ever exist
                return

            let postMedia = new Post(postMediaFile.data)

            if(typeof postMedia.media[data[3]] === `undefined`) //no such media ever logged
                return

            if(receiver.storage.access(mediaLocation)) //media exists
                return

            peer.mediaStreamLocation = mediaLocation
            peer.mediaStreamPacketsTotal = data[4]
            peer.mediaStreamPacketsReceived = 0
            peer.mediaStream = true
            receiver.send(peer, ['mediaReady'])
            return

        //unknown messages
        case 'what':
            return

        default:
            receiver.send(peer, [`what`])
            return
    }
})