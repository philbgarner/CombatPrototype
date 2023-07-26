import * as THREE from 'three'
import * as GRAMMAR from './grammar.js'
import TWEEN, { Tween } from '@tweenjs/tween.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import Actor from './actor.js'
import Enemy from './enemy.js'
import { loadAllImages, getImage } from './images.js'

import levels from './levels.json'
import scenes from './scenes.json'

// Use this example for particle system:
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_custom_attributes_particles.html

var imu = null
var uicanvas = null
var ctx = null
var actor = null
var enemies = []
var enemiesHaveSpawned = false
var sceneObject = null
var level = null
var spawn = []
var levelCount = 0
var levelCleared = false
var levelClearedCameraReset = false
var levelXStart = 0
var levelXActorStart = 0
var levelXCameraStart = 0
var cameraInitialized = false
var levelPosition = new THREE.Vector3(0, 0, 0)

const sectionOffset = 6

var clock = new THREE.Clock()

const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader();

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 100 )

const renderer = new THREE.WebGLRenderer()
renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild( renderer.domElement )

const composer = new EffectComposer( renderer )

const renderPass = new RenderPass( scene, camera )
composer.addPass( renderPass )

const afterimagePass = new AfterimagePass()
afterimagePass.uniforms['damp'].value = 0.05
composer.addPass( afterimagePass )

const bloomPass = new UnrealBloomPass()
bloomPass.threshold = 0.05
bloomPass.strength = 0.15
bloomPass.radius = 1
composer.addPass( bloomPass )

// Noise grain strength, scanlines strength, # scanlines, % grayscale.
const filmPass = new FilmPass(0.6, 0.5, 4096, 0.15)
composer.addPass( filmPass )

const outputPass = new OutputPass( THREE.ReinhardToneMapping )
outputPass.toneMappingExposure = 1
composer.addPass( outputPass )

GRAMMAR.setDictionary(scenes)

