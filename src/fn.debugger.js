const __ = require('./const')

const TimeString = require('./data/time.string')

const Debugger = class {
    error (message) {
        if (!__.TEST)
            return

        console.error(`${new TimeString().toString()} E -> ${message}`)
    }

    log (message) {
        if (!__.DEBUG)
            return

        console.log(`${new TimeString().toString()} ${message}`)
    }

    warn (message) {
        if (!__.DEBUG)
            return

        console.warn(`${new TimeString().toString()} W -> ${message}`)
    }
}

const d = new Debugger()

module.exports = d