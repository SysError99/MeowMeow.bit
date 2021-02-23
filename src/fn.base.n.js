/*!
 * Modified version of Base58 to BaseN in JavaScript.
 * 
 * Github: https://github.com/45678/Base58
 */
/** @type {string} */
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
const ALPHABET_LEN = ALPHABET.length;
/** @type {string} */
const ALPHABET_62 =" 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ALPHABET_62_LEN = ALPHABET_62.length;
/** @type {string} */
const ALPHABET_92 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/= !#$%&()*,-.:;<>?@[]^_`{|}~";
const ALPHABET_92_LEN = ALPHABET_92.length;
const MAP_ALPHABET = {};
const MAP_ALPHABET_62 = {};
const MAP_ALPHABET_92 = {};

let i = 0;
while(i < ALPHABET_92.length){
    if(i < ALPHABET.length)
        MAP_ALPHABET[ALPHABET.charAt(i)] = i;
    
    if(i < ALPHABET_62.length)
        MAP_ALPHABET_62[ALPHABET_62.charAt(i)] = i;
    
    MAP_ALPHABET_92[ALPHABET_92.charAt(i)] = i;
    i++;
}
/**
 * Convert to text, base on Base58
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToText = digit => ALPHABET[digit];
/**
 * Convert to text, based on Base62
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToText62 = digit => ALPHABET_62[digit];
/**
 * Convert to text, base on Base92
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToText92 = digit => ALPHABET_92[digit];

/** BaseN module*/
module.exports = {
    /**
     * Encode to BaseN
     * @param {Buffer|string} buffer Buffer or string to be encoded
     * @param {string} type Encoding type
     * @returns {string} Encoded string
     */
    encode: (buffer, type) => {
        let carry, digits, j;
        /** @type {number} */
        let d
        switch(type){
            case "62":
                d = ALPHABET_62_LEN;
                break;
            case "92":
                d = ALPHABET_92_LEN;
                break;
            default:
                d = ALPHABET_LEN;
                break;
        }
        if(typeof buffer === "string"){
            buffer = Buffer.from(buffer);
        }
        if(buffer.length === 0) {
            return "";
        }
        i = void 0;
        j = void 0;
        digits = [0];
        i = 0;
        while(i < buffer.length){
            j = 0;
            while(j < digits.length){
                digits[j] <<= 8;
                j++;
            }
            digits[0] += buffer[i];
            carry = 0;
            j = 0;
            while(j < digits.length){
                digits[j] += carry;
                carry = (digits[j] / d) | 0;
                digits[j] %= d;
                ++j;
            }
            while(carry){
                digits.push(carry % d);
                carry = (carry / d) | 0;
            }
            i++;
        }
        i = 0;
        while(buffer[i] === 0 && i < buffer.length - 1){
            digits.push(0);
            i++;
        }
        digits = digits.reverse()
        switch(type){
            case "62":
                digits = digits.map(convertToText62);
                break;
            case "92":
                digits = digits.map(convertToText92);
                break;
            default:
                digits = digits.map(convertToText);
                break;
        }
        return digits.join("");
    },
    /**
     * Decode back to string
     * @param {string} string Encoded string
     * @param {string} type Encoding type
     * @returns {Buffer} Decoded buffer
     */
    decode: (string, type) => {
        let bytes, c, cc, d, carry, j;
        if(string.length === 0){
            return "";
        }
        switch(type){
            case "62":
                cc = MAP_ALPHABET_62;
                d = ALPHABET_62_LEN;
                break;
            case "92":
                cc = MAP_ALPHABET_92;
                d = ALPHABET_92_LEN;
                break;
            default:
                cc = MAP_ALPHABET;
                d = ALPHABET_LEN;
                break;
        }
        i = void 0;
        j = void 0;
        bytes = [0];
        i = 0;
        while(i < string.length){
            c = string[i];
            if(!(c in cc)){
                throw Error("BaseN.decode received unacceptable input. Character '" + c + "' is not in the BaseN alphabet.");
            }
            j = 0;
            while(j < bytes.length){
                bytes[j] *= d;
                j++;
            }
            bytes[0] += cc[c];
            carry = 0;
            j = 0;
            while(j < bytes.length){
                bytes[j] += carry;
                carry = bytes[j] >> 8;
                bytes[j] &= 0xff;
                ++j;
            }
            while(carry){
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
            i++;
        }
        i = 0;
        while(string[i] === "0" && i < string.length - 1){
            bytes.push(0);
            i++;
        }
        return Buffer.from(bytes.reverse());
    }
}