// let currentPostNumber = 0

window.onscroll = function(ev) {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
        timelineRetrieve()
    }
}

/**
 * Retrieve a post from timeline
 */
const timelineRetrieve = () => {
    let request = new XMLHttpRequest()

    request.onreadystatechange = e => {
        if (request.readyState === request.DONE && request.status === 200) {
            if (request.responseText.length > 0)
                document.getElementById('body').innerHTML += request.responseText
        }
    }

    request.open('GET', `/timeline`)
    request.send()
}

timelineRetrieve()