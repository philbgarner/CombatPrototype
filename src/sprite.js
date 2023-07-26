import { BuildSprite } from './buildsprite.js'

class Sprite {
    constructor(texturePath, position) {
        BuildSprite(texturePath, position).then((sprite) => {
            this.sprite = sprite
        })
    }

    Sprite() {
        return this.sprite
    }

    
}

export default Sprite