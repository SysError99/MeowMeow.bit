const Crypt = require('../src/fn.crypt')
const BaseN = require('../src/fn.base.n')
const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const peer = new Peer([process.argv[2], parseInt(process.argv[3]), BaseN.decode(process.argv[4], '62')])

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

let func = () => receiver.send(peer, ['hello'])

func()