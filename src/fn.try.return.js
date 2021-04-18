const Debugger = require('./fn.debugger')

const TimeString = require('./data/time.string')

const ignores = require('./const').TRY_CATCH_IGNORE

/**
 * Try to execute this function and return value back if success, return undefined or specified value if fail.
 * @param {function} fn A function
 * @param {any} errreturn What to return when error has occured
 */
const tryCatch = (fn, errreturn) => {
    if (typeof fn === 'function') {
        try {
            return fn()
        }
        catch(e) {
            let err = new Error(e)

            for (let ignore of ignores) {
                if (err.stack.indexOf(ignore) >= 0)
                    return errreturn
            }

            Debugger.error(`${new TimeString().toString()} ${err.stack}`)
            return errreturn
        }
    }
    else
        throw Error('tryCatch() expects function!')
}
module.exports = tryCatch