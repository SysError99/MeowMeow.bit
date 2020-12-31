/*!
 * Modified version of Base58 on JavaScript.
 * 
 * Github: https://github.com/45678/Base58
 */
let ALPHABET, ALPHABET_SCRAMBLED, ALPHABET_MAP, ALPHABET_MAP_SCRAMBLED, i;
ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"; 
ALPHABET_SCRAMBLED = "013579ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
ALPHABET_MAP = {};
ALPHABET_MAP_SCRAMBLED = {};
i = 0;
while(i < ALPHABET.length){
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
    ALPHABET_MAP_SCRAMBLED[ALPHABET_SCRAMBLED.charAt(i)] = i;
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
 * Convert to text, and scramble
 * @param {number} digit 
 * @returns {string[]} Array of string
 */
const convertToTextScramble = function(digit){
    if(digit === 1) return Math.random() > 0.5 ? '1' : '2';
    if(digit === 2) return Math.random() > 0.5 ? '3' : '4';
    if(digit === 3) return Math.random() > 0.5 ? '5' : '6';
    if(digit === 4) return Math.random() > 0.5 ? '7' : '8';
    return ALPHABET_SCRAMBLED[digit];
}
/** Base58 module*/
module.exports = {
    /**
     * Encode to Base58
     * @param {Buffer|string} buffer Buffer or string to be encoded
     * @param {boolean} scramble Scramble binary stream?
     * @returns {string} Encoded string
     */
    encode: function(buffer, scramble){
        let carry, digits, encoded, j;
        if(typeof buffer === 'string'){
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
                carry = (digits[j] / 58) | 0;
                digits[j] %= 58;
                ++j;
            }
            while(carry){
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
            i++;
        }
        i = 0;
        while(buffer[i] === 0 && i < buffer.length - 1){
            digits.push(0);
            i++;
        }
        if(scramble === true) encoded = digits.reverse().map(convertToTextScramble);
        else encoded = digits.reverse().map(convertToText);
        return encoded.join("");
    },
    /**
     * Decode back to string
     * @param {string} string Encoded string
     * @param {boolean} scramble Scramble binary stream?
     * @returns {Buffer} Decoded buffer
     */
    decode: function(string, scramble){
        let bytes, c, cc, carry, j;
        if(string.length === 0){
            return '';
        }
        if(scramble === true){
            cc = ALPHABET_MAP_SCRAMBLED;
        }
        else{
            cc = ALPHABET_MAP;
        }
        i = void 0;
        j = void 0;
        bytes = [0];
        i = 0;
        while(i < string.length){
            if(scramble === true){
                switch(string[i]){
                    case '2': c = '1'; break;
                    case '4': c = '3'; break;
                    case '6': c = '5'; break;
                    case '8': c = '7'; break;
                    default: c = string[i]; break;
                }
            }else{
                c = string[i];
            }
            if(!(c in cc)){
                throw "Base58.decode received unacceptable input. Character '" + c + "' is not in the Base58 alphabet.";
            }
            j = 0;
            while(j < bytes.length){
                bytes[j] *= 58;
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