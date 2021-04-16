/*!
 * Account Manager Web Interface
 */
const FileSystem = require('fs')

const Crypt = require('./fn.crypt')
const Receiver = require('./fn.receiver')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const WebRequest = Web.WebRequest
const WebResponse = Web.WebResponse

const Acc = require('./data/acc')

const {json, str} = require('./fn.json')

const binEncode = {encoding: 'binary'}

const WebAccount = class {
    /** @type {Receiver} */
    receiver

    /** @type {Acc} */
    active

    /** @type {string} Currently active avatar*/
    avatar = WebUI.avatar({
        right: true
    })
    
    /**
     * Account Creation
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async create (res) {
        this.active = new Acc()
        res.send(WebUI.body({
            head: WebUI.css('/web/css/croppie.css'),
            avatar: this.avatar,
            body: await WebUI.accInfo({
                pub: this.active.key.public,
                avatar: WebUI.header('No profile image specified'), // LOCALE_NEEDED
                cover: WebUI.header('No cover image specified') //LOCALE_NEEDED
            }),
            script:
                WebUI.script('/web/js/croppie.js') +
                WebUI.script('/web/js/account-info.js')
        }))
    }

    /**
     * Account Information & Editor
     * @param {WebRequest} req 
     * @param {WebResponse} res
     * @returns {Promise<string>}
     */
    async info (req, res) {
        if (typeof req.params.pub === 'undefined')
            return res.send(WebUI.nativeAlert('Please specify accnount public key.'))
    
        if (!this.receiver.storage.access(req.params.pub))
            return res.send(WebUI.nativeAlert(`Account public key is invalid.`))
    
        this.active = new Acc(await this.receiver.storage.promise.read(req.params.pub))
        this.avatar = WebUI.avatar({
            url: `/data/png/${this.active.key.public}.avatar`,
            right: true
        })
        res.send(WebUI.body({
            avatar: this.avatar,
            head: WebUI.css('/web/css/croppie.css'),
            body: await WebUI.accInfo({
                pub: this.active.key.public,
                name: this.active.name,
                description: this.active.description,
                tag: this.active.tag.join(','),
                avatar: WebUI.image({
                    location: `/data/png/${this.active.key.public}.avatar`
                }),
                cover: WebUI.image({
                    location: `/data/png/${this.active.key.public}.cover`
                }),
            }),
            script:
                WebUI.script('/web/js/croppie.js') + 
                WebUI.script('/web/js/account-info.js')
        }))
    }

    /**
     * Account Listing
     * @param {WebResponse} res
     * @returns {Promise<string>}
     */
    async list (res) {
        /** @type {string[]} */
        let accList = json(await FileSystem.promises.readFile(`./data/accounts.json`, {encoding: 'utf-8'}))

        if (accList.length > 0) {
            for (let a in accList) {
                let accFound = new Acc(await this.receiver.storage.promise.read(accList[a]))

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
            avatar: this.avatar,
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
    }

    /**
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async tempAvatar (req, res) {
        req.body = Buffer.from(req.body.split(';base64,')[1], 'base64') 
        await FileSystem.promises.writeFile(
            `./data/temp.avatar`,
            req.body,
            binEncode
        )
        res.send('Uploaded!')
    }

    /**
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async update (req, res) {
        if (typeof this.active === 'undefined') {
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

        let accList = await this.receiver.storage.promise.read('accounts')
        let avatarFile = `./data/${this.active.key.public}.avatar`
        let coverFile = `./data/${this.active.key.public}.cover`
        let a = 0

        this.active.name = req.body.name.slice(0,32)
        this.active.description = req.body.description.slice(0,144)
        this.active.tag = req.body.tag.slice(0,16).split(',')

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
            this.active.img.avatar = await Crypt.hash(avatarFile)
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
            this.active.img.cover = await Crypt.hash(coverFile)
        }

        this.active.sign()

        while (a < accList.length) {
            if (accList[a] === this.active.key.public)
                break

            a++
        }

        if (a >= accList.length) {
            accList.push(this.active.key.public)
            await this.receiver.storage.promise.write('accounts', accList)
        }

        this.receiver.storage.write(this.active.key.public, this.active.export())
        res.send('success')
    }

    /**
     * @param {Receiver} receiver 
     */
    constructor (receiver) {
        this.receiver = receiver
    }
}

module.exports = WebAccount