const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const receiver = new Receiver((peer, data) => {
    console.log(data.data)
})

let func = () => {
    let peer = new Peer('', 0, process.argv[2])
    receiver.send(peer, 'hello')
}

func()