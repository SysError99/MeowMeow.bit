/**
 * Express.js-like micro web server framework.
 * 
 * By SysError99, Licensed with MIT
 */
const HTTP = require('http')
const isAny = require('./fn.is.any')
const Return = require('./fn.try.return')
const {str} = require('./fn.json')

/**
 * @callback RequestCallback
 * @param {WebRequest} req Incoming request
 * @param {WebResponse} res Outgoing response
 */

/** WebRequest object, holding all request commands */
const WebRequest = class {
    /** @type {boolean} This is 'WebRequest' object*/
    isWebRequest = true

    /** @type {string} Request body */
    body = ''
    /** @type {HTTP.IncomingHttpHeaders} Request headers*/
    header
    /** @type {HTTP.IncomingMessage} Unimplemented features live here*/
    HTTP = {}
    /** @type {Object} Request URL parameters*/
    params = {}
    /** @type {Object} Request URL queries*/
    query = {}
    /** @type {string} Request URL String*/
    url = ''

    /**
     * Generate web request
     * @param {HTTP.IncomingMessage} req Outgoing request
     * @param {{
     * params:Object,
     * query:Object
     * }} d Data container for this object
     */
    constructor (req, d) {
        this.HTTP = req

        if (!isAny(d))
            return

        this.header = req.headers
        this.url = req.url

        if (typeof d.body === 'string')
            this.body = d.body

        if (isAny(d.params))
            this.params = d.params

        if (isAny(d.query)) 
            this.query = d.query
    }
}

/** WebResponse object, holding all response commands */
const WebResponse = class {
    /** This is 'WebResponse' object*/
    isWebResponse = true

    /** @type {HTTP.ServerResponse} Unimplemented features live here*/
    HTTP = {}

    /**
     * Set response content type
     * @param {string} contentType parameter for content type
     * @returns {WebResponse} 
     */
    contentType (contentType) {
        this.HTTP.setHeader('content-type', contentType)
        return this
    }

    /**
     * Send data back to client
     * @param {Buffer|string} data Data to be sent back to client
     * @param {string|undefined} encoding Encoding to be used
     * @returns {WebResponse} 
     */
    send (data, encoding) {
        switch (typeof data) {
            case 'object':
                data = Return(() => str(data), '')
                break

            default:
                data = Return(() => `${data}`, '')
                break
        }

        this.HTTP.end(data, typeof encoding === 'string' ? encoding : 'utf-8')
        return this
    }

    /**
     * Set HTTP status
     * @param {number} s Status
     * @param {Object} h Headers
     * @returns {WebResponse} 
     */
    status (s,h) {
        this.HTTP.writeHead(s,h)
        return this
    }

    /**
     * Create WebResponse object
     * @param {HTTP.ServerResponse} res Outgoing response
     */
    constructor (res) {
        if (typeof res !== 'undefined')
            this.HTTP = res
    }
}

/**
 * WebEvent object, holding web events
 */
const WebEvent = class {
    /** @type {boolean} This is 'WebEvent' object*/
    isWebEvent = true
    /** @type {RequestCallback} Callback function*/
    callback = () => {}
    /** @type {string} HTTP method*/
    method = 'get'
    /** @type {string[]} URL parameters*/
    params = []

    /**
     * Create WebEvent object
     * @param {{method:string,params:string,callback:RequestCallback}} d Data to be imported
     */
    constructor (d) {
        if (typeof d !== 'object')
            return

        if (typeof d.callback === 'function')
            this.callback = d.callback

        if (typeof d.method === 'string')
            this.method = d.method.toLowerCase()

        if (typeof d.params === 'string')
            this.params = d.params.split('/')
    }
}

/**
 * Add event to stack
 * @param {WebEvent[]} event Event array
 * @param {RequestCallback} callback Callback function for this event
 * @param {string} method HTTP method for this event
 * @param {string} params URL parameters for this event
 */
let webEventAdd = (event, callback, method, params) => {
    event.push(new WebEvent({
        callback, callback,
        method: method,
        params: params
    }))
}

/** Micro web server, used for serving web pages */
const Web = class {
    /** @type {boolean} This is 'Web' object*/
    isWeb = true

    /** @type {WebEvent} 404 Error event*/
    ev404 = new WebEvent({
        callback: res => res.status(404).send('Not found.')
    })
    /** @type {WebEvent[]} List of app events*/
    events = []

    /**
     * Add 'GET' event handler
     * @param {RequestCallback} callback Callback function for this request
     */
    event404 (callback) {
        this.ev404 = new WebEvent({
            callback, callback
        })
    }

    /**
     * Add 'GET' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    get (params, callback) {
        webEventAdd(this.events, callback, 'get', params)
    }

    /**
     * Add 'POST' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    post (params, callback) {
        webEventAdd(this.events, callback, 'post', params)
    }

    /**
     * Add 'PUT' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    put (params, callback) {
        webEventAdd(this.events, callback, 'put', params)
    }

    /**
     * Add 'DELETE' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */

    delete (params, callback) {
        webEventAdd(this.events, callback, 'delete', params)
    }

    /** @type {number} Server port*/
    port = 1024

    /**
     * Create micro web server
     * @param {{
     * port:string
     * }} d JSON properties
     */
    constructor (d) {
        let buildServer = () => {
            HTTP.createServer((req,res) => {
                let body = ''

                req.setEncoding('utf-8')
                req.on('data', chunk => {
                    body += chunk
                })
                req.on('end', () => {
                    let webQuery = {}
                    let url = req.url.split('?')
                    let params = url[0].split('/')

                    if (url.length === 2) {
                        let queries = url[1].split('&')

                        for (let query of queries) {
                            let elQuery = query.split('=')
    
                            if (elQuery.length === 1)
                                webQuery[elQuery[0]] = true
                            else
                                webQuery[elQuery[0]] = elQuery[1]
                        }
                    } else if (url.length > 2)
                        return res.writeHead(400).end('Bad request.')

                    for (let event of this.events) {
                        let eventParams = event.params
                        let thisEvent = true
                        let webParams = {}
    
                        if (event.method !== req.method.toLowerCase())
                            continue

                        if (eventParams.length !== params.length)
                            continue
    
                        for (let p in params) {
                            if (eventParams[p][0] === ':' && eventParams[p].length > 1)
                                webParams[eventParams[p].slice(1,eventParams[p].length)] = params[p]
                            else if (eventParams[p] !== params[p]) {
                                thisEvent = false
                                break
                            }
                        }

                        if (!thisEvent)
                            continue

                        let callback = event.callback

                        callback(new WebRequest(req,{
                            params: webParams,
                            query: webQuery,
                            body: body
                        }), new WebResponse(res))
                        return
                    }

                    this.ev404.callback(new WebResponse(res))
                    return
                })
                req.on('error', err => {
                    console.error('E -> http.on(\'error\'): ' + err.message)
                })
            }).listen(this.port)
        }

        if (typeof d === 'object') {
            if (typeof d.port === 'number')
                this.port = d.port
        }
        
        buildServer()
    }
}

module.exports = {
    Web: Web,
    WebEvent: WebEvent,
    WebRequest: WebRequest,
    WebResponse: WebResponse
}
