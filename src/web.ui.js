/*!
 * Web UI template
 */
const FileSystem = require('fs')

const Return = require('./fn.try.return')

const wDir =`./src/web/`

/**
 * Extract string to section
 * @param {string} str String to be extracted
 * @param {string[]} extractList List of keywords
 * @returns {string[]} Each empty sections are in order 1, 3, 5, 7, 9, ...
 */
const extract = (str, extractList) => {
    /** @type {string[]} */
    let section
    /** @type {string[]} */
    let complete = []
    
    for(let i = 0; i < extractList.length; i++){
        section = str.split(`{{${extractList[i]}}}`)
        complete.push(section[0])
        complete.push('')
        str = section[1]
    }

    complete.push(section[1])
    return complete
}

/** @type {string[]} Template of the body*/
const wBody = Return(() => {
    let body = extract(
        FileSystem.readFileSync(
            `${wDir}html/body.html`,
            {encoding: 'utf-8'}
        ),
        [
            `title`,
            `noti-number`,
            `noti-list`,
            'url-my-avatar',
            `body-left`,
            `body`,
            `body-right`,
            'script'
        ]
    )

    //body-left
    let accordion = extract(
        FileSystem.readFileSync(`${wDir}html/accordion.html`, {encoding: 'utf-8'}),
        [
            `content`
        ]
    )
    let aEl = extract(
        FileSystem.readFileSync(
            `${wDir}html/accordion-element-link.html`,
            {encoding: 'utf-8'}
        ),
        [
            `link`,
            `fa-class`,
            `title`
        ]
    )

    // -- Feed
    aEl[1] = '/'
    aEl[3] = 'fas fa-rss'
    aEl[5] = 'News Feed'
    accordion[1] += aEl.join('')

    // -- Hashtag
    aEl[1] = '/hashtag'
    aEl[3] = 'fas fa-hashtag'
    aEl[5] = 'Hashtags'
    accordion[1] += aEl.join('')

    // -- Following
    aEl[1] = '/following'
    aEl[3] = 'fas fa-user-friends'
    aEl[5] = 'Following accounts'
    accordion[1] += aEl.join('')

    // -- User
    aEl[1] = '/me'
    aEl[3] = 'fas fa-user'
    aEl[5] = 'Profile'
    accordion[1] += aEl.join('')

    body[9] = accordion.join('')

    return body
})

/** @type {string} */
const wPostSubmit = FileSystem.readFileSync(`${wDir}html/post-submit.html`, {encoding: 'utf-8'})

/** @type {string[]} */
const wScript = Return(() => extract(FileSystem.readFileSync(`${wDir}html/script-src.html`, {encoding: 'utf-8'}), [`url`]))

module.exports = {
    dir: wDir,
    accInfo: async () => {
        let accInfo = extract(
            await FileSystem.promises.readFile('./'),
            [
                'acc-pub',
                'acc-name',
                'acc-tag',
                'acc-public'
            ]
        )

        return accInfo
    },
    body: () => {
        for(let i=1; i<=7; i+=2){
            wBody[i] = '' 
        }

        wBody[11] = wPostSubmit
        wBody[13] = ''
        return wBody
    },
    extract: extract,
    login: `<h2 class="w3-center"> Please choose your account, or create a new one </h2>`,
    scrpit: url => {
        wScript[1] = url
        return wScript[1]
    }
}