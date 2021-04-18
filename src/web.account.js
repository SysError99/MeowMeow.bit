/*!
 * Account Manager Web Interface
 */
const FileSystem = require('fs')

const Crypt = require('./fn.crypt')
const Receiver = require('./fn.receiver')
const Try = require('./fn.try.catch')
const Web = require('./fn.web')
const WebUI = require('./web.ui')
const WebRequest = Web.WebRequest
const WebResponse = Web.WebResponse
const {json, str} = require('./fn.json')

const Acc = require('./data/acc')

const binEncode = {encoding: 'binary'}
const utf8Encode = {encoding: 'utf-8'}

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
            body: await this.templateAccInfo({
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
            body: await this.templateAccInfo({
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
                publicAccount: this.active.public ? 'checked' : ''
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
            accList = [WebUI.header('Empty', 1)]

        res.send(WebUI.body({
            avatar: this.avatar,
            body:
                (typeof this.active === 'object' ?
                    await WebUI.profile({
                        name: this.active.name,
                        urlImgAvatar: this.active.img.avatar.length > 0 ? 
                            `./data/png/${this.active.key.public}.avatar`
                            : undefined,
                        urlImgCover: this.active.img.cover.length > 0 ?
                            `./data/png/${this.active.key.public}.cover`
                            : undefined,
                        description: this.active.description,
                        pub: this.active.key.public,
                        dateJoin: new Date().toUTCString(),
                        followers: '0'
                    })
                : '') + '<br>' +
                await this.templateAccList({
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
        this.active.tag = req.body.tag.slice(0,32).split(',')

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
     * Web template for account information
     * @param param0 
     * @returns {Promise<string>}
     */
    async templateAccInfo ({
        pub,
        name,
        description,
        tag,
        avatar,
        cover,
        publicAccount
    }) {
        let accInfo = WebUI.extract(
            await FileSystem.promises.readFile(`${WebUI.wDir}html/account-info.html`, utf8Encode),
            [
                'acc-pub',
                'acc-name',
                'acc-description',
                'acc-tag',
                'acc-avatar',
                'acc-cover',
                'acc-public'
            ]
        )
    
        accInfo[1] = typeof pub === 'string' ? pub : ''
        accInfo[3] = typeof name === 'string' ? name : ''
        accInfo[5] = typeof description === 'string' ? description : ''
        accInfo[7] = typeof tag === 'string' ? tag : ''
        accInfo[9] = typeof avatar === 'string' ? avatar : ''
        accInfo[11] = typeof cover === 'string' ? cover : ''
        accInfo[13] = typeof publicAccount === 'string' ? publicAccount : ''
    
        return accInfo.join('')
    }

    /**
     * Web template account list
     * @param  param0 
     * @returns {Promise<string>}
     */
    async templateAccList ({
        list
    }) {
        let accList = WebUI.extract(
            await FileSystem.promises.readFile(`${WebUI.wDir}html/account-list.html`, utf8Encode),
            [
                'list'
            ]
        )
        
        accList[1] = typeof list === 'string' ? list : ''
        return accList.join('')
    }
}

module.exports = WebAccount
