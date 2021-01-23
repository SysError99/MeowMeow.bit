/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const Receiver = require('./receiver')
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

/** Receiver Object*/
const receiver = new Receiver((peer, data) => {
    if(typeof data[0] !== 'string'){
        receiver.send(peer)
        return
    }
    switch(data[0]){
        default:
            receiver.send(peer, ['what'])
            break
    }
})