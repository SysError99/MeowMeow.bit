const FileSystem = require('fs')

const isAny = require('./fn.is.any')
const Try = require('./fn.try.catch')
const Return = require('./fn.try.return')
const {json, str} = require('./fn.json')

const Locale = require('./locale/locale')

/**
 * Convert data to supported format
 * @param {any} d 
 * @returns {any}
 */
const convert = d => {
    if (typeof d === 'object') {
        if (
            d instanceof Array ||
            d instanceof Buffer ||
            d instanceof DataView
        )
            return d
    }

    return str(d)
}

/** File path structure*/
const P = {a: './data/', b: '.json'}

/** Promisify storage functions*/
const promise = {
    /**
     * Check if the file exists.
     * @param {string} location Location to be check for existing files
     * @returns {Promise<boolean>} If specified file has been found on disk
     */
    access: async location => {
        try {
            await FileSystem.promises.access(P.a + location + P.b)
            return true
        }
        catch {
            return false
        }
    },
    /**
     * Retrieve a file from storage
     * @param {string} location File location
     * @returns {Promise<any[]>} JSON of a file.
     */
    read: location => {
        return new Promise(resolve => {
            resolve(Return(async () => json(await FileSystem.promises.readFile(P.a + location + P.b, {encoding:'utf-8'}))))
        })
    },
    /**
     * Write an object to storage
     * @param {string} location File location
     * @param {Object} data JSON data object
     * @returns {Promise<boolean>}
     */
    write: (location, data) => {
        return new Promise(resolve => {
            resolve(Try(async () => 
                await FileSystem.promises.writeFile(P.a + location + P.b, convert(data), {encoding:'utf-8'})
            ))
        })
    }
}

/** Binary file mode */
const bin = {
    /**
     * Check if the file exists.
     * @param {string} location Location to be check for existing files
     * @returns {boolean} If specified file has been found on disk
     */
    access: location => !Try(() => FileSystem.accessSync(P.a + location)),

    /**
     * Remove file from storage
     * @param {string} location Location of the file to be removed
     * @returns {boolean} Did the file been successfully removed
     */
    remove: location => Try(() => FileSystem.rmSync(P.a + location)),

    /**
     * Retrieve a file from storage
     * @param {string} location File location
     * @returns {Buffer} Result of a read JSON
     */
    read: location => Return(() => FileSystem.readFileSync(P.a + location, {encoding:'binary'})),

    /**
     * Write an object to storage
     * @param {string} location File location
     * @param {Buffer} data JSON data object
     * @returns {boolean} Result of a read JSON
     */
    write: (location, data) => Try(() => FileSystem.writeFileSync(P.a + location, data, {encoding:'binary'}))
}

/**
 * Check if the file exists.
 * @param {string} location Location to be check for existing files
 * @returns {boolean} If specified file has been found on disk
 */
const access = location => !Try(() => FileSystem.accessSync(P.a + location + P.b))

/**
 * Remove file from storage
 * @param {string} location Location of the file to be removed
 * @returns {boolean} Did the file been successfully removed
 */
const remove = location => Try(() => FileSystem.rmSync(P.a + location + P.b))

/**
 * Retrieve a file from storage
 * @param {string} location File location
 * @returns {any[]} Result of a read JSON
 */
const read = location => Return(() => json(FileSystem.readFileSync(P.a + location + P.b, {encoding:'utf-8'})))

/**
 * Write an object to storage
 * @param {string} location File location
 * @param {Object} data JSON data object
 * @returns {boolean} Result of a read JSON
 */
const write = (location, data) => Try(() => FileSystem.writeFileSync(P.a + location + P.b, convert(data), {encoding:'utf-8'}))

/** Shared storage module*/
const storage = {
    /** @type {Locale} Locale object, will be retreived from server*/
    locale: undefined,
    promise: promise,
    bin: bin,
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
    if (isAny(locale)) {
        if (locale.isLocale)
            storage.locale = locale
    }

    if (typeof storage.locale === 'undefined')
        storage.locale = new Locale()

    return storage
}