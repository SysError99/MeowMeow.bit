const allowFileTypes = ['png', 'jpg', 'gif', 'tiff']
let croppie
/** @type {HTMLInputElement} */
let fileAvatar = document.getElementById('file-avatar')
/** @type {HTMLInputElement} */
let fileCover = document.getElementById('file-cover')
/** @type {HTMLImageElement} */
let previewCover = document.getElementById('preview-cover')
let previewCoverOrig = previewCover.src
/**
 * @param {Event} event 
 * @param {string} target
 */
let fileEvent = (event, target) => {
    /** @type {File} */
    let fileLocation = event.target.files[0]
    let reader = new FileReader()

    if(allowFileTypes.indexOf(fileLocation.name.split('.')[1].toLowerCase()) < 0)
        return alert('This file type is not supported')

    let croppieSize = 300

    reader.onloadend = () => {
        var img = new Image()
        img.crossOrigin = 'Anonymous'
        img.addEventListener('load', () => {
            let canvas = document.createElement('canvas')
            let req = new XMLHttpRequest()
            let drawHeight = img.height

            //covnert to base64
            if(target === 'cover'){
                canvas.width = 512
                canvas.height = 512
                drawHeight = img.height * 512 / img.width
            }
            else{
                canvas.width = img.width
                canvas.height = img.height
            }

            let ctx = canvas.getContext('2d')

            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                0,
                0,
                canvas.width,
                drawHeight
            )

            let dataURL = canvas.toDataURL()

            if(target === 'cover'){
                previewCover.src = dataURL
                previewCover.style.display = 'block'
            }
            else {
                //upload to temp storage
                req.open('POST', `/account-temp-avatar`)
                req.onreadystatechange = () => {
                    if(req.readyState === 4 && req.status === 200) {
                        if(typeof croppie !== 'undefined'){
                            croppie.destroy()
                            croppie = undefined
                        }

                        croppie = new Croppie(
                            document.getElementById(`croppie-avatar`),
                            {
                                viewport: {
                                    width: 256,
                                    height: 256,
                                    type: 'circle'
                                },
                                boundary: { width: croppieSize, height: croppieSize },
                                showZoomer: true
                            }
                        )
                        croppie.bind({
                            url: `/data/png/temp.avatar?cache=${Math.floor(Math.random() * 1048576)}`
                        })
                    }
                }
                req.send(dataURL)
            }
        })
        img.src = reader.result
    }
    reader.readAsDataURL(fileLocation)
}

fileAvatar.onchange = event => fileEvent(event, 'avatar')
fileCover.onchange = event => fileEvent(event, 'cover')

const accountSubmit = async () => {
    let accName = document.getElementById('account-name').innerHTML
    let accDescription = document.getElementById('account-description').innerHTML
    let accTag = document.getElementById('account-tag').innerHTML

    /** @type {string} */
    let accAvatar = typeof croppie !== 'undefined' ? await croppie.result({type: 'base64'}) : ''

    let req = new XMLHttpRequest()
    req.open('POST', `/account-update`)
    req.onreadystatechange = () => {
        if(req.readyState === 4 ){
            if(req.status === 200){
                alert('Account updated!')
                window.location = '/account-list'
            }else
                alert('Account update failed: ' + req.status)
        }
    }
    req.send(JSON.stringify(
        {
            name: accName,
            description: accDescription,
            tag: accTag,
            avatar: accAvatar,
            cover: previewCover.src === previewCoverOrig ? '' : previewCover.src
        }
    ))
}