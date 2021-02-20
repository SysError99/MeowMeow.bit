const BaseN = require('../src/fn.base.n')
const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const receiver = new Receiver((peer, data) => {
    console.log(data.data)
})

let func = () => {
    let peer = new Peer(['', 0, BaseN.decode(process.argv[2])])
    receiver.send(peer, 'hello')
}

func()