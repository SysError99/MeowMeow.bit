/*!
 * Web UI template
 */
const FileSystem = require('fs')

const Return = require('./fn.try.return')

const enc = {encoding: 'utf-8'}
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
    
    for (let extract of extractList) {
        section = str.split(`{{${extract}}}`)
        complete.push(section[0])
        complete.push('')
        str = section[1]
    }

    complete.push(section[1])
    return complete
}

/** @type {string[]} Template of the avatar icon*/
const wAvatar = Return(() => extract(FileSystem.readFileSync(`${wDir}html/avatar.html`, enc), ['link', 'right', 'url', 'text']))

/** @type {string[]} Template of the body*/
const wBody = Return(() => {
    let body = extract(
        FileSystem.readFileSync(
            `${wDir}html/body.html`,
            enc
        ),
        [
            `title`,
            'head',
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

/** @type {string[]} Empty box template */
const wBox = Return(() => 
    extract(
        FileSystem.readFileSync(
            `${wDir}html/box.html`,
            enc
        ),
        [
            'title',
            'content',
            'button'
        ]
    )
)

/** @type {string} Left body of this page */
const wBodyLeft = Return(() => {
    let accordion = extract(
        FileSystem.readFileSync(`${wDir}html/accordion.html`, enc),
        [
            `content`
        ]
    )
    let aEl = extract(
        FileSystem.readFileSync(
            `${wDir}html/accordion-element-link.html`,
            enc
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

/** @type {string[]} */
const wScript = Return(() => extract(FileSystem.readFileSync(`${wDir}html/script-src.html`, enc), [`url`]))

module.exports = {
    dir: () => wDir,

    avatar: ({
        link,
        right,
        url,
        text
    }) => {
        wAvatar[1] = typeof link === 'string' ? link : '/me'
        wAvatar[3] = right ? 'w3-right' : ''
        wAvatar[5] = typeof url === 'string' ? url : '/web/img/avatar2.png'
        wAvatar[7] = typeof text === 'string' ? text : ''

        return wAvatar.join('')
    },

    body: ({
        title,
        head,
        notiNumber,
        notiList,
        avatar,
        bodyLeft,
        body,
        bodyRight,
        script
    }) => {
        wBody[1] = typeof title === 'string' ? title : ''
        wBody[3] = typeof head === 'string' ? head : ''
        wBody[5] = typeof notiNumber === 'string' ? notiNumber : ''
        wBody[7] = typeof notiList === 'string' ? notiList : ''
        wBody[9] = typeof avatar === 'string' ? avatar : ''
        wBody[11] = typeof bodyLeft === 'string' ? bodyLeft + wBodyLeft : wBodyLeft
        wBody[13] = typeof body === 'string' ? body : ''
        wBody[15] = typeof bodyRight === 'string' ? bodyRight : ''
        wBody[17] = typeof script === 'string' ? script : ''
        return wBody.join('')
    },

    box: ({
        title,
        content,
        button
    }) => {
        wBox[1] = typeof title === 'string' ? title : ''
        wBox[3] = typeof content === 'string' ? content : ''
        wBox[5] = typeof button === 'string' ? button : ''
        return wBox.join('')
    },

    css: location => `<link rel="stylesheet" href="${location}">`,

    extract: extract,

    /** 
     * @param {string} text 
     * @param {number} size 
     */
    header: (text, size) => {
        if (typeof size === 'undefined')
            size = 1

        if (size > 6)
            size = 6
        else if (size < 1)
            size = 1

        size = 7 - size
        return `<h${size} class="w3-center w3-opacity">${text}</h${size}>`
    },

    image: ({location}) => `<img src="${location}" class="" style="height:100%;width:100%;" alt="Image">`,

    login: () => `<h2 class="w3-center w3-opacity"> Please choose your account, or create a new one </h2>`,

    nativeAlert: (text, redirect) => `<script>alert('${
        typeof text === 'string' ? text : 'WebUI.nativeAlert() received invalid data type.'
    }');${
        typeof redirect === 'string' ? `window.location = ${redirect};` : `window.history.go(-1);`
    }</script>`,

    profile: async ({
        urlImgCover,
        urlImgAvatar,
        name,
        description,
        pub,
        dateJoin,
        followers
    }) => {
        let profile = extract(
            await FileSystem.promises.readFile(`${wDir}html/profile.html`, enc),
            [
                'url-img-cover',
                'url-img-avatar',
                'name',
                'description',
                'pub',
                'date-join',
                'followers'
            ]
        )

        profile[1] = typeof urlImgCover === 'string' ? urlImgCover : '/web/img/snow.jpg'
        profile[3] = typeof urlImgAvatar === 'string' ? urlImgAvatar : ''
        profile[5] = typeof name === 'string' ? name : ''
        profile[7] = typeof description === 'string' ? description : ''
        profile[9] = typeof pub === 'string' ?
            (pub.length > 26 ?
                pub.slice(0, 26) + '\n' + pub.slice(27, pub.length)
                : pub)
            : ''
        profile[11] = typeof dateJoin === 'string' ? dateJoin : ''
        profile[13] = typeof followers === 'string' ? followers : ''

        return profile.join('')
    },

    script: url => {
        wScript[1] = url
        return wScript.join('')
    },

    wDir: wDir
}