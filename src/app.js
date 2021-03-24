/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const FileSystem = require('fs')

// Setup folder
if(FileSystem.readdirSync('./data/').length <= FileSystem.readdirSync('./default/').length){
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

const __ = require('./const')
//const BaseN = require('./fn.base.n')
//const Crypt = require('./fn.crypt')
const Receiver = require('./fn.receiver')
const Try = require('./fn.try.catch')
const Return = require('./fn.try.return')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const {json, str} = require('./fn.json')

const Acc = require('./data/acc')
const Post = require('./data/post')
const PostLike = require('./data/post.like')
//const PostPointer = require('./data/post.pointer')

/** @type {string[]} List of all notifications*/
const notifications = []

/** @type {Acc} Active account*/
let acc

/** @type {Acc} Account that is currently on account info screen  */
let accInfo = undefined

/** @type {number} Currently read head of timeline post*/
let currentTimelinePost = 0

/** @type {boolean} If we are in home page */
let inHomePage = true

/**
 * Load current 'acc' avatar
 */
let loadMyAvatar = () => {
    return WebUI.avatar({
        right: true
    })
    // TODO: get real avatar loader working, this code is just a test.
}

/** @type {string} Current 'acc' avatar element for top right corner */
let myAvatar = Return(loadMyAvatar)

/** HTTP web front-end app object*/
const app = new Web()
app.get('/', (req,res) => {
    if(!inHomePage)
        inHomePage = true
    else if(acc !== undefined){
        let postCountLocation = `./${acc.key.public}.posts`

        if(!receiver.storage.access(postCountLocation))
            receiver.storage.write(postCountLocation, 0)
        
        currentTimelinePost = Return(() => receiver.storage.read(postCountLocation), 0) //move to latest post
    }

    res.send(WebUI.body({
        avatar: myAvatar,
        body: WebUI.postSubmit(),
        script: WebUI.script({
            url: '/web/js/post-fetch.js'
        })
    }))
})
app.get('/me', (req, res) => {
    res.status(302, {Location: '/account-list'})
    res.send('')
})
app.get('/account-list', async (req, res) => {
    /** @type {string[]} */
    let accList = json(await FileSystem.promises.readFile(`./data/accounts.json`, {encoding: 'utf-8'}))

    if(accList.length > 0){
        for(let a=0; a < accList.length; a++){
            let accFound = new Acc(await receiver.storage.promise.read(accList[a]))

            accList[a] = WebUI.avatar({
                url: accFound.img.profile.length > 0 ? `./data/${accFound.key.public}.avatar.png` : '',
                link: `/account-info/${accFound.key.public}`,
                text: `${accFound.name}`
            })
        }
    }
    else
        accList = WebUI.header('Empty', 1)

    res.send(WebUI.body({
        avatar: myAvatar,
        bodyLeft:typeof acc === 'object' ?
            await WebUI.profile({
                name: acc.name,
                urlImgAvatar: acc.img.profile.length > 0 ? 
                    `./data/${acc.key.public}.profile.png`
                    : '/web/img/avatar2.png',
                description: acc.description,
                pub: acc.key.public,
                dateJoin: new Date().toUTCString(),
                followers: '0'
            })
            : '',
        body: await WebUI.accList({
            list: accList
        })
    }))
})
app.get('/account-create', async (req, res) => {
    inHomePage = false
    accInfo = new Acc()
    res.send(WebUI.body({
        avatar: myAvatar,
        body: await WebUI.accInfo({
            pub: accInfo.key.public,
            avatar: WebUI.header('No profile image specified')
        })
    }))
})
app.get('/account-info/:pub', async (req,res) => {
    inHomePage = false

    if(typeof req.params.pub === 'undefined')
        return res.send(WebUI.nativeAlert('Please specify accnount public key.'))

    if(!receiver.storage.access(req.params.pub))
        return res.send(WebUI.nativeAlert(`Account public key is invalid.`))

    accInfo = new Acc(await receiver.storage.promise.read(req.params.pub))
    res.send(WebUI.body({
        avatar: myAvatar,
        body: await WebUI.accInfo({
            pub: acc.key.public,
            name: acc.name,
            tag: acc.tag.join(','),
            avatar: accInfo.img.profile.length > 0 ? WebUI.avatar({
                url: `./data/${accInfo.key.public}.avatar.png`
            }) : WebUI.header('No profile image specified')
        })
         + accInfo.key.private.length <= 0 ?
        WebUI.header(
            'This is not your account!' + 
            'Editing all of these may cause unexpected behaviors in the app.'
            ,6 // LOCALE_NEEDED
        ) : ''
    }))
})
app.post('/account-update', async (req, res) => {
    res.send('UNIMPLEMENTED')
    // TODO: Create or update account info.
})
app.get('/timeline', (req, res) => {
    inHomePage = false

    if(acc === undefined)
        return res.send(WebUI.login())

    let currentPostLocation = `${acc.key.public}.timeline.${currentTimelinePost}`

    if(!receiver.storage.access(currentPostLocation))
        return res.send('Storage Access Error.') //LOCALE_NEEDED

    res.send('UNIMPLEMENTED')
    // let postPointer = new PostPointer(receiver.storage.read(currentPostLocation))
    // TODO: render timeline post
})
app.get('/post/:pub/:number', (req, res) => {
    inHomePage = false
    res.send('UNIMPLEMENTED')
    // TODO: render specified post
})
app.get('/:location/:type/:file', async (req, res) => {
    //File server
    /** @type {string} */
    let fileLocation

    switch(req.params.locaton){
        case 'web':
            fileLocation = WebUI.dir() + req.params.type + '/' + req.params.file
            break
        
        case 'data':
            fileLocation = './data/' + req.params.file
            break
    }

    fileLocation = WebUI.dir() + req.params.type + '/' + req.params.file

    if(Try(() => FileSystem.accessSync(fileLocation)))
        return app.ev404.callback(res)

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

/** @type {Receiver} Receiver Object*/
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

            if(!receiver.storage.write(likeFile, like.export()))
                return
            
            let likeCount = 0
            let likeCountFileLocation = `${data[0]}.${data[1]}.likes`

            if(receiver.storage.access(likeCountFileLocation))
                likeCount = receiver.storage.read(likeCountFileLocation)

            likeCount++

            receiver.storage.write(likeCountFileLocation, likeCount)
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

            if(!receiver.storage.write(newPostLocation, postData))
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
            if(peer.mediaStream >= 0)
                return receiver.send(peer, [__.MEDIA_STREAM_NOT_READY])

            if( typeof data[3] !== 'number' ||
                typeof data[4] !== 'number' )
                return receiver.send(peer, [__.MEDIA_STREAM_INFO_INVALID])

            if(data[4].length > __.MAX_PAYLOAD || data[4].length > 65536)
                return receiver.send(peer, [__.MEDIA_STREAM_FILE_TOO_LARGE])
            
            let mediaPostLocation = `${data[0]}.${data[1]}`
            let mediaLocation = `${mediaPostLocation}.media.${data[3]}`

            if(!receiver.storage.access(mediaPostLocation))
                return receiver.send(peer, [__.MEDIA_STREAM_POST_NOT_FOUND])

            let postMediaFile = receiver.storage.read(mediaPostLocation)
            let postMedia = new Post(postMediaFile)

            if(typeof postMedia.media[data[3]] === `undefined`) //no such media ever logged
                return receiver.send(peer, [__.MEDIA_STREAM_NO_MEDIA])

            if(receiver.storage.access(mediaLocation)) //media exists
                return receiver.send(peer, [__.MEDIA_STREAM_MEDIA_FOUND])

            peer.openMediaStream(mediaLocation, data[4])
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
