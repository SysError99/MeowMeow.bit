const FileSystem = require('fs')

const Receiver = require('./fn.receiver')
const WebAccount = require('./web.account')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const WebRequest = Web.WebRequest
const WebResponse = Web.WebResponse

const utf8Encoding = {encoding: 'utf-8'}

/** Posting handler web UI interface */
const WebPost = class {
    /** @type {number} Current position of timeline post */
    currentPostLocation = 0

    /** @type {WebAccount) */
    webAccount

    /** @type {Receiver} */
    receiver

    /** @type {string} Template for post submission */
    templatePostSubmit = FileSystem.readFileSync(`${WebUI.wDir}html/post-submit.html`, utf8Encoding)

    /**
     * Render specified post, in full page
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     */
    async renderPost (req, res) {
        res.send('UNIMPLEMENTED')
    }

    /**
     * Render timeline post
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async renderTimeline (req, res) {
        if (webAccount.active === undefined)
        return res.send(WebUI.login())

        let currentPostLocation = `timeline.${currentTimelinePost}`

        if (!receiver.storage.access(currentPostLocation))
            return res.send('') //No such post, leave it blank here

        res.send('UNIMPLEMENTED')
        // let postPointer = new PostPointer(receiver.storage.read(currentPostLocation))
        // TODO: render timeline post
    }

    /**
     * Create a post
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     */
    async post (req, res) {
        
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