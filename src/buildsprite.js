import * as THREE from 'three'

/**
 * Loads a texture, creates a material, returns the sprite.
 * @param {string} texturePath 
 * @param {THREE.Vector3} position 
 */
function BuildSprite(texturePath, position) {
    return new Promise(resolve => {
        new THREE.TextureLoader().load(texturePath, (tex) => {
            position = position ? position : new THREE.Vector3(0, 0, 0)
            tex.magFilter = THREE.NearestFilter
            let mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
            let sprite = new THREE.Sprite(mat)
            if (sprite) {
                sprite.position.set(position.x, position.y, position.x)
            }
            resolve(sprite)
        })
    })
}

/**
 * Loads a texture, creates a material, returns the sprite.
 * @param {string} texturePath 
 * @param {THREE.Vector3} position 
 */
function BuildShaderSprite(texturePath, position) {
    return new Promise(resolve => {
        new THREE.TextureLoader().load(texturePath, (tex) => {
            position = position ? position : new THREE.Vector3(0, 0, 0)
            tex.magFilter = THREE.NearestFilter
            //let mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
            let mat = new THREE.ShaderMaterial( {
                uniforms: {
                    time: { value: 1.0 },
                    resolution: { value: new THREE.Vector2() }
                },
                vertexShader: ``,
                fragmentShader: ``
            } )
            let sprite = new THREE.Sprite(mat)
            if (sprite) {
                sprite.position.set(position.x, position.y, position.x)
            }
            resolve(sprite)
        })
    })
}

// Possibly use this in new build function instead of sprite material.
// https://threejs.org/docs/#api/en/materials/ShaderMaterial

export { BuildSprite }