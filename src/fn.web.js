/**
 * Express.js-like micro web server framework.
 * 
 * By SysError99, Licensed with MIT
 */
const HTTP = require('http')
const isAny = require('./fn.is.any')
const Try = require('./fn.try.catch')

/**
 * @callback RequestCallback
 * @param {WebRequest} req Incoming request
 * @param {WebResponse} res Outgoing response
 */

/** WebRequest object, holding all request commands */
const WebRequest = class {
    /** @type {boolean} This is 'WebRequest' object*/
    isWebRequest = true
    
    /** @type {HTTP.IncomingMessage} Unimplemented features live here*/
    HTTP = {}
    /** @type {HTTP.IncomingHttpHeaders} Request headers*/
    header = req.headers
    /** @type {Object} Request URL parameters*/
    params = {}
    /** @type {Object} Request URL queries*/
    query = {}
    /** @type {string} Request URL String*/
    url = req.url

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

        if(!isAny(d))
            return

        if(isAny(d.params))
            this.params = d.params
        if(isAny(d.query)) 
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
     * @returns {WebResponse} 
     */
    send (data) {
        switch(typeof data){
            case 'object':
                data = Try(() => JSON.stringify(data), '')
                break
            default:
                data = Try(() => `${data}`, '')
                break
        }
        this.HTTP.end(data)
        return this
    }

    /**
     * Set HTTP status
     * @param {number} status Status
     * @returns {WebResponse} 
     */
    status () {
        this.HTTP.writeHead(status)
        return this
    }

    /**
     * Create WebResponse object
     * @param {HTTP.ServerResponse} res Outgoing response
     */
    constructor (res) {
        if(typeof res !== 'undefined')
            this.HTTP = res
    }
}

/**
 * WebEvent object, holding web events
 * @param {{method:string,params:string,callback,function}} d Array
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
        if(typeof d !== 'object')
            return

        if(typeof d.callback === 'function')
            this.callback = d.callback
        if(typeof d.method === 'string')
            this.method = d.method.toLowerCase()
        if(typeof d.params === 'string')
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
    ev404 = null

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
                    /** @type {number} */
                    let ev
                    /** @type {number} */
                    let p
                    /** @type {boolean} */
                    let thisEvent
                    /** @type {WebEvent} */
                    let webEvent
                    /** @type {string[]} */
                    let webEventParam
                    let webParams
                    let webQuery = {}
                    let url = req.url.split('?')
                    let params = url[0].split('/')
                    if(url.length === 2) {
                        let query = url[1].split('&')
                        for(let q=0; q<query.length; q++){
                            let elQuery = query[q].split('=')
    
                            if(elQuery.length === 1)
                                webQuery[elQuery[0]] = true
                            else
                                webQuery[elQuery[0]] = elQuery[1]
                        }
                    }
                    else if(url.length > 2){
                        res.writeHead(400).end('Bad request.')
                        return
                    }
                    for(ev=0; ev < this.events.length; ev++){
                        thisEvent = true
                        webEvent = this.events[ev]
                        webEventParam = webEvent.params
                        webParams = {}
    
                        if(webEvent.method !== req.method.toLowerCase())
                            continue
                        if(webEventParam.length !== params.length)
                            continue
    
                        for(p=0; p<params.length; p++){
                            if(webEventParam[p][0] === ':' && webEventParam[p].length > 1)
                                webParams[webEventParam[p].slice(1,webEventParam[p].length)] = params[p]
                            else if(webEventParam[p] !== params[p]){
                                thisEvent = false
                                break
                            }
                        }
                        if(!thisEvent)
                            continue
                        webEvent.callback(new WebRequest(req,{
                            params: webParams,
                            query: webQuery,
                            body: body
                        }), new WebResponse(res))
                        return
                    }
                    if(isAny(this.ev404)){
                        if(typeof this.ev404.callback === 'function') {
                            this.ev404.callback(new WebRequest(req), new WebResponse(res))
                            return
                        }
                    }
                    res.writeHead(404).end('Not found.')
                })
                req.on('error', err => {
                    console.error('E -> http.on(\'error\'): ' + err.message)
                })
            }).listen(this.port)
        }

        if(typeof d === 'object'){
            if(typeof d.port === 'number')
                this.port = d.port
        }
        
        buildServer()
    }
}

module.exports = Web