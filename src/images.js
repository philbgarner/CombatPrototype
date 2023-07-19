import images from './images.json'

var ctx = null

function setContext(context) {
    ctx = context
}

function getContext() {
    return ctx
}

function getImage(name) {
    let img = images.filter(f => f.name === name)
    return img.length > 0 ? img[0].image : null
}

function getImages() {
    return images
}

function drawImage(name, x, y, srcRect, flipped) {
    drawImageCtx(getContext(), name, x, y, srcRect, flipped)
}

function drawImageCtx(context, name, x, y, srcRect, flipped) {
    let img = images.filter(f => f.name === name)
    if (img.length > 0) {
        if (srcRect) {
            if (flipped) {
                context.save()
                context.scale(-1, 1)
                context.drawImage(img[0].image, srcRect.x, srcRect.y, srcRect.w, srcRect.h, -x - srcRect.w, y, srcRect.w, srcRect.h)    
                context.restore()
            } else {
                context.drawImage(img[0].image, srcRect.x, srcRect.y, srcRect.w, srcRect.h, x, y, srcRect.w, srcRect.h)    
            }
        } else {
            if (flipped) {
                context.save()
                context.scale(-1, 1)
                context.drawImage(img[0].image, x - srcRect.w, y, srcRect.w, srcRect.h)    
                context.restore()
            } else {
                context.drawImage(img[0].image, x, y)
            }
        }
    }
}

function loadImage(filename) {
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = (e) => {
            resolve(img)
        }
        img.onerror = (e) => {
            console.error(`Failed to load file ${filename}:`, e)
            reject(null)
        }
        let image = images.filter(f => f.filename === filename)
        if (image.length > 0) {
            img.src = filename
        } else {
            console.error(`Image definition matching filename ${filename} not found.`)
            reject(null)
        }
    })
}

function loadAllImages() {
    let promises = []
    for (let i in images) {
        let image = images[i]
        promises.push(new Promise((resolve, reject) => loadImage(image.filename).then(r => {
            image.image = r
            resolve(r)
        }).catch(e => console.error('Failed to load', image.filename, e))))
    }
    return Promise.allSettled(promises)
}

export { loadAllImages, loadImage, drawImage, getImage, getImages, setContext, drawImageCtx, getContext }
