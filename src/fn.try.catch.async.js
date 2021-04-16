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

            let errTime = new Date()
            let errMonth = errTime.getUTCMonth()
            let errDate = errTime.getUTCDate()
            let errHour = errTime.getUTCHours()
            let errMin = errTime.getUTCMinutes()

            console.error(
                '['
                 + String(errTime.getUTCFullYear()) + '/'
                 + (errMonth < 10 ? '0' + String(errMonth + 1) : String(errMonth)) + '/'
                 + (errDate < 10 ? '0' + String(errDate) : String(errDate)) + ' '
                 + (errHour < 10 ? '0' + String(errHour) : String(errHour)) + ':'
                 + (errMin < 10 ? '0' + String(errMin) : String(errMin))
                 + '] '
                 + err.stack
            )

            return true
        }
    }
    else
        throw Error('tryCatch() expects function!')
}
module.exports = tryCatch