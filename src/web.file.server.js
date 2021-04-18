const FileSystem = require('fs')
const FileSystemPromises = require('fs').promises

const TryAsync = require('./fn.try.catch.async')

const Receiver = require('./fn.receiver')
const web = require('./fn.web')
const Web = web.Web
const WebRequest = web.WebRequest
const WebResponse = web.WebResponse
const WebUI = require('./web.ui')

const WebFileServer = class {
    /** @type {Receiver} */
    receiver

    /** @type {Web} */
    web

    /**
     * @param {WebRequest} req 
     * @param {WebResponse} res 
     * @returns {Promise<string>}
     */
    async serve (req, res) {
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

        if (await TryAsync(async () => FileSystemPromises.access(fileLocation)))
            return this.web.ev404.callback(res)

        /** @type {string} */
        let contentType
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
                break
    
            case 'jpg':
            case 'jpeg':
            case 'jfif':
            case 'pjpeg':
            case 'pjp':
                contentType += 'image/jpeg'
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
                break
    
            default:
                contentType = 'appliaction/octet-stream'
                break
        }
    
        let file = FileSystem.createReadStream(fileLocation)
    
        res.contentType(contentType)
        file.pipe(res.HTTP, {end:true})
    }
}

module.exports = WebFileServer
