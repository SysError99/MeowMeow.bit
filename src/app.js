/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const FileSystem = require('fs')

// Setup folder
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

const __ = require('./const')
const BaseN = require('./fn.base.n')
const Crypt = require('./fn.crypt')
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

const binEncode = {encoding: 'binary'}

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

// --- GET ---
app.get('/', (req,res) => {
    if (!inHomePage)
        inHomePage = true
    else if (acc !== undefined) {
        let postCountLocation = `./${acc.key.public}.posts`

        if (!receiver.storage.access(postCountLocation))
            receiver.storage.write(postCountLocation, 0)
        
        currentTimelinePost = Return(() => receiver.storage.read(postCountLocation), 0) //move to latest post
    }

    res.send(WebUI.body({
        avatar: myAvatar,
        body: WebUI.postSubmit(),
        script: WebUI.script('/web/js/post-fetch.js')
    }))
})
app.get('/me', (req, res) => {
    res.status(302, {Location: '/account-list'})
    res.send('')
})
app.get('/account-list', async (req, res) => {
    /** @type {string[]} */
    let accList = json(await FileSystem.promises.readFile(`./data/accounts.json`, {encoding: 'utf-8'}))

    if (accList.length > 0) {
        for (let a in accList) {
            let accFound = new Acc(await receiver.storage.promise.read(accList[a]))

            accList[a] = WebUI.avatar({
                url: `./data/png/${accFound.key.public}.avatar`,
                link: `/account-info/${accFound.key.public}`,
                text: `${accFound.name}`
            })
        }
    }
    else
        accList = WebUI.header('Empty', 1)

    res.send(WebUI.body({
        avatar: myAvatar,
        body:
            typeof acc === 'object' ?
                await WebUI.profile({
                    name: acc.name,
                    urlImgAvatar: acc.img.avatar.length > 0 ? 
                        `./data/${acc.key.public}.profile`
                        : '/web/img/avatar2.png',
                    description: acc.description,
                    pub: acc.key.public,
                    dateJoin: new Date().toUTCString(),
                    followers: '0'
                })
            : '' + 
            await WebUI.accList({
                list: accList.join('')
            })
    }))
})
app.get('/account-create', async (req, res) => {
    inHomePage = false
    accInfo = new Acc()
    res.send(WebUI.body({
        head: WebUI.css('/web/css/croppie.css'),
        avatar: myAvatar,
        body: await WebUI.accInfo({
            pub: accInfo.key.public,
            avatar: WebUI.header('No profile image specified'), // LOCALE_NEEDED
            cover: WebUI.header('No cover image specified') //LOCALE_NEEDED
        }),
        script:
            WebUI.script('/web/js/croppie.js') +
            WebUI.script('/web/js/account-info.js')
    }))
})
app.get('/account-info/:pub', async (req,res) => {
    inHomePage = false

    if (typeof req.params.pub === 'undefined')
        return res.send(WebUI.nativeAlert('Please specify accnount public key.'))

    if (!receiver.storage.access(req.params.pub))
        return res.send(WebUI.nativeAlert(`Account public key is invalid.`))

    accInfo = new Acc(await receiver.storage.promise.read(req.params.pub))
    res.send(WebUI.body({
        avatar: myAvatar,
        head: WebUI.css('/web/css/croppie.css'),
        body: await WebUI.accInfo({
            pub: accInfo.key.public,
            name: accInfo.name,
            description: accInfo.description,
            tag: accInfo.tag.join(','),
            avatar: WebUI.image({
                location: `/data/png/${accInfo.key.public}.avatar`
            }),
            cover: WebUI.image({
                location: `/data/png/${accInfo.key.public}.cover`
            }),
        }),
        script:
            WebUI.script('/web/js/croppie.js') + 
            WebUI.script('/web/js/account-info.js')
    }))
})
app.get('/timeline', (req, res) => {
    inHomePage = false

    if (acc === undefined)
        return res.send(WebUI.login())

    let currentPostLocation = `${acc.key.public}.timeline.${currentTimelinePost}`

    if (!receiver.storage.access(currentPostLocation))
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

// --- POST ---
app.post('/account-temp-avatar', async (req,res) => {
    req.body = Buffer.from(req.body.split(';base64,')[1], 'base64') 
    await FileSystem.promises.writeFile(
        `./data/temp.avatar`,
        req.body,
        binEncode
    )
    res.send('Uploaded!')
})
app.post('/account-update', async (req, res) => {
    if (typeof accInfo === 'undefined') {
        res.status(401)
        res.send('no accounts assinged')
        return
    }

    if (Try(() => req.body = json(req.body))) {
        res.status(400)
        res.send('arguments invaild')
        return
    }

    if (typeof req.body.name !== 'string' ||
        typeof req.body.description !== 'string' ||
        typeof req.body.tag !== 'string' ||
        typeof req.body.avatar !== 'string' ||
        typeof req.body.cover !== 'string') {
        res.status(400)
        res.send('arguments invalid')
        return
    }

    let accList = await receiver.storage.promise.read('accounts')
    let avatarFile = `./data/${accInfo.key.public}.avatar`
    let coverFile = `./data/${accInfo.key.public}.cover`
    let a = 0

    accInfo.name = req.body.name.slice(0,32)
    accInfo.description = req.body.description.slice(0,144)
    accInfo.tag = req.body.tag.slice(0,16).split(',')

    req.body.avatar = req.body.avatar.split(';base64,')
    req.body.cover = req.body.cover.split(';base64,')

    if (req.body.avatar.length > 1) {
        await FileSystem.promises.writeFile(
            avatarFile,
            Buffer.from(
                req.body.avatar[1],
                'base64'
            ),
            binEncode
        )
        accInfo.img.avatar = await Crypt.hash(avatarFile)
    }

    if (req.body.cover.length > 1) {
        await FileSystem.promises.writeFile(
            coverFile,
            Buffer.from(
                req.body.cover[1],
                'base64'
            ),
            binEncode
        )
        accInfo.img.cover = await Crypt.hash(coverFile)
    }

    accInfo.sign()

    while (a < accList.length) {
        if (accList[a] === accInfo.key.public)
            break

        a++
    }

    if (a >= accList.length) {
        accList.push(accInfo.key.public)
        await receiver.storage.promise.write('accounts', accList)
    }

    receiver.storage.write(accInfo.key.public, accInfo.export())
    res.send('success')
})

// --- File Server ---
app.get('/:location/:type/:file', async (req, res) => {
    //File server
    /** @type {string} */
    let fileLocation

    switch (req.params.location) {
        case 'data':
            fileLocation = './data/' + req.params.file
            break

        case 'web':
            fileLocation = WebUI.dir() + req.params.type + '/' + req.params.file
            break
    }

    if (Try(() => FileSystem.accessSync(fileLocation)))
        return app.ev404.callback(res)

    /** @type {string} */
    let contentType
    let encoding = 'utf-8'
    /** @type {string[]} */
    let fileName = req.params.file.split('.')
    let fType = fileName.length > 1 ? fileName[fileName.length - 1] : req.params.type

    switch (fType) {
        case 'apng':
        case 'avif':
        case 'gif':
        case 'png':
        case 'webp':
            contentType += `image/${fType}`
            encoding = 'binary'
            break

        case 'jpg':
        case 'jpeg':
        case 'jfif':
        case 'pjpeg':
        case 'pjp':
            contentType += 'image/jpeg'
            encoding = 'binary'
            break

        case 'svg':
            contentType = 'image/svg+xml'
            break

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

        case 'ttf':
        case 'woff':
        case 'woff2':
            contentType = `fonts/${fType}`
            encoding = 'binary'
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