function spawnEnemy(x, y) {
    let enemy = new Enemy({ name: 'enemy', location: { x: levelPosition.x + x, y: y }, player: actor }, scene)
    if (!enemiesHaveSpawned && !levelCleared) {
        enemiesHaveSpawned = true
        // Purge old corpses so we don't render them anymore.
        enemies.forEach(enemy => {
            scene.remove(enemy.sprite)
        })
        enemies = []
    }
    enemies.push(enemy)
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function loadSection(name, offset) {
    return new Promise(resolve => {
        enemiesHaveSpawned = false
        level = JSON.parse(JSON.stringify(levels.filter(l => l.name === name)[0]))
        spawn = GRAMMAR.text(level.spawnAfter)
        console.log(level.name, level.spawnAfter, 'spawn', spawn)
        let filename = level.filename
        loader.load(`./assets/${filename}`, (gltf) => {
            // gltf.scene.traverse(obj => {
            //     if (obj.position && offset) {
            //         obj.position.x += offset.x
            //         obj.position.y += offset.y
            //         obj.position.z += offset.z
            //     }
            // })
            gltf.scene.position.add(new THREE.Vector3(offset.x, offset.y, offset.z))

            resolve(gltf)
        }, (xhr) => console.log(xhr.loaded + ' loaded'), (err) => { console.error('Error loading scene.', err); resolve() })
    })
}

function handleSectionLoad(gltf) {
    sceneObject = gltf.scene
    console.log('gltf', gltf)
    let camObj = sceneObject.children.filter(f => f.name === 'Camera')
    if (camObj.length > 0 && !cameraInitialized) {
        camera.position.set(camObj[0].position.x, camObj[0].position.y, camObj[0].position.z)
        camera.rotation.set(camObj[0].rotation.x, camObj[0].rotation.y, camObj[0].rotation.z)
        camera.quaternion.set(camObj[0].quaternion.x, camObj[0].quaternion.y, camObj[0].quaternion.z, camObj[0].quaternion.w)
        cameraInitialized = true
    }
    console.log('sceneObject', sceneObject, 'camera', camera.position, 'scene', scene)
    
    let group = new THREE.Group()
    try {
        sceneObject.traverse(obj => {
            console.log(obj.type, obj.name, obj.position, obj)
            if (obj.type === 'Mesh') {
                group.add(obj)
            } else if (obj.type === 'Group') {
                obj.traverse(grp => group.add(grp))
            }
        })
    } catch {}
    scene.add(group)
    sceneObject = group
}

function loadScene() {
    return new Promise((resolve) => {        
        dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' )
        loader.setDRACOLoader( dracoLoader )
        actor = new Actor({ name: 'Test' }, scene)
        scene.fog = new THREE.Fog( 0x000001, 0, 35 )
        const light = new THREE.AmbientLight( 0xa9a9b9 ) // bluish grey light
        light.intensity = 0.6
        scene.add(light)
        
        loadSection('Scene2', { x: 0, y: 0, z: 0 })
        .then((gltf => {
            handleSectionLoad(gltf)
            camera.lookAt(new THREE.Vector3(0, 0, 0)) 
            clock.start()
            resolve()
        }))    
    })
}

function moveCamera(x, y, z, delay) {
    return new Promise((resolve) => {
        let position = new THREE.Vector3().copy(camera.position)
        let targetPosition = new THREE.Vector3(x, y, z)
        new Tween(position)
            .to(targetPosition, delay)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate((v, t) => {
                camera.position.set(v.x, v.y, v.z)
                camera.lookAt(v.x, TWEEN.Interpolation.Bezier([position.y - 5, targetPosition.y - 5], t), v.z - 11)
                //camera.lookAt(sceneObject)
            })
            .onComplete((v) => {
                camera.position.set(v.x, v.y, v.z)
                camera.lookAt(v.x, v.y - 5, v.z - 11)
                //camera.lookAt(sceneObject)
                resolve()
            })
            .start()
    })
}

function animate() {
    requestAnimationFrame(animate)

    let delta = clock.getDelta()

    TWEEN.update()

    composer.render()

    if (!imu) {
        if (!uicanvas) {
            uicanvas = document.createElement('canvas')
            uicanvas.id = 'uicanvas'
            document.body.prepend(uicanvas)
            ctx = uicanvas.getContext('2d')
            uicanvas.width = 320
            uicanvas.height = 200
            ctx.clearRect(0, 0, uicanvas.width, uicanvas.height)
            uicanvas.style.display = 'block'
            uicanvas.style.position = 'absolute'
            uicanvas.style.top = '0px'
            uicanvas.style.left = '0px'
            uicanvas.style.width = window.innerWidth + 'px'
            uicanvas.style.height = window.innerHeight + 'px'
            uicanvas.style.background = 'transparent'
        }
        imu = new imui.ImUI(uicanvas)
    } else {
        imu.onUpdate = async (ui) => {
            if (actorState()) {
                //ui.Element({ id: 'test', text: `Camera: ${camera.position.x}, ${camera.position.y}, ${camera.position.z}`, x: 5, y: 5, color: '#f1f1f1ff', bgcolor: '#0000f1ee' })
                //ui.Element({ id: 'test', text: `e: ${clock.elapsedTime.toFixed(2)}`, x: 200, y: 5, color: '#f1f1f1ff', bgcolor: '#0000f1ee' })
                for (let i = 0; i < actor.maxhp; i++) {
                    let image = i === parseInt(actor.hp) && actor.hp - parseInt(actor.hp) > 0 ? 'half-heart' : 'full-heart'
                    if (i >= actor.hp) {
                        image = 'empty-heart'
                    }
                    ui.Element({ id: 'heart' + i, type: 'image', x: 16 + (i * 17) + 2 * i, y: 8, image: getImage(image)})
                }
            }

            if (levelCleared) {
                ui.Element({ id: 'advance', text: clock.elapsedTime % 1 >= 0.5 ? `Advance >` : 'Advance', x: 120, y: 130, color: '#f1f1f1ff', bgcolor: '#0000f1ee' })
            }
        }

        ctx.clearRect(0, 0, uicanvas.width, uicanvas.height)
        imu.Draw()
    }
    
    if (actor) {
        actor.Update(delta)
    }
    enemies.forEach(e => {
        e.Update(delta)
    })

    // Handle camera movements and new section positioning on x axis if all the enemies have been killed.
    if (levelCleared) {
        let easingLocation = TWEEN.Interpolation.Bezier([0, 10], (actor.sprite.position.x - levelXStart) / (levelXStart - levelXActorStart))
        if (easingLocation >= 0) {
            easingLocation = 0
            levelCleared = false
            levelClearedCameraReset = false
            actor.inputEnabled = true
            clock.start()
            moveCamera(levelPosition.x, camera.position.y, camera.position.z, 900)
        }
        else {
            if (!levelClearedCameraReset) {
                actor.inputEnabled = true
                moveCamera(actor.sprite.position.x, camera.position.y, camera.position.z, 600).then(() => {
                    levelClearedCameraReset = true
                    actor.inputEnabled = true
                })
            } else {
                camera.position.set(actor.sprite.position.x, camera.position.y, camera.position.z)
            }
                
        }
        let newLocation = new THREE.Vector3(0, easingLocation, 0)
        sceneObject.position.set(newLocation.x, newLocation.y, newLocation.z)
    } else {
        let afterSpawn = spawn.filter(f => clock.elapsedTime >= f.elapsedTime && !f.spawned)
        if (afterSpawn.length > 0) {
            afterSpawn.forEach((spawn) => {
                spawnEnemy(spawn.location.x, spawn.location.y)
                spawn.spawned = true
            })
        }    
    }

    // Check to see if all enemies that will spawn have done so and are dead.  If so, move on to next section.
    if (spawn.filter(f => !f.spawned).length === 0 && enemies.filter(f => !f.IsDead()).length === 0 && enemiesHaveSpawned && !levelCleared) {
        levelPosition.add(new THREE.Vector3(sectionOffset, 0, 0))
        levelCount++
        let nextScene = GRAMMAR.text('[*non-starting-scenes]')
        loadSection(nextScene, { x: levelPosition.x, y: levelPosition.y, z: levelPosition.z }).then((gltf) => {
            handleSectionLoad(gltf)

            sceneObject.position.set(levelPosition.x, levelPosition.y - 2.5, levelPosition.z)

            levelCleared = true
            if (actor.sprite.position.x >= levelPosition.x - parseInt(sectionOffset / 2)) {
                moveCamera(actor.sprite.position.x, camera.position.y, camera.position.z, 300).then(() => {
                    levelXStart = levelPosition.x - parseInt(sectionOffset / 2)
                    levelXActorStart = actor.sprite.position.x
                    levelXCameraStart = camera.position.x
                })
            } else {
                levelCleared = true
                levelXStart = levelPosition.x - parseInt(sectionOffset / 2)
                levelXActorStart = actor.sprite.position.x
                levelXCameraStart = camera.position.x
            }
        })
    }
}

function actorState() {
    return actor ? actor.stateMachine : null
}

function getEnemies() {
    return enemies ? enemies : []
}

export { animate, loadScene, actor, actorState, spawnEnemy, getEnemies, moveCamera, loadAllImages }