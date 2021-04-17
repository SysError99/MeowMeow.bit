const FileSystem = require('fs')

const __ = require('./const')
const Receiver = require('./fn.receiver')
const Try = require('./fn.try.catch')
const TryAsync = require('./fn.try.catch.async')
const Return = require('./fn.try.return')
const WebAccount = require('./web.account')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const WebRequest = Web.WebRequest
const WebResponse = Web.WebResponse
const { json } = require('./fn.json')

const Post = require('./data/post')
const PostPointer = require('./data/post.pointer')

const utf8Encoding = {encoding: 'utf-8'}

/** @type {string[]} Post template */
const wPost =  Return(() => WebUI.extract(
    FileSystem.readFileSync(`${WebUI.wDir}html/post.html`, utf8Encoding),
    [
        'time',
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
        time,
        text,
        content,
        linkLike,
        like,
        linkMention,
        mention,
    }) {
        wPost[1] = typeof time === 'number' ? new Date(time).toUTCString() : '',
        wPost[3] = typeof text === 'string' ? text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''
        wPost[5] = typeof content === 'string' ? content : ''
        wPost[7] = typeof linkLike === 'string' ? linkLike : '#'
        wPost[9] = typeof like === 'number' ? `${like}` : '0'
        wPost[11] = typeof linkMention === 'string' ? linkMention : '#'
        wPost[13] = typeof mention === 'string' ? mention : ''
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
        let postLocation = `${req.params.pub}.${req.params.number}`
        let likeCountLocation = `${postLocation}.likes`
        let mentionCountLocation = `${postLocation}.mentions`
        let storage = this.receiver.storage.promise

        if(await TryAsync(async () => storage.access(postLocation)))
            return res.send(WebUI.body({
                title: 'Not Found - ',
                body: WebUI.header({
                    text: 'Post requested is not found.'
                })
            }))

        if (await TryAsync(async () => storage.access(likeCountLocation)))
            await storage.write(likeCountLocation, 0)

        if (await TryAsync(async () => storage.access(mentionCountLocation)))
            await storage.write(mentionCountLocation)

        /** @type {number} */
        let likeCount = await storage.read(likeCountLocation)
        let mentionCount = await storage.read(mentionCountLocation)
        let post = new Post(await storage.read(postLocation))

        res.send(this.templatePost({
            time: post.time,
            text: post.text,
            // TODO: implement content (media, mention, tag)
            linkLike: `/like/${req.params.pub}/${req.params.number}`,
            like: likeCount,
            linkMention:`/mention/${req.params.pub}/${req.params.number}`,
            mention: mentionCount
        }))
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
        let postLocation = `${postPointer.owner}.${postPointer.pos}`
        
        if (await storage.access(postLocation))
            return res.send('')

        let post = new Post(await storage.read(postLocation))

        res.send(this.templatePost({
            time: post.time,
            text: post.text,
            // TODO: implement content (media, mention, tag)
            linkLike: `/like/${postPointer.owner}/${postPointer.pos}`,
            like: likeCount,
            linkMention:`/mention/${postPointer.owner}/${postPointer.pos}`,
            mention: mentionCount
        }))
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
        console.log(this.webAccount.active.key)
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