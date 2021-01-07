/**
 * Check if value is 'any'
 * @param {any} val Value to check
 */
const isAny = val => {
    try{
        return typeof val === 'object' && !Array.isArray(val) && val !== null
    }
    catch{
        return false
    }
}
module.exports = isAny