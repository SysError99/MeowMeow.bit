const FileSystem = require('fs')

const isAny = require('./fn.is.any')
const Try = require('./fn.try.catch')
const Return = require('./fn.try.return')

const Locale = require('./locale/locale')
const Result = require('./data/result')

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
        return new Promise(resolve => {
            resolve(Try(async () => 
                new Result({
                    success: true,
                    data: JSON.parse(await FileSystem.promises.readFile(P.a + location + P.b, {encoding:'utf-8'}))
                }),
                new Result({
                    message: storage.locale.str.file.readErr
                })
            ))
        })
    },
    /**
     * Write an object to storage
     * @param {string} location File location
     * @param {Object} data JSON data object
     * @returns {Promise<Result>}
     */
    write: (location, data) => {
        return new Promise(resolve => {
            resolve(Try(async () => 
                new Result({
                    success: true, 
                    data: await FileSystem.promises.writeFile(P.a + location + P.b, typeof data === 'object' ? JSON.stringify(data) : data, {encoding:'utf-8'})
                }),
                new Result({
                    message: storage.locale.str.file.writeErr
                })
            ))
        })
    }
}

/**
 * Check if the file exists.
 * @param {string} location Location to be check for existing files
 * @returns {boolean} If specified file has been found on disk
 */
const access = location => Return(() => FileSystem.accessSync(P.a + location + P.b))

/**
 * Remove file from storage
 * @param {string} location 
 */
const remove = location => Try(() => FileSystem.rmSync(P.a + location + P.b))

/**
 * Retrieve a file from storage
 * @param {string} location File location
 * @returns {Result} Result of a read JSON
 */
const read = location => Return(() =>
    new Result({
        success: true,
        data: JSON.parse(FileSystem.readFileSync(P.a + location + P.b, {encoding:'utf-8'}))
    }),
    new Result({
        message: storage.locale.str.file.readErr
    })
)

/**
 * Write an object to storage
 * @param {string} location File location
 * @param {Object} data JSON data object
 * @returns {Result} Result of a read JSON
 */
const write = (location, data) => Return(
    () => {
        FileSystem.writeFileSync(
            P.a + location + P.b,
            typeof data === 'object' ? JSON.stringify(data) : data, {encoding:'utf-8'}
        )

        return new Result({
            success: true
        })
    },
    new Result({
        message: storage.locale.str.file.writeErr
    })
)

/** Shared storage module*/
const storage = {
    /** @type {Locale} Locale object, will be retreived from server*/
    locale: null,
    promise: promise,
    access: access,
    read: read,
    remove: remove,
    write: write,
}

/**
 * Get a shared storage module. 
 * @param {Locale} locale Locale object from a server
 */
module.exports = locale => {
    if(isAny(locale)){
        if(locale.isLocale)
            storage.locale = locale
    }

    if(storage.locale === null)
        storage.locale = new Locale()
        
    paramInvalid.message = storage.locale.str.paramInvalid
    
    return storage
}