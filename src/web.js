/**
 * Micro web server framework.
 * 
 * By SysError99, Licensed with MIT
 */
const HTTP = require('http')

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
    let _this = this
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
    /**
     * Import JSON
     */
    let _import = function(){
        if(Array.isArray(d.params)) _this.params = d.params
        if(Array.isArray(d.query)) _this.query = d.query
    }
    if(typeof d === 'object') _import()
}

/**
 * WebResponse object, holding all response commands
 * @param {HTTP.ServerResponse} res Outgoing response
 */
const WebResponse = function(res){
    /** This object*/
    let _this = this
    /** This is 'WebResponse' object*/
    this.isWebResponse = true
    /** @type {HTTP.ServerResponse} Unimplemented features live here*/
    this._ = res
    /**
     * Set response content type
     * @param {string} contentType parameter for content type
     * @returns {WebResponse} 
     */
    this.contentType = function(contentType){
        res.setHeader('content-type', contentType)
        return _this
    }
    /**
     * Send data back to client
     * @param {any} data Data to be sent back to client
     * @returns {WebResponse} 
     */
    this.send = function(data){
        let payload = ''
        switch(typeof data){
            case 'object':
                try{
                    payload = JSON.stringify(data)
                }catch(e){
                    console.error('E -> Web.WebResponse.send: ' + e)
                }
                break
            case 'string':
                payload = data
                break
            case 'number':
                payload = data + ''
                break
            case 'boolean':
                payload = data ? 'true' : 'false'
                break
        }
        res.end(payload)
        return _this
    }
    /**
     * Set HTTP status
     * @param {number} status Status
     * @returns {WebResponse} 
     */
    this.status = function(){
        res.writeHead(status)
        return _this
    }
}

/**
 * WebEvent object
 * @param {{method:string,params:string,callback,function}} d Array
 */
const WebEvent = function(d){
    /** This object*/
    let _this = this
    /** @type {boolean} This is 'WebEvent' object*/
    this.isWebEvent = true
    /** @type {RequestCallback} Callback function*/
    this.callback = function(){}
    /** @type {string} HTTP method*/
    this.method = 'get'
    /** @type {string[]} URL parameters*/
    this.params = []
    /**
     * Import JSON
     */
    let _import = function(){
        if(typeof d.callback === 'function') _this.callback = d.callback
        if(typeof d.method === 'string') _this.method = d.method.toLowerCase()
        if(typeof d.params === 'string') {
            let paramExtract = d.params.split('/')
            paramExtract.splice(0,1)
            _this.params = paramExtract
        }
    }
    if(typeof d === 'object') _import
}

/**
 * Add event to stack
 * @param {RequestCallback} callback Callback function for this event
 * @param {string} method HTTP method for this event
 * @param {string} params URL parameters for this event
 */
let webEventAdd = function(callback, method, params){
    _this.event.push(new WebEvent({
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
    let _this = this
    /** @type {boolean} This is 'Web' object*/
    this.isWeb = true

    /**
     * Add 'GET' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.get = function(params, callback){
        webEventAdd(params,'get',callback)
    }

    /**
     * Add 'POST' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.post = function(params, callback){
        webEventAdd(params,'post',callback)
    }

    /**
     * Add 'PUT' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.put = function(params, callback){
        webEventAdd(params,'put',callback)
    }
    /**
     * Add 'DELETE' event handler
     * @param {string} params URL scheme for this request
     * @param {RequestCallback} callback Callback function for this request
     */
    this.delete = function(params,callback){
        webEventAdd(params,'delete',callback)
    }

    /** @type {number} Server port*/
    this.port = 1024

    /** @type {WebEvent[]} List of events*/
    let event = []

    /**
     * Build a server
     */
    let _server = function(){
        HTTP.createServer(function(req,res){
            let body = ''
            req.setEncoding('utf-8')
            req.on('data', function(chunk){
                body += chunk
            })
            req.on('end', function(){
                let url = req.url.split('?')
                let params = url[0].split('/')
                let query = url[1].split('&')
                for(let ev=0; ev<event.length; ev++){
                    let notThis = false
                    let webEvent = event[ev]
                    let webParams = {}
                    let webQuery = {}
                    if(webEvent.method !== req.method.toLowerCase()) continue
                    if(webEvent.params.length !== params.length) continue
                    for(let p=0; p<params.length; p++){
                        let webEventParam = webEvent.params[p]
                        if(webEventParam[0] === ':'){
                            let webEventParamName = webEventParam.slice(1,webEventParam.length)
                            webParams[webEventParamName] = params[p]
                        }else if(webEventParam !== params[p]){
                            notThis = true
                            continue
                        }
                    }
                    if(notThis) continue
                    for(let q=0; q<query.length; q++){
                        let elQuery = query[q].split('=')
                        webQuery[elQuery[0]] = webQuery[elQuery[1]]
                    }
                    webEvent.callback(new WebRequest(req,{
                        header: req.headers,
                        params: webParams,
                        query: webQuery,
                        body: body
                    }), new WebResponse(res))
                    break
                }
            })
            req.on('error', function(err){
                console.error('E -> http.on(\'error\'): ' + err.message)
            })
        }).listen(_this.port)
    }
    
    /**
     * Import JSON
     */
    let _import = function(){
        if(typeof d.port === 'number') _this.port = d.port
        _server()
    }
    if(typeof d === 'object') _import()
}
module.exports = Web