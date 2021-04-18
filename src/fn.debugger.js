const __ = require('./const')

const TimeString = require('./data/time.string')

const Debugger = class {
    error (message) {
        if (!__.TEST)
            return

        console.error(`${new TimeString().toString()} ${message}`)
    }

    log (message) {
        if (!__.TEST)
            return

        console.log(`${new TimeString().toString()} ${message}`)
    }

    warn (message) {
        if (!__.TEST)
            return

        console.warn(`${new TimeString().toString()} ${message}`)
    }
}

const d = new Debugger()

module.exports = d