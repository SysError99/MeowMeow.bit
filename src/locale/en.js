const Locale = require('../locale')
/**
 * Translate to english.
 * @param {Locale} locale Locale object
 */
module.exports = locale => {
    locale.current = 'en'

    locale.str.file.readErr = 'Error while reading a file: '
    locale.str.file.writeErr = 'Error while writing a file: '

    locale.str.json.parseErr = 'Error while converting JSON to string: '

    locale.str.paramInvalid = 'Invalid parameter.'

    locale.str.peer.bad = 'Peer is bad-quality, try again.'

    locale.str.server.conErr = 'Error occured during connection: '
    locale.str.server.dataCorrupt = 'Data received is corrupted, maybe the connection was hijacked.'
    locale.str.server.noPub = 'Don\'t know target public key, can\'t communicate safely.'
    locale.str.server.strEmpty = 'Nothing to be sent.'
    locale.str.server.strTooLarge = 'Data received is too large.'
    locale.str.server.timeOut = 'Connection timed out.'
}