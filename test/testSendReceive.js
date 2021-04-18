const Debugger = require('./fn.debugger')
const Peer = require('../src/data/peer')
const Receiver = require('../src/fn.receiver')

const ip = process.argv[2]
const port = parseInt(process.argv[3])
const peer = new Peer([ip, port])

const receiver = new Receiver((peer, data) => {
    Debugger.log(data.data)
    Debugger.log(data.message)
})

let funcAsync = async () => {
    let i = 0
    while (i<1024) {
        await receiver.send(peer, [i])
        i++
    }
}

let func = () => receiver.send(peer, ['hello'])

func()