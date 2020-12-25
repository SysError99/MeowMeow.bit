/*!
 * Encrpytion module, separeted from Crpyto for the case of encryption method changes.
 */
const Crypto = require('crypto')
/** @type {number} Public key length per row*/
const len = 64
/** @type {string} Asymmetric key signing method*/
const signMethod = 'rsa-sha256'
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
    let strExtract = str.split('\n')
    strExtract.splice(strExtract.length - 2, 2)
    strExtract.splice(0,1)
    return strExtract.join('')
}

/** Key creator*/
const keyCreator = {
    /**
     * Generate a new asymmetric key
     * @param {string} password Passphrase for this key
     * @returns {import('crypto').KeyPairSyncResult<string,string>} Key result
     */
    asymmetric: function(password){
        let k = Crypto.generateKeyPairSync('ed25519', {
            modulusLength: 512,
            namedCurve: 'secp256k1', 
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'     
            },     
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: password
            } 
        })
        k.privateKey = short(k.privateKey)
        k.publicKey = short(k.publicKey)
        return k
    },
    /**
     * Generate a new symmetric key
     * @returns {[Buffer,Buffer]} Key and IV buffer
     */
    symmetric: function(){
        return [Crypto.randomBytes(32), Crypto.randomBytes(16)]
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
    encrpyt: function(str, key, password){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str === '' || key === '') return ''
        return Crypto.privateEncrypt({
            key: long(key, private.header),
            passphrase: (typeof password === 'string') ? password : ''
        }, Buffer.from(str, 'utf-8')).toString('base64')
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
        if(str === '' || key === '') return ''
        return Crypto.privateDecrypt({
            key: long(key, private.header),
            passphrase: (typeof password === 'string') ? password : ''
        }, Buffer.from(str, 'base64')).toString('utf8')
    },
    /**
     * Sign a string with a private key
     * @param {string} str String to be signed
     * @param {string} key Private key to be signed
     * @param {string} password Private key password (passphrase)
     */
    sign: function(str, key, password){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str === '' || key === '') return ''
        return Crypto.sign(signMethod, Buffer.from(str), {key: long(key, private.header), passphrase: password}).toString('base64')
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
    encrpyt: function(str, key){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str === '' || key === '') return ''
        return Crypto.publicEncrypt(long(key, public.header), Buffer.from(str,'utf8')).toString('base64')
    },
    /**
     * Decrypt with public key
     * @param {string} str String that will be decrypted
     * @param {string} key Public key that will be used to decrypt
     * @returns {string} Decrpyted string.
     */
    decrypt: function(str, key){
        if(typeof str !== 'string' || typeof key !== 'string') return ''
        if(str === '' || key === '') return ''
        return Crypto.publicDecrypt(long(key, public.header), Buffer.from(str, 'base64')).toString('utf8')
    },
    /**
     * Verify signature of a string with a public key
     * @param {string} str String of data to be verified
     * @param {string} key Public key to be used for verification
     * @param {string} signature Signature to be verified
     * @returns {boolean} Is this a correct signature?
     */
    verify: function(str, key, signature){
        if(typeof str !== 'string' || typeof key !== 'string' || typeof signature !== 'string') return false
        if(str === '' || key === '' || signature === '') return false
        return Crypto.verify(signMethod, Buffer.from(str), long(key, public.header), Buffer.from(signature, 'base64'))
    }
}
/** Symmetric encryption functions*/
const symmetric = {
    /**
     * Encrypt a string
     * @param {string} str string to be encrypted
     * @param {Buffer} key Key that will be used
     * @param {Buffer} iv IV that will be used
     * @returns {string} Encrypted string
     */
    encrypt: function(str, key, iv){
        if(typeof str !== 'string' || !Buffer.isBuffer(key) || !Buffer.isBuffer(iv)) return ''
        let cipherIv = Crypto.createCipheriv('aes-256-gcm', key, iv)
        let cipher = cipherIv.update(str)
        return Buffer.concat([cipher,cipherIv.final()]).toString('base64')
    },
    /**
     * Decrypt a string
     * @param {string} str String to be decrypted
     * @param {Buffer} key Key to be used
     * @param {Buffer} iv IV to be used
     * @returns {string} Decrypted string
     */
    decrypt: function(str, key, iv){
        if(typeof str !== 'string' || !Buffer.isBuffer(key) || !Buffer.isBuffer(iv)) return ''
        let encrypted = Buffer.from(str, 'base64')
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
    symmetric: symmetric
}