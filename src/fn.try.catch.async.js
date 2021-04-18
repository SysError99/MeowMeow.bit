const TimeString = require('./data/time.string')

const ignores = require('./const').TRY_CATCH_IGNORE
/**
 * Try to execute this function, and handle error automatically
 * @param {function} fn A function
 * @param {Promise<boolean>} kick Throws an error if there is an error
 */
const tryCatch = async (fn, kick) => {
    if (typeof fn === 'function') {
        if (kick) {
            await fn()
            return
        }

        try {
            await fn()
            return false
        }
        catch(e) {
            let err = new Error(e)

            for (let ignore of ignores) {
                if (err.stack.indexOf(ignore) >= 0)
                    return true
            }

            console.error(`${new TimeString().toString()} ${err.stack}`)
            return true
        }
    }
    else
        throw Error('tryCatch() expects function!')
}
module.exports = tryCatch