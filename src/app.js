/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const Server = require('./server')

/** Server Object*/
const server = new Server(async function(peer, data){
    console.log(JSON.stringify(data))
    server.response(peer, {name: 'fantastic!'})
})