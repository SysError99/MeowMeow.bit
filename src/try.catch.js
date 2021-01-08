/**
 * Try to execute this function, and handle error automatically
 * @param {function} fn A function
 * @param {any} errreturn What to return when error has occured
 */
const tryCatch = (fn, errreturn) => {
    if(typeof fn === 'function'){
        try{
            let result = fn()
            return typeof result === 'undefined' ? true : result
        }catch(e){
            let err = new Error(e)
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
            return typeof errreturn === 'undefined' ? false : errreturn
        }
    }else
        throw Error('tryCatch() expects funtion!')
}
module.exports = tryCatch