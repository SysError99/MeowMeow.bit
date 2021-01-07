/*!
 * Encrpytion module, separeted from Crpyto for the case of encryption method changes.
 */
const Crypto = require('crypto')
const BaseN = require('./base.n')
/** @type {string} Currently used EC*/
const curve = 'sect571k1'
/** @type {number} Public key length per row*/
const len = 64
/**
 * Restore public key to its original state
 * @param {string} str String to be restored
 * @param {[string,string]} prefix What to be inserted 
 * @returns {string} Restored string
 */
const long = (str,prefix) => {
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
    if(str.length < 3) return str.join('\n')
    str.splice(str.length - 2, 2)
    str.splice(0,1)
    return str.join('')
}

/** Key creator*/
const keyCreator = {
    /**
     * Generate a new asymmetric key
     * @param {string} password Passphrase for this key
     * @returns {import('crypto').KeyPairSyncResult<string,string>} Key result
     */
    asymmetric: password => {
        let k = Crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
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
     * Create Elliptic Curve Diffie-Hellman object
     * @param {Buffer|string} key Buffer to be used as private key
     * @returns {Crypto.ECDH} ECDH key object
     */
    ecdh: key => {
        let ecdh =  Crypto.createECDH(curve)
        if(Buffer.isBuffer(key)) ecdh.setPrivateKey(key)
        else if(typeof key === 'string') ecdh.setPrivateKey(BaseN.decode(key, '62'))
        else ecdh.generateKeys()
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
    symmetric: () => {
        return Crypto.randomBytes(32)
    }
}
const ecdh = {
    /**
     * Compute a secret key
     * @param {Crypto.ECDH} ecdh ECDH Key object
     * @param {Buffer} public Public key
     * @returns {Buffer} Secret key
     */
    computeSecret: (ecdh, public) => {
        return ecdh.computeSecret(public)
    }
}
/** Private key encryption functions*/
const private = {
    /** @type {[string,string]} Header to be used for long()*/
    header: ['-----BEGIN ENCRYPTED PRIVATE KEY-----', '-----END ENCRYPTED PRIVATE KEY-----'],
    /**
     * Encrypt with private key
     * @param {string} str String that will be encrypted
     * @param {string} key Private key that will be used to encrypt
     * @param {string} password Password for decrypting private key
     * @returns {string} Encrpyted string.
     */
    encrypt: (str, key, password) => {
        return BaseN.encode(Crypto.privateEncrypt({
            key: long(key, private.header),
            passphrase: (typeof password === 'string') ? password : ''
        }, Buffer.from(str, 'utf-8')), '62')
    },
    /**
     * Decrypt with private key
     * @param {string} str String that will be decrypted
     * @param {string} key Private key that will be used to decrypt
     * @param {string} password Password for decrypting private key
     * @returns {string} Decrpyted string.
     */
    decrypt: (str, key, password) => {
        return Crypto.privateDecrypt({
            key: long(key, private.header),
            passphrase: (typeof password === 'string') ? password : ''
        }, BaseN.decode(str, '62')).toString('utf-8')
    }
}
/** Public key encryption functions*/
const public = {
    /** @type {[string,string]} Header to be used for long()*/
    header: ['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----'],
    /**
     * Encrypt with public key
     * @param {string} str String that will be encrypted
     * @param {string} key Public key that will be used to encrypt
     * @returns {string} Encrpyted string.
     */
    encrypt: (str, key) => {
        return BaseN.encode(Crypto.publicEncrypt(long(key, public.header), Buffer.from(str,'utf8')), '62')
    },
    /**
     * Decrypt with public key
     * @param {string} str String that will be decrypted
     * @param {string} key Public key that will be used to decrypt
     * @returns {string} Decrpyted string.
     */
    decrypt: (str, key) => {
        return Crypto.publicDecrypt(long(key, public.header), BaseN.decode(str, '62')).toString('utf8')
    }
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
    perform: (str,key,password) => {
        return BaseN.encode(Crypto.sign(null, Buffer.from(str), {key: long(key, private.header), passphrase: password}), '62')
    },
    /**
     * Perform key verification
     * @param {string} str String to be verified
     * @param {string} key Key to be used
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    verify: (str,key,signature) => {
        return Crypto.verify(null, Buffer.from(str), long(key, public.header), BaseN.decode(signature, '62'))
    }
}
/** Symmetric encryption functions*/
const symmetric = {
    /**
     * Encrypt a string
     * @param {string} str string to be encrypted
     * @param {Buffer} key Key that will be used
     * @returns {string} Encrypted string
     */
    encrypt: (str, key) => {
        let iv = Crypto.randomBytes(16)
        let cipherIv = Crypto.createCipheriv('aes-256-gcm', key, iv)
        str = cipherIv.update(str)
        return BaseN.encode(Buffer.concat([iv,str,cipherIv.final()]), '62')
    },
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @param {Buffer} key Key to be used
     * @returns {string} Decrypted string
     */
    decrypt: (str, key) => {
        str = BaseN.decode(str, '62')
        let iv  = str.slice(0,16)
        str = str.slice(16, str.length)
        return Crypto.createDecipheriv('aes-256-gcm', key, iv).update(str).toString('utf-8')
    }
}
/**
 * Encryption module
 */
module.exports = {
    ecdh: ecdh,
    newKey: keyCreator,
    private: private,
    public: public,
    /**
     * Generate a randomized buffer
     * @param {number} size Buffer size
     * @returns {Buffer} Randomized buffer
     */
    rand: size => {
        if(typeof size !== 'number') return Crypto.randomBytes(3)
        return Crypto.randomBytes(Math.floor(size))
    },
    sign: sign,
    symmetric: symmetric
}