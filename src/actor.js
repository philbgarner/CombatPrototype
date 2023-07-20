import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'
import actorMachine from './actorMachine.js'
import { OBB } from 'three/addons/math/OBB.js'
import { interpret } from 'xstate'
import { getEnemies } from './main.js'

class Actor {
    constructor(params, scene) {
        this.scene = scene
        
        this.frames = {
            run: [
                './assets/run/swordRun1.png',
                './assets/run/swordRun2.png',
                './assets/run/swordRun3.png',
                './assets/run/swordRun4.png',
                './assets/run/swordRun5.png',
                './assets/run/swordRun6.png',
                './assets/run/swordRun7.png',
                './assets/run/swordRun8.png'
            ],
            idle: [
                './assets/idle/swordIdle1.png',
                './assets/idle/swordIdle2.png',
                './assets/idle/swordIdle3.png',
                './assets/idle/swordIdle4.png',
                './assets/idle/swordIdle5.png',
                './assets/idle/swordIdle6.png',
                './assets/idle/swordIdle7.png',
                './assets/idle/swordIdle8.png',
                './assets/idle/swordIdle9.png',
                './assets/idle/swordIdle10.png'
            ],
            attack1: [
                './assets/attack/swordAttack1.png',
                './assets/attack/swordAttack2.png',
                './assets/attack/swordAttack3.png',
                './assets/attack/swordAttack4.png',
                './assets/attack/swordAttack5.png',
                './assets/attack/swordAttack6.png'
            ],
            attack2: [
                './assets/stab/swordStabAttack1.png',
                './assets/stab/swordStabAttack2.png',
                './assets/stab/swordStabAttack3.png',
                './assets/stab/swordStabAttack4.png',
                './assets/stab/swordStabAttack5.png',
                './assets/stab/swordStabAttack6.png'
            ],
            hurt: [
                './assets/hurt/hurt1.png',
                './assets/hurt/hurt2.png',
                './assets/hurt/hurt3.png',
                './assets/hurt/hurt4.png'
            ],
            death: [
                './assets/death/death1.png',
                './assets/death/death2.png',
                './assets/death/death3.png',
                './assets/death/death4.png',
                './assets/death/death5.png',
                './assets/death/death6.png',
                './assets/death/death7.png',
                './assets/death/death8.png',
                './assets/death/death9.png',
                './assets/death/death10.png'
            ]
        }
        
        this.hp = params.hp === undefined ? 3 : params.hp
        this.maxhp = this.hp

        this.hurting = 0

        this.input = {}
        this.inputEnabled = true
        this.animationId = 'idle'
        this.textures = {}
        this.materials = {}
        this.movement = new THREE.Vector2(0, 0)
        this.force = new THREE.Vector2(0, 0)
        this.onComplete = () => {}
        
        // Iterate the animations in the list, load the textures
        // and create the materials.
        Object.keys(this.frames).forEach(k => {
            this.textures[k] = []
            this.materials[k] = []
            this.frames[k].forEach(f => {
                let tex = new THREE.TextureLoader().load(f)
                tex.magFilter = THREE.NearestFilter
                this.textures[k].push(tex)
                this.materials[k].push(new THREE.SpriteMaterial({ map: tex }))
            })
        })
        
        this.flipped = true
        this.attackRange = 0.5
        
        this.UpdateFlipTex(this.textures[this.animationId][0])
        
        this.currentDisplayTime = 0
        this.tileDisplayDuration = params.tileDisplayDuration ? params.tileDisplayDuration : 66
        this.name = params.name
        this.currentSprite = 0
        
        let sprite = new THREE.Sprite(this.materials[this.animationId][this.currentSprite])
        if (sprite) {
            sprite.center = new THREE.Vector2(0.5, 0)
            if (params.location) {
                sprite.position.set(params.location.x, 0, params.location.y)
            }
            scene.add(sprite)
            this.sprite = sprite
        }
        
        this.weaponHitBoxes = {
            attack1: {
                4: this.BuildAttackBoundingBox(0.45, -0.3, 0.5, 0.25, 0.14, 0.5),
                5: this.BuildAttackBoundingBox(0.45, -0.3, 0.5, 0.25, 0.14, 0.5)
            },
            attack2: {
                5: this.BuildAttackBoundingBox(0.75, -0.3, 0.5, 0.25, 0.14, 0.5),
                6: this.BuildAttackBoundingBox(0.75, -0.3, 0.5, 0.25, 0.14, 0.5)
            }
        }

        this.SetBoundingBox(0, 0, 0.25, 0.25)
        
        let atkMoveForce = 0.02
        if (params.stateMachine && !params.skipStateMachine) {
            this.stateMachine = interpret(params.stateMachine.withContext({ actor: this }))
                .onTransition((state) => {
                    //console.log('transition happened', state.context, state.value)
                    if (state.context.actor.animationId !== state.value) {
                        state.context.actor.SetAnimation(state.value)
                        if (state.context.actor.animationId.includes('attack')) {
                            this.ApplyForce(new THREE.Vector3(this.flipped ? -atkMoveForce : atkMoveForce, 0, 0))
                        }
                    }
                })
            this.stateMachine.start()
        } else if (!params.skipStateMachine) {
            this.stateMachine = interpret(actorMachine.withContext({ actor: this }))
                .onTransition((state) => {
                    if (state.context.actor.animationId !== state.value) {
                        state.context.actor.SetAnimation(state.value)
                        if (state.context.actor.animationId.includes('attack')) {
                            this.ApplyForce(new THREE.Vector3(this.flipped ? -atkMoveForce : atkMoveForce, 0, 0))
                        }
                    }
                })
            this.stateMachine.start()
        }
    }

