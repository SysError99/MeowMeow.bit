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

/**
 * WebRequest object, holding all request commands
 * @param {HTTP.IncomingMessage} req Outgoing request
 * @param {{
 * params:Object,
 * query:Object
 * }} d Data container for this object
 */
const WebRequest = function(req,d){
    /** This object*/
    let self = this
    /** @type {boolean} This is 'WebRequest' object*/
    this.isWebRequest = true
    /** @type {HTTP.IncomingMessage} Unimplemented features live here*/
    this._ = req
    /** @type {HTTP.IncomingHttpHeaders} Request headers*/
    this.header = req.headers
    /** @type {Object} Request URL parameters*/
    this.params = {}
    /** @type {Object} Request URL queries*/
    this.query = {}
    /** @type {string} Request URL String*/
    this.url = req.url
    /**
     * Import JSON
     */
    let _import = () => {
        if(isAny(d.params))
            self.params = d.params
        if(isAny(d.query)) 
            self.query = d.query
    }
    if(isAny(d))
        _import()
}

/**
 * WebResponse object, holding all response commands
 * @param {HTTP.ServerResponse} res Outgoing response
 */
const WebResponse = function(res){
    /** This object*/
    let self = this
    /** This is 'WebResponse' object*/
    this.isWebResponse = true
    /** @type {HTTP.ServerResponse} Unimplemented features live here*/
    this._ = res
    /**
     * Set response content type
     * @param {string} contentType parameter for content type
     * @returns {WebResponse} 
     */
    this.contentType = contentType => {
        res.setHeader('content-type', contentType)
        return self
    }
    /**
     * Send data back to client
     * @param {Buffer|string} data Data to be sent back to client
     * @returns {WebResponse} 
     */
    this.send = data => {
        switch(typeof data){
            case 'object':
                data = Try(() => JSON.stringify(data), '')
                break
            default:
                data = Try(() => `${data}`, '')
                break
        }
        res.end(data)
        return self
    }
    /**
     * Set HTTP status
     * @param {number} status Status
     * @returns {WebResponse} 
     */
    this.status = () => {
        res.writeHead(status)
        return self
    }
}

/**
 * WebEvent object
 * @param {{method:string,params:string,callback,function}} d Array
 */
const WebEvent = function(d){
    /** This object*/
    let self = this
    /** @type {boolean} This is 'WebEvent' object*/
    this.isWebEvent = true
    /** @type {RequestCallback} Callback function*/
    this.callback = () => {}
    /** @type {string} HTTP method*/
    this.method = 'get'
    /** @type {string[]} URL parameters*/
    this.params = []

    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d.callback === 'function')
            self.callback = d.callback
        if(typeof d.method === 'string')
            self.method = d.method.toLowerCase()
        if(typeof d.params === 'string')
            self.params = d.params.split('/')
    }
    if(isAny(d))
        _import()
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

/**
 * Micro web server
 * @param {{
 * port:string
 * }} d JSON properties
 */
const Web = function(d){
    /** This object*/
    let self = this
    /** @type {boolean} This is 'Web' object*/
    this.isWeb = true

    /** @type {WebEvent} 404 Error event*/
    let ev404 = null

    /** @type {WebEvent[]} List of app events*/
    let event = []

    /**
     * Add 'GET' event handler
     * @param {RequestCallback} callback Callback function for this request
     */
    this.ev404 = callback => {
        ev404 = new WebEvent({
            callback, callback
        })
    }

    /**
     * Add 'GET' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.get = (params, callback) => {
        webEventAdd(event,callback,'get',params)
    }

    /**
     * Add 'POST' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.post = (params, callback) => {
        webEventAdd(event,callback,'post',params)
    }

    /**
     * Add 'PUT' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.put = (params, callback) => {
        webEventAdd(event,callback,'put',params)
    }
    /**
     * Add 'DELETE' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.delete = (params,callback) => {
        webEventAdd(event,callback,'delete',params)
    }

    /** @type {number} Server port*/
    this.port = 1024

    /**
     * Build a server
     */
    let _server = () => {
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
                for(ev=0; ev<event.length; ev++){
                    thisEvent = true
                    webEvent = event[ev]
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
                if(isAny(ev404)){
                    if(typeof ev404.callback === 'function') {
                        ev404.callback(new WebRequest(req), new WebResponse(res))
                        return
                    }
                }
                res.writeHead(404).end('Not found.')
            })
            req.on('error', err => {
                console.error('E -> http.on(\'error\'): ' + err.message)
            })
        }).listen(self.port)
    }
    
    /**
     * Import JSON
     */
    let _import = () => {
        if(typeof d.port === 'number')
            self.port = d.port
        _server()
    }
    if(isAny(d))
        _import()
    else _server()
}

module.exports = Web