/*!
 * Encrpytion module, separeted from Crpyto for the case of encryption method changes.
 */
const Crypto = require('crypto')
const BaseN = require('./base.n')
/** @type {number} Public key length per row*/
const len = 64
/**
 * Restore public key to its original state
 * @param {string} str String to be restored
 * @param {[string,string]} prefix What to be inserted 
 * @returns {string} Restored string
 */
const long = function(str,prefix){
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
const short = function(str){
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
    asymmetric: function(password){
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
     * Generate a new signing key
     * @returns {import('crypto').KeyPairSyncResult<string,string>} Key result
     */
    sign: function(password){
        let k = Crypto.generateKeyPairSync('ed25519', {
            modulusLength: 512,
            namedCurve: 'secp521r1', 
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
    symmetric: function(){
        return Crypto.randomBytes(32)
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
    encrypt: function(str, key, password){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str.length === 0 || key.length === 0) return ''
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
    decrypt: function(str, key, password){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str.length === 0 || key.length === 0) return ''
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
    encrypt: function(str, key){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str.length === 0 || key.length === 0) return ''
        return BaseN.encode(Crypto.publicEncrypt(long(key, public.header), Buffer.from(str,'utf8')), '62')
    },
    /**
     * Decrypt with public key
     * @param {string} str String that will be decrypted
     * @param {string} key Public key that will be used to decrypt
     * @returns {string} Decrpyted string.
     */
    decrypt: function(str, key){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str.length === 0 || key.length === 0) return ''
        try{
            return Crypto.publicDecrypt(long(key, public.header), BaseN.decode(str, '62')).toString('utf8')
        }catch(e){
            console.error('E -> Crypt.public.decrypt: ' + e)
            return ''
        }
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
    perform: function(str,key,password){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str.length === 0 || key.length === 0) return ''
        return BaseN.encode(Crypto.sign(null, Buffer.from(str), {key: long(key, private.header), passphrase: password}), '62')
    },
    /**
     * Perform key verification
     * @param {string} str String to be verified
     * @param {string} key Key to be used
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this legit?
     */
    verify: function(str,key,signature){
        if(typeof str !== 'string' || typeof key !== 'string' || typeof signature !== 'string') return false
        if(str.length === 0 || key.length === 0 || signature.length === 0) return false
        try{
            return Crypto.verify(null, Buffer.from(str), long(key, public.header), BaseN.decode(signature, '62'))
        }catch(e){
            console.error('E -> Crypt.sign.verify: ' + e)
            return false
        }
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
    encrypt: function(str, key){
        if(typeof str !== 'string' || !Buffer.isBuffer(key)) return ''
        let iv = Crypto.randomBytes(16)
        let cipherIv = Crypto.createCipheriv('aes-256-gcm', key, iv)
        let cipher = cipherIv.update(str)
        return BaseN.encode(Buffer.concat([cipher,cipherIv.final()]).toString('base64') + ',' + iv.toString('base64'), '62')
    },
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @param {Buffer} key Key to be used
     * @returns {string} Decrypted string
     */
    decrypt: function(str, key){
        if(typeof str !== 'string' || !Buffer.isBuffer(key)) return ''
        try{
            str = BaseN.decode(str, '62').toString('utf-8').split(',')
        }catch(e){
            console.error('E -> Crypt.public.decrypt: ' + e)
            return ''
        }
        if(str.length !== 2) return ''
        let encrypted = Buffer.from(str[0], 'base64')
        let iv = Buffer.from(str[1], 'base64')
        return Crypto.createDecipheriv('aes-256-gcm', key, iv).update(encrypted).toString('utf-8')
    }
}
/**
 * Encryption module
 */
module.exports = {
    newKey: keyCreator,
    private: private,
    public: public,
    /**
     * Generate a randomized buffer
     * @param {number} size Buffer size
     * @returns {Buffer} Randomized buffer
     */
    rand: function(size){
        if(typeof size !== 'number') return Crypto.randomBytes(3)
        return Crypto.randomBytes(Math.floor(size))
    },
    sign: sign,
    symmetric: symmetric
}