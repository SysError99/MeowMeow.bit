const FileSystem = require('fs')
const Locale = require('./locale')
const Result = require('./model/result')

/** Shared storage module*/
const storage = {
    /** @type {Locale} Locale object, will be retreived from server*/
    locale: null,
    read: read,
    write: write
}

/**
 * Retrieve a file from storage
 * @param {string} location File location
 * @returns {Promise<Result>} JSON of a file.
 */
const read = function(location){
    return new Promise(async function(resolve){
        try{
            resolve(new Result({
                success: true,
                data: JSON.parse(await FileSystem.promises.readFile('./' + location, {encoding:'utf-8'}))
            }))
        }catch(e){
            resolve(new Result({
                message: storage.locale.str.file.readErr + e
            }))
        }
    })
}

/**
 * Write an object to storage
 * @param {string} location File location
 * @param {Object} data JSON data object
 * @returns {Promise<Result>}
 */
const write = function(location, data){
    return new Promise(async function(resolve){
        if(typeof data !== 'object'){
            resolve(new Result({
                message: storage.locale.str.paramInvalid
            }))
            return
        }
        try{
            await FileSystem.promises.writeFile('./' + location, JSON.stringify(data), {encoding:'utf-8'})
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

/**
 * Get a shared storage module. 
 * @param {Locale} locale Locale object from a server
 */
module.exports = function(locale){
    if(typeof locale === 'object')
        storage.locale = locale
    else
        storage.locale = new Locale()
    return storage
}