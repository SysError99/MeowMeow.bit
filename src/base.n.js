/*!
 * Modified version of Base58 to BaseN in JavaScript.
 * 
 * Github: https://github.com/45678/Base58
 */
let ALPHABET, ALPHABET_62, MAP_ALPHABET, MAP_ALPHABET_62, i;
ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"; 
ALPHABET_62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
MAP_ALPHABET = {};
MAP_ALPHABET_62 = {};
i = 0;
while(i < ALPHABET_62.length){
    if(i < ALPHABET.length){
        MAP_ALPHABET[ALPHABET.charAt(i)] = i;
    }
    MAP_ALPHABET_62[ALPHABET_62.charAt(i)] = i;
    i++;
}
/**
 * Convert to text
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToText = function(digit){
    return ALPHABET[digit];
}
/**
 * Convert to text, based on Base62
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToText62 = function(digit){
    return ALPHABET_62[digit];
}
/** BaseN module*/
module.exports = {
    /**
     * Encode to BaseN
     * @param {Buffer|string} buffer Buffer or string to be encoded
     * @param {string} type Encoding type
     * @returns {string} Encoded string
     */
    encode: function(buffer, type){
        let carry, digits, j;
        let d = type === "62" ? 62 : 58
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
        if(type === "62") digits = digits.map(convertToText62);
        else digits = digits.map(convertToText);
        return digits.join("");
    },
    /**
     * Decode back to string
     * @param {string} string Encoded string
     * @param {string} type Encoding type
     * @returns {Buffer} Decoded buffer
     */
    decode: function(string, type){
        let bytes, c, cc, d, carry, j;
        if(string.length === 0){
            return "";
        }
        else if(type === "62"){
            cc = MAP_ALPHABET_62;
            d = 62;
        }
        else {
            cc = MAP_ALPHABET;
            d = 58;
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