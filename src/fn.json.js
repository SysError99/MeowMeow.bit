/**
 * Convert to JSON object
 * @param {string} str String to be converted to 
 */
const json = str => JSON.parse(str, (key,value) => value === null ? undefined : value)

/**
 * Convert to JSON string
 * @param {any} obj Anything to be converted to JSON
 */
const str = obj => JSON.stringify(obj)

module.exports = {
    json: json,
    str: str
}