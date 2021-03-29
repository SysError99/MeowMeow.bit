/*!
 * Encrpytion module, separeted from Crpyto for the case of encryption method changes.
 */
const Crypto = require('crypto')
const FileSystem = require('fs')

const BaseN = require('./fn.base.n')

/** @type {string} Currently used EC*/
const curve = 'sect571k1'

/** Key headers*/
const header = {
    /** @type {[string,string]} Private key encryption functions*/
    private: ['-----BEGIN ENCRYPTED PRIVATE KEY-----', '-----END ENCRYPTED PRIVATE KEY-----'],
    /** @type {[string,string]} Public key encryption functions*/
    public: ['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----']
}

/** @type {number} Public key length per row*/
const len = 64

/**
 * Restore public key to its original state
 * @param {string} str String to be restored
 * @param {[string,string]} prefix What to be inserted 
 * @returns {string} Restored string
 */
const long = (str,prefix) => {
    str = BaseN.decode(str, '62').toString('base64')
    let s
    let strRows = Math.ceil(str.length / len)
    let strArr = Array(strRows + 2)
    let strOffset = 0
    strArr[0] = prefix[0]
    for(s=1; s <= strRows; s++){
        strArr[s] = str.substr(strOffset, len)
        strOffset += len
    }
    strArr[s] = prefix[1]
    return strArr.join('\n')
}

/**
 * Shorten public key 
 * @param {string} str String to be shortened
 * @returns {string} 
 */
const short = str => {
    str = str.split('\n')
    if(str.length < 3)
        return str.join('\n')
    str.splice(str.length - 2, 2)
    str.splice(0,1)
    return BaseN.encode(Buffer.from(str.join(''), 'base64'), '62')
}

/** Key creator*/
const keyCreator = {

    /**
     * Create Elliptic Curve Diffie-Hellman object
     * @param {Buffer|string} key Buffer to be used as private key
     * @returns {Crypto.ECDH} ECDH key object
     */
    ecdh: key => {
        let ecdh =  Crypto.createECDH(curve)
        if(typeof key === 'string')
            ecdh.setPrivateKey(Buffer.from(key, 'base64'))
        else if(Buffer.isBuffer(key))
            ecdh.setPrivateKey(key)
        else
            ecdh.generateKeys()
        return ecdh
    },

    /**
     * Generate a new signing key
     * @returns {import('crypto').KeyPairSyncResult<string,string>} Key result
     */
    sign: password => {
        let k = Crypto.generateKeyPairSync('ed25519', {
            modulusLength: 512,
            namedCurve: curve, 
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'     
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: typeof password === 'string' ? password : ''
            }
        })
        k.privateKey = short(k.privateKey)
        k.publicKey = short(k.publicKey)
        return k
    },
    
    /**
     * Generate a new symmetric key
     * @returns {Buffer} Key buffer
     */
    symmetric: () => Crypto.randomBytes(32)

}
const ecdh = {

    /** @type {number} ECDH Key length*/
    length: keyCreator.ecdh().getPublicKey().length - 1, //sect571k1.short()

    /**
     * Compute a secret key
     * @param {Crypto.ECDH} ecdh ECDH Key object
     * @param {Buffer} public Public key
     * @returns {Buffer} Secret key
     */
    computeSecret: (ecdh, public) => ecdh.computeSecret(public).slice(32,64)

}
/**
 * Perform file hashing
 * @param {string} file File location to be hashed
 * @return {Promise<string>}
 */
const hash = file => new Promise(resolve => {
    let hash = Crypto.createHash('sha256')
    let stream = FileSystem.createReadStream(file)

    stream.on('error', err => {
        console.error(new Error(err))
        resolve(undefined)
    })
    stream.on('data', chunk => {
        hash.update(chunk)
    })
    stream.on('end', () => {
        stream.close()
        resolve(BaseN.encode(hash.digest(), '92'))
    })
})

const sect571k1 = {

    /**
     * Restore 'sect571k1' ECDH public key
     * @param {Buffer} buf 
     */
    long: buf => Buffer.concat([Buffer.from([4]),buf]),

    /**
     * Shorten 'sect571k1' ECDH public key
     * @param {Buffer} buf 
     */
    short: buf => buf.slice(1, buf.length)
}
/** Key signing functions*/
const sign = {

    /**
     * Perform a key signing
     * @param {string} str String to be signed
     * @param {string} key Key to be used
     * @param {string} password Password (passphrase) to be used
     * @returns {string} Signature
     */
    perform: (str,key,password) => BaseN.encode(Crypto.sign(undefined, Buffer.from(str), {key: long(key, header.private), passphrase: typeof password === 'string' ? password : ''}), '92'),

    /**
     * Perform key verification
     * @param {string} str String to be verified
     * @param {string} key Key to be used
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    verify: (str,key,signature) => Crypto.verify(undefined, Buffer.from(str), long(key, header.public), BaseN.decode(signature, '92'))

}
/** Symmetric encryption functions*/
const symmetric = {

    /**
     * Encrypt a string or buffer
     * @param {Buffer|string} str string to be encrypted
     * @param {Buffer} key Key that will be used
     * @returns {Buffer} Encrypted string
     */
    encrypt: (str, key) => {
        let iv = Crypto.randomBytes(16)
        let cipherIv = Crypto.createCipheriv('aes-256-gcm', key, iv)
        str = cipherIv.update(str)
        return Buffer.concat([iv,str,cipherIv.final()])
    },

    /**
     * Decrypt a buffer
     * @param {Buffer} buf Buffer to be decrypted (Can be decoded from string)
     * @param {Buffer} key Key to be used
     * @returns {Buffer} Decrypted buffer
     */
    decrypt: (buf, key) => {
        let iv  = buf.slice(0,16)
        buf = buf.slice(16, buf.length)
        return Crypto.createDecipheriv('aes-256-gcm', key, iv).update(buf)
    }

}
/**
 * Encryption module
 */
module.exports = {

    ecdh: ecdh,
    hash: hash,
    newKey: keyCreator,
    sect571k1, sect571k1,
    sign: sign,
    symmetric: symmetric,

    /**
     * Generate a randomized buffer
     * @param {number} size Buffer size
     * @returns {Buffer} Randomized buffer
     */
    rand: size => {
        if(typeof size !== 'number')
            return Crypto.randomBytes(3)
        return Crypto.randomBytes(Math.floor(size))
    }

}