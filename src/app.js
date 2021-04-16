/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const FileSystem = require('fs')

const __ = require('./const')
const Receiver = require('./fn.receiver')
const Return = require('./fn.try.return')

const Handler = require('./handler')
const Web = require('./fn.web').web
const WebUI = require('./web.ui')
const WebAccount = require('./web.account')
const WebFileServer = require('./web.file.server')

/** Peer command handler */
const handler = new Handler()

/** @type {string[]} List of all notifications*/
const notifications = []

/** Receiver Object*/
const receiver = new Receiver(async (peer, result) => handler.handle(receiver, peer, result))

/** HTTP web front-end app object*/
const web = new Web({port:1024})

/** Web account manager module */
const webAccount = new WebAccount(receiver)

/** Web file server, for serving static files */
const webFileServer = new WebFileServer(receiver, web)

/** @type {number} Currently read head of timeline post*/
let currentTimelinePost = 0

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

// Posting
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