    MoveTo(x, y, z, delay) {
        return new Promise((resolve) => {
            let position = new THREE.Vector3().copy(this.sprite.position)
            let targetPosition = new THREE.Vector3(x, y, z)
            new TWEEN.Tween(position)
                .to(targetPosition, delay)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate((v, t) => {
                    this.sprite.position.set(v.x, v.y, v.z)
                })
                .onComplete((v) => {
                    this.sprite.position.set(v.x, v.y, v.z)
                    resolve()
                })
                .start()
        })
    }

    ApplyForce(vector) {
        this.force.set(vector.x, vector.y)
    }

    CheckAttackBoundingBox(enemies, showBox) {
        enemies = enemies === undefined ? [] : enemies
        showBox = showBox === undefined ? false : showBox

        if (!this.weaponHitBoxes[this.animationId] || !this.weaponHitBoxes[this.animationId][this.currentSprite] || !this.sprite) {
            if (this.attackOBBMesh) {
                this.scene.remove(this.attackOBBMesh)
                this.attackOBBMesh = null
            }
            return []
        }

        let hitBox = this.weaponHitBoxes[this.animationId][this.currentSprite]
        if (hitBox) {
            let obb = hitBox.clone()
            obb.set(new THREE.Vector3(!this.flipped ? -obb.center.x : obb.center.x, obb.center.y, obb.center.z).add(this.sprite.position), obb.halfSize, obb.rotation)
            let gH = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(1, 1, 1),
              new THREE.Vector3(1, 1, -1),
              new THREE.Vector3(1, -1, -1),
              new THREE.Vector3(1, -1, 1),
              new THREE.Vector3(-1, 1, 1),
              new THREE.Vector3(-1, 1, -1),
              new THREE.Vector3(-1, -1, -1),
              new THREE.Vector3(-1, -1, 1)
            ]);
            gH.setIndex([
              0, 1, 1, 2, 2, 3, 3, 0,
              4, 5, 5, 6, 6, 7, 7, 4,
              0, 4, 1, 5, 2, 6, 3, 7
            ])
            let collidingEnemies = enemies.filter(enemy => {
                let enemyObb = enemy.obb.clone()
                return !enemy.IsDead() && enemyObb.intersectsOBB(obb)
            })

            if (showBox) {
                let mH = new THREE.LineBasicMaterial({color: collidingEnemies.length > 0 ? "red" : "yellow"});
                let oH = new THREE.LineSegments(gH, mH);
                oH.scale.copy(obb.halfSize)
                oH.position.copy(obb.center)
                if (this.attackOBBMesh) {            
                    this.scene.remove(this.attackOBBMesh)  
                    this.attackOBBMesh = null
                }
                this.scene.add(oH);
                this.attackOBBMesh = oH
            } else if (this.attackOBBMesh) {
                this.scene.remove(this.attackOBBMesh)  
                this.attackOBBMesh = null
            }

