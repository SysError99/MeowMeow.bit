/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const Server = require('./server')
const Web = require('./web')

/** HTTP web front-end app object*/
const app = new Web()
app.get('/', (req,res) => {
    res.send('Hello world!')
})
app.get('/:var', (req,res) => {
    let txt = ''
    if(typeof req.query.name === 'string'){
        txt = ', and your name is ' + req.query.name
    }
    res.send('Your paramter is ' + req.params.var+txt)
})
app.get('/find/:id', (req,res) => {
    res.send('You request for: '+req.params.id)
})

/** Server Object*/
const server = new Server((peer, data) => {
    if(typeof data[0] !== 'string'){
        server.response(peer)
        return
    }
    switch(data[0]){
        default:
            server.response(peer, ['what'])
            break
    }
})