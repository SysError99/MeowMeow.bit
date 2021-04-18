/** Time generator, as string */
const TimeString = class {
    /**
     * Get full time format
     * @param {number|string} t
     * @returns {string}
     */
    toString (t) {
        let time = new Date(t)
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