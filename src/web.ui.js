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

/** @type {string[]} Template of the avatar icon*/
const wAvatar = Return(() => extract(FileSystem.readFileSync(`${wDir}html/avatar.html`, {encoding: 'utf-8'}), ['link', 'right', 'url', 'text']))
const wAvatar2Default = wAvatar[2]

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
            'avatar',
            `body-left`,
            `body`,
            `body-right`,
            'script'
        ]
    )

    return body
})

/** @type {string} Left body of this page */
const wBodyLeft = Return(() => {
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

    return accordion.join('')
})

/** @type {string} */
const wPostSubmit = FileSystem.readFileSync(`${wDir}html/post-submit.html`, {encoding: 'utf-8'})

/** @type {string[]} */
const wScript = Return(() => extract(FileSystem.readFileSync(`${wDir}html/script-src.html`, {encoding: 'utf-8'}), [`url`]))

module.exports = {
    dir: () => wDir,

    accInfo: async ({
        pub,
        name,
        tag,
        avatar,
        public
    }) => {
        let accInfo = extract(
            await FileSystem.promises.readFile(`${wDir}html/account-info.html`, {encoding: 'utf-8'}),
            [
                'acc-pub',
                'acc-name',
                'acc-tag',
                'acc-avatar',
                'acc-public'
            ]
        )

        accInfo[1] = typeof pub === 'string' ? pub : ''
        accInfo[3] = typeof name === 'string' ? name : ''
        accInfo[5] = typeof tag === 'string' ? tag : ''
        accInfo[7] = typeof avatar === 'string' ? avatar : ''
        accInfo[9] = typeof public === 'string' ? public : ''

        return accInfo.join('')
    },

    avatar: ({
        link,
        right,
        url,
        text
    }) => {
        wAvatar[1] = typeof link === 'string' ? link : '#'
        wAvatar[3] = right ? 'w3-right' : ''
        wAvatar[5] = typeof url === 'string' ? url : '/web/img/avatar2.png'
        wAvatar[7] = typeof text === 'string' ? text : ''

        return wAvatar.join('')
    },

    body: ({
        title,
        notiNumber,
        notiList,
        avatar,
        bodyLeft,
        body,
        bodyRight,
        script
    }) => {
        wBody[1] = typeof title === 'string' ? title : ''
        wBody[3] = typeof notiNumber === 'string' ? notiNumber : ''
        wBody[5] = typeof notiList === 'string' ? notiList : ''
        wBody[7] = typeof avatar === 'string' ? avatar : ''
        wBody[9] = typeof bodyLeft === 'string' ? wBodyLeft + bodyLeft : wBodyLeft
        wBody[11] = typeof body === 'string' ? body : ''
        wBody[13] = typeof bodyRight === 'string' ? bodyRight : ''
        wBody[15] = typeof script === 'string' ? script : ''
        return wBody.join('')
    },

    extract: extract,

    login: () => `<h2 class="w3-center"> Please choose your account, or create a new one </h2>`,

    postSubmit: () => wPostSubmit,

    script: ({url}) => {
        wScript[1] = url
        return wScript.join('')
    }
}