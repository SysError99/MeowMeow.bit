const FileSystem = require('fs')

const Receiver = require('./fn.receiver')
const WebAccount = require('./web.account')
const WebUI = require('./web.ui')

const utf8Encoding = {encoding: 'utf-8'}

/** Posting handler web UI interface */
const WebPost = class {
    /** @type {WebAccount) */
    webAccount

    /** @type {Receiver} */
    receiver

    /** @type {string} Template for post submission */
    templatePostSubmit = FileSystem.readFileSync(`${WebUI.wDir}html/post-submit.html`, utf8Encoding)

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