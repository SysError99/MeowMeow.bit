const isAny = require('./type.any.check')
const FileSystem = require('fs')
const Locale = require('./locale')
const Result = require('./model/result')

/** File path structure*/
const P = {a: './data/', b: '.json'}
/** @type {Result} Pameter Invalid template*/
let paramInvalid = new Result()

/** Promisify storage functions*/
const promise = {
    /**
     * Retrieve a file from storage
     * @param {string} location File location
     * @returns {Promise<Result>} JSON of a file.
     */
    read: location => {
        return new Promise(async resolve => {
            try{
                resolve(new Result({
                    success: true,
                    data: JSON.parse(await FileSystem.promises.readFile(P.a + location + P.b, {encoding:'utf-8'}))
                }))
            }catch(e){
                resolve(new Result({
                    message: storage.locale.str.file.readErr + e
                }))
            }
        })
    },
    /**
     * Write an object to storage
     * @param {string} location File location
     * @param {Object} data JSON data object
     * @returns {Promise<Result>}
     */
    write: (location, data) => {
        return new Promise(async resolve => {
            try{
                await FileSystem.promises.writeFile(P.a + location + P.b, JSON.stringify(data), {encoding:'utf-8'})
                resolve(new Result({
                    success: true
                }))
            }catch(e){
                resolve(new Result({
                    message: storage.locale.str.file.writeErr + e
                }))
            }
        })
    }
}

/**
 * Retrieve a file from storage
 * @param {string} location File location
 * @returns {Result} Result of a read JSON
 */
const read = location => {
    try{
        return new Result({
            success: true,
            data: JSON.parse(FileSystem.readFileSync(P.a + location + P.b, {encoding:'utf-8'}))
        })
    }catch(e){
        return new Result({
            message: storage.locale.str.file.readErr + e
        })
    }
}

/**
 * Write an object to storage
 * @param {string} location File location
 * @param {Object} data JSON data object
 * @returns {Result} Result of a read JSON
 */
const write = (location, data) => {
    try{
        FileSystem.writeFileSync(P.a + location + P.b, JSON.stringify(data), {encoding:'utf-8'})
        return new Result({
            success: true
        })
    }catch(e){
        return new Result({
            message: storage.locale.str.file.writeErr + e
        })
    }
}

/** Shared storage module*/
const storage = {
    /** @type {Locale} Locale object, will be retreived from server*/
    locale: null,
    promise: promise,
    read: read,
    write: write
}

/**
 * Get a shared storage module. 
 * @param {Locale} locale Locale object from a server
 */
module.exports = locale => {
    if(isAny(locale)){
        if(locale.isLocale) storage.locale = locale
    }
    if(storage.locale === null) storage.locale = new Locale()
    paramInvalid.message = storage.locale.str.paramInvalid
    return storage
}