const Crypt = require('../src/fn.crypt')
const BaseN = require('../src/fn.base.n')
const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const peer = new Peer(['', 0, BaseN.decode(process.argv[2], '62')])

const receiver = new Receiver((peer, data) => {
    console.log(data.data)
    console.log(data.message)
})

let funcAsync = async () => {
    let i = 0
    while(i<1024){
        await receiver.send(peer, [i])
        i++
    }
}

let funcResearch = async () => {
    let i = 0
    while(i < 1024){
        await receiver.send(peer, [BaseN.encode(Crypt.rand(128), '92')])

        await (() => new Promise(resolve => {
            setTimeout(() => resolve(), 2000)
        }))

        receiver.deletePeer(peer)
        peer.connected = false
        i++
    }
}

let func = () => {
    receiver.send(peer, ['hello'])
}

funcResearch()