const FileSystem = require('fs')

const __ = require('./const')
const Receiver = require('./fn.receiver')
const Try = require('./fn.try.catch')
const Return = require('./fn.try.return')
const WebAccount = require('./web.account')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const WebRequest = Web.WebRequest
const WebResponse = Web.WebResponse
const { json } = require('./fn.json')

const Acc = require('./data/acc')
const Post = require('./data/post')
const PostPointer = require('./data/post.pointer')

const utf8Encoding = {encoding: 'utf-8'}

/** @type {string[]} Post template */
const wPost =  Return(() => WebUI.extract(
    FileSystem.readFileSync(`${WebUI.wDir}html/post.html`, utf8Encoding),
    [
        'avatar',
        'time',
        'name',
        'text',
        'content',
        'link-like',
        'like',
        'link-mention',
        'mention',
    ]
))

/** @type {string} Post submission template */
const wPostSubmit = FileSystem.readFileSync(`${WebUI.wDir}html/post-submit.html`, utf8Encoding)

/** Posting handler web UI interface */
const WebPost = class {
    /** @type {number} Current position of timeline post */
    currentTimeline = 0

    /** @type {WebAccount) */
    webAccount

    /** @type {Receiver} */
    receiver

    /**
     * Post template
     * @param param0 
     * @returns {string}
     */
    templatePost ({
        avatar,
        time,
        name,
        text,
        content,
        linkLike,
        like,
        linkMention,
        mention,
    }) {
        wPost[1] = typeof avatar === 'string' ? avatar : '/web/img/avatar5.png'
        wPost[3] = typeof time === 'number' ? new Date(time).toUTCString() : '',
        wPost[5] = typeof name === 'string' ? name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''
        wPost[7] = typeof text === 'string' ? text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''
        wPost[9] = typeof content === 'string' ? content : ''
        wPost[11] = typeof linkLike === 'string' ? linkLike : '#'
        wPost[13] = typeof like === 'number' ? `${like}` : '0'
        wPost[15] = typeof linkMention === 'string' ? linkMention : '#'
        wPost[17] = typeof mention === 'number' ? `${mention}` : '0'
        return wPost.join('')
    }

    /**
     * Post submission template
     * @returns {string}
     */
    templatePostSubmit () {
        return wPostSubmit
    }

    /**
     * Render specified post, in full page
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     */
    async post (req, res) {
        res.send(
            WebUI.body({
                avatar: this.webAccount.avatar,
                body: await this.renderPost(req.params.pub, req.params.number),
                title: 'Posts - '
            })
        )
    }

    /**
     * Render timeline post
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async timeline (res) {
        if (this.webAccount.active === undefined)
            return res.send(WebUI.login())

        let pointerLocation = `timeline.${this.currentTimeline}`
        let storage = this.receiver.storage.promise

        if (this.currentTimeline > 0)
            this.currentTimeline--

        if (!await storage.access(pointerLocation))
            return res.send('')

        let postPointer = new PostPointer(await storage.read(pointerLocation))
        
        res.send(await this.renderPost(postPointer.owner, postPointer.pos))
    }
 
    /**
     * Render specified post 
     * @param {string} pub Public key
     * @param {number} num Post number
     * @returns {Promise<string>}
     */
    async renderPost (pub, num) {
        let postLocation = `${pub}.${num}`
        let likeCountLocation = `${postLocation}.likes`
        let mentionCountLocation = `${postLocation}.mentions`
        let storage = this.receiver.storage.promise

        if (!await storage.access(postLocation))
            return WebUI.header('-')

        if (!await storage.access(likeCountLocation))
            await storage.write(likeCountLocation, 0)

        if (!await storage.access(mentionCountLocation))
            await storage.write(mentionCountLocation, 0)

        /** @type {number} */
        let likeCount = await storage.read(likeCountLocation)
        /** @type {number} */
        let mentionCount = await storage.read(mentionCountLocation)
        let owner = new Acc(await storage.read(pub))
        let post = new Post(await storage.read(postLocation))

        return this.templatePost({
            avatar: `/data/png/${pub}.avatar`,
            name: owner.name,
            time: post.time,
            text: post.text,
            // TODO: implement content (media, mention, tag)
            linkLike: `/like/${pub}/${num}`,
            like: likeCount,
            linkMention:`/mention/${pub}/${num}`,
            mention: mentionCount
        })
    }

    /**
     * Create a post
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     */
    async postSubmit (req, res) {
        if (typeof this.webAccount.active === 'undefined')
            return res.send('No active accounts present')

        if (Try(() => req.body = json(req.body)))
            return res.send('Malformed JSON string')

        if (typeof req.body.text !== 'string')
            return res.send('Some of parameters have invalid data type')
        
        // Create a new post
        let ownerPub = this.webAccount.active.key.public
        let post = new Post()
        let postCountLocation = `${ownerPub}.posts`
        let storage = this.receiver.storage.promise

        post.owner = ownerPub
        post.text = req.body.text
        post.sign(this.webAccount.active.key.private, this.webAccount.active.key.password)

        if (!await storage.access(postCountLocation))
            await storage.write(postCountLocation, 0)

        /** @type {number} */
        let postCount = await storage.read(postCountLocation)

        //Broadcast
        this.receiver.broadcast(ownerPub, __.BROADCAST_AMOUNT, [
            'post',
            ownerPub,
            postCount,
            post.media,
            post.mediaType,
            post.mention,
            post.tag,
            post.text,
            post.time,
            post.signature
        ])

        //Add to timeline
        /** @type {number} */
        let timelineCount = await storage.read('posts')
        let timeline = new PostPointer()

        timeline.owner = ownerPub
        timeline.pos = postCount

        //Save to disk
        await storage.write(`${ownerPub}.${postCount}`, post.export())
        await storage.write(`timeline.${timelineCount}`, timeline.export())
        postCount++
        timelineCount++
        await storage.write(postCountLocation, postCount)
        await storage.write('posts', timelineCount)  
    
        res.send('Post submission is successful!')
    }

    /**
     * @param {WebAccount} a 
     * @param {Receiver} r 
     */
    constructor (a, r) {
        this.webAccount = a
        this.receiver = r
    }
}

module.exports = WebPost