            return collidingEnemies
        } else if (this.attackOBBMesh) {            
            this.scene.remove(this.attackOBBMesh)  
            this.attackOBBMesh = null
        }
        return []
    }

    SetBoundingBox(offsetX, offsetY, sizeX, sizeY) {
        offsetX = offsetX === undefined ? 0 : offsetX
        offsetY = offsetY === undefined ? 0 : offsetY

        sizeX = sizeX === undefined ? this.attackRange : sizeX
        sizeY = sizeY === undefined ? this.attackRange : sizeY

        this.obb = new OBB(new THREE.Vector3(this.sprite.position.x, this.sprite.position.y, this.sprite.position.z).add(new THREE.Vector3(this.flipped ? -offsetX : offsetX, 0, offsetY)), new THREE.Vector3(sizeX, 1, sizeY))
    }

    BuildAttackBoundingBox(offsetX, offsetY, offsetZ, sizeX, sizeY, sizeZ) {
        offsetX = offsetX === undefined ? this.attackRange / 2 : offsetX
        offsetY = offsetY === undefined ? this.attackRange / 4 : offsetY
        offsetZ = offsetZ === undefined ? 0 : offsetZ

        sizeX = sizeX === undefined ? this.attackRange : sizeX
        sizeY = sizeY === undefined ? this.attackRange / 2 : sizeY
        sizeZ = sizeZ === undefined ? this.attackRange : sizeZ
        return new OBB(new THREE.Vector3(this.flipped ? -offsetX : offsetX, offsetZ, offsetY), new THREE.Vector3(sizeX, sizeZ, sizeY))
    }

    CollidingWith(enemies) {
        if (!this.obb) {
            return []
        }
        let colliding = []
        enemies.forEach(enemy => {
            if (enemy.obb && enemy.obb.intersectsOBB(this.obb)) {
                colliding.push(enemy)
            }
        })
        return colliding
    }

    IsHurting() {
        return this.hurting > 0 ? true : false
    }

    IsDead() {
        return this.hp === 0 ? true : false
    }

    InRangeOf(actors, range) {
        return actors.filter(a => a.sprite.position.distanceTo(new THREE.Vector3(this.sprite.position.x, 0, this.sprite.position.z)) <= range)
    }

    AttackHit(actors) {
        let inRange = this.InRangeOf(actors, this.attackRange)
        return inRange.filter(f => (f.position.x >= this.position.x && !this.flipped) || (f.position.x <= this.position.x && this.flipped))
    }

    Sprite() {
        return this.sprite
    }

    SetAnimation(id, onComplete) {
        this.animationId = id
        this.currentSprite = 0
        this.onComplete = onComplete ? onComplete : () => {}
    }

    InputEnabled(value) {
        if (value === undefined) {
            this.inputEnabled = value
        }
        return this.inputEnabled
    }

    /**
     * Set the state for an input.
     * @param {string} key Input name.
     * @param {any} value Value to assign to input key.
     */
    SetInput(key, value) {
        this.input[key] = value
    }

    GetInput(key, defaultValue) {
        if (!this.inputEnabled) {
            return false
        }
        defaultValue = defaultValue === undefined ? 0 : defaultValue
        return this.input[key] ? this.input[key] : defaultValue
    }

    Flip() {
        this.flipped = !this.flipped
        let tex = this.textures[this.animationId][this.currentSprite]
        this.UpdateFlipTex(tex)
    }

    UpdateFlipTex(tex) {
        if (this.IsHurting()) {
            return
        }
        if (tex && this.flipped) {
            tex.center.set(0.5, 0.5)
            tex.repeat.set(-1, 1)
        } else if (tex && !this.flipped) {
            tex.center.set(0.5, 0.5)
            tex.repeat.set(1, 1)
        }
    }

    Update(delta) {
        try {
            this.currentDisplayTime += delta * 1000
            if (this.currentDisplayTime > this.tileDisplayDuration) {
                this.currentDisplayTime = 0
                this.currentSprite++
                if (this.currentSprite >= this.frames[this.animationId].length && !this.IsDead()) {
                    this.currentSprite = 0
                    if (this.onComplete) {
                        this.onComplete()
                        this.onComplete = () => {}
                    }    
                } else if (this.currentSprite >= this.frames[this.animationId].length && this.IsDead()) {
                    this.currentSprite = this.frames[this.animationId].length
                } else if (this.currentSprite <= this.frames[this.animationId].length - 1) {
                    let mat = this.materials[this.animationId][this.currentSprite]
                    if (mat) {
                        let tex = this.textures[this.animationId][this.currentSprite]
                        if (tex) {
                            this.UpdateFlipTex(tex)
                            this.sprite.material = this.materials[this.animationId][this.currentSprite]
                            if (tex.source && tex.source.data) {
                                let width = tex.source.data.width
                                let height = tex.source.data.height
                                this.sprite.scale.set(width / 48, height / 48)            
                            }
                        } else {
                            console.log('Error in Upate(): tex undefined.')
                        }
                    } else {
                        console.log('Missing material for ', this.animationId, this.currentSprite, this.materials)
                    }
                }
            }
            
            this.movement.set(this.GetInput('horizontal') * 1 / 24, this.GetInput('vertical') * 1 / 24)
            if (!this.animationId.includes('attack') && !this.animationId.includes('hurt') && !this.animationId.includes('death')) {
                this.sprite.position.add(new THREE.Vector3(this.movement.x, 0, this.movement.y))
            }

            // Apply friction to player.
            let friction = 0.9
            this.ApplyForce(new THREE.Vector2(this.force.x * friction, this.force.y * friction))


            // Apply force motion to sprite position.
            this.sprite.position.add(new THREE.Vector3(this.force.x, 0, this.force.y))

            this.SetBoundingBox(0, 0, 0.25, 0.25)

            if (this.hurting > 0) {
                this.hurting--
            }

            let hitForce = 0.033
            let hitEnemies = this.CheckAttackBoundingBox(getEnemies(), false).filter(f => !f.IsHurting())
            if (hitEnemies.length > 0) {
                // TODO: Apply force to enemy for knockback effect, change to hit state, apply damage.
                hitEnemies.forEach(enemy => {
                    enemy.hurting = 32
                    enemy.hp--
                    enemy.ApplyForce(new THREE.Vector3(this.flipped ? -hitForce : hitForce, 0, 0))
                })
            }
            if (this.stateMachine && this.inputEnabled) {
                this.stateMachine.send({ type: 'update' })
            }        
        } catch (err) { console.trace('Error in actor Update():', this.name, err) }
	}
}

export default Actor
