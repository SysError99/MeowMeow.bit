/**
 * MeowMeow.bit, A decentralized social network that mainly focuses on you.
 * 
 * By SysError99, Licensed with MIT
 */
const Receiver = require('./fn.receiver')
const Web = require('./fn.web')

const Post = require('./data/post')

/**
 * Stringify JSON object or array
 * @param {Object} o JSON or array object to be stringified
 * @returns {string}
 */
const str = o => JSON.stringify(o)

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
    console.log(`${data.data}`)
    /**
     * [0]:string Post owner (public key)
     * [1]:number Post position
     * [2]:string Social Command (such as post, like, comment, share, mention)
     * :
     * [.]:any
     * [n]:string Signature (optional)
     */

    if( typeof data[0] !== 'string' ||
        typeof data[1] !== 'number' ||
        typeof data[2] !== 'string' )
        return

    if(!receiver.storage.access(`${data[0]}`)) // !account exists
        return

    switch(data[2]){

        case 'media':
            /**
             * !! UNSTABLE, NOT TESTED !!
             * 
             * [3]:number media number
             */
            if(typeof data[3] !== 'number')
                return
            
            let postLocation = `${data[0]}.${data[1]}`
            let mediaLocation = `${postLocation}.media.${data[3]}`

            let post = new Post(receiver.storage.read(postLocation))

            if(typeof post.media[data[3]] === `undefined`)
                return

            if(receiver.storage.access(mediaLocation))
                return
            
            if(peer.mediaStream !== null)
                return

            peer.mediaStreamLocation = mediaLocation
            peer.mediaStream = receiver.storage.writeStream(mediaLocation)
            return

    }
})