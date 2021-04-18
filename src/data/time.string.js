/** Time generator, as string */
const TimeString = class {
    /**
     * Get full time format
     * @param {number|string} t
     * @returns {string}
     */
    toString (t) {
        /** @type {Date} */
        let time

        if (typeof t === 'string' ||
            typeof t === 'number' )
            time = new Date(t)
        else
            time = new Date()

        let month = time.getUTCMonth()
        let date = time.getUTCDate()
        let hour = time.getUTCHours()
        let min = time.getUTCMinutes()

        return '['
             + String(time.getUTCFullYear()) + '/'
             + (month < 10 ? '0' + String(month + 1) : String(month)) + '/'
             + (date < 10 ? '0' + String(date) : String(date)) + ' '
             + (hour < 10 ? '0' + String(hour) : String(hour)) + ':'
             + (min < 10 ? '0' + String(min) : String(min))
             + ']'
    }
}

module.exports = TimeString