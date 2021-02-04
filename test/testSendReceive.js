const BaseN = require('../src/base.n')
const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const server = new Receiver((socket,key,data) => {

})

let func = () => {

    let peer = new Peer([
        '::ffff:127.0.0.1',
        parseInt(process.argv[2]),
        BaseN.decode(server.key.current.get.pub(), '62').toString('base64')
    ])

    let msg = ['hello']

    setInterval(async () => {
        let result = await server.peer.send(peer, msg)
        if(result.success)
            console.log('hello ' + result.data[0])
        else
            console.error(result.message)
    }, 1000)

}

func()