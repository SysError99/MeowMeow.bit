/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
const Receiver = require('./fn.receiver')
const Web = require('./fn.web')

const Acc = require('./data/acc')
const Post = require('./data/post')
const PostLike = require('./data/post.like')

/**
 * Stringify JSON object or array
 * @param {Object} o JSON or array object to be stringified
 * @returns {string}
 */
const str = o => JSON.stringify(o)

/** HTTP web front-end app object*/
const app = new Web()
app.get('/', (req,res) => {
    res.send('Hello world!')
})
app.get('/:var', (req,res) => {
    let txt = ''
    if(typeof req.query.name === 'string'){
        txt = ', and your name is ' + req.query.name
    }
    res.send('Your paramter is ' + req.params.var+txt)
})
app.get('/find/:id', (req,res) => {
    res.send('You request for: '+req.params.id)
})

/** Receiver Object*/
const receiver = new Receiver((peer, data) => {
    console.log(`${data.data}`)

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

    if(!receiver.storage.access(`${data[0]}`)) // !account exists
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

            if(!receiver.storage.access(likeFile))
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

            if(!receiver.storage.write(likeFile, like.export()))
                return
            
            let likeCount = 0
            let likeCountFileLocation = `${data[0]}.${data[1]}.likes`
            let readLikeCountFile = receiver.storage.read(likeCountFileLocation)

            if(readLikeCountFile.success)
                likeCount = readLikeCountFile.data

            likeCount++

            if(!receiver.storage.write(likeCountFileLocation, likeCount))
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

            if(receiver.storage.access(newPostLocation))
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
             * [3]:number media number
             */
            if(typeof data[3] !== 'number')
                return
            
            let mediaPostLocation = `${data[0]}.${data[1]}`
            let mediaLocation = `${mediaPostLocation}.media.${data[3]}`
            let postMedia = new Post(receiver.storage.read(mediaPostLocation))

            if(typeof postMedia.media[data[3]] === `undefined`)
                return

            if(receiver.storage.access(mediaLocation))
                return
            
            if(peer.mediaStream !== null)
                return

            peer.mediaStreamLocation = mediaLocation
            peer.mediaStream = receiver.storage.writeStream(mediaLocation)
            return

        default:
            return
    }
})