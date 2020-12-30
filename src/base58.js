/**
 * Modified version of Base58 on JavaScript.
 * 
 * Github: https://github.com/45678/Base58
 */
let ALPHABET, ALPHABET_MAP, i;
ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
ALPHABET_MAP = {};
i = 0;
while (i < ALPHABET.length) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
    i++;
}
/** Base58 module*/
module.exports = {
    /**
     * Encode to Base58
     * @param {Buffer|string} buffer Buffer or string to be encoded
     * @returns {string} Encoded string
     */
    encode: function(buffer) {
        let carry, digits, j;
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
        while (i < buffer.length) {
            j = 0;
            while (j < digits.length) {
                digits[j] <<= 8;
                j++;
            }
            digits[0] += buffer[i];
            carry = 0;
            j = 0;
            while (j < digits.length) {
                digits[j] += carry;
                carry = (digits[j] / 58) | 0;
                digits[j] %= 58;
                ++j;
            }
            while (carry) {
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
            i++;
        }
        i = 0;
        while (buffer[i] === 0 && i < buffer.length - 1) {
            digits.push(0);
            i++;
        }
        return digits.reverse().map(function(digit) {
            return ALPHABET[digit];
        }).join("");
    },
    /**
     * Decode back to string
     * @param {string} string Encoded string
     * @returns {string} Decoded string
     */
    decode: function(string) {
        let bytes, c, carry, j;
        if (string.length === 0) {
            return '';
        }
        i = void 0;
        j = void 0;
        bytes = [0];
        i = 0;
        while (i < string.length) {
            c = string[i];
            if (!(c in ALPHABET_MAP)) {
                throw "Base58.decode received unacceptable input. Character '" + c + "' is not in the Base58 alphabet.";
            }
            j = 0;
            while (j < bytes.length) {
                bytes[j] *= 58;
                j++;
            }
            bytes[0] += ALPHABET_MAP[c];
            carry = 0;
            j = 0;
            while (j < bytes.length) {
                bytes[j] += carry;
                carry = bytes[j] >> 8;
                bytes[j] &= 0xff;
                ++j;
            }
            while (carry) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
            i++;
        }
        i = 0;
        while (string[i] === "1" && i < string.length - 1) {
            bytes.push(0);
            i++;
        }
        return Buffer.from(bytes.reverse()).toString('utf-8');
    }
}