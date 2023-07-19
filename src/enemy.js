import enemyMachine from './enemyMachine.js'
import Actor from "./actor.js"
import * as THREE from 'three'
import { interpret } from 'xstate'
import { getEnemies } from './main.js'

class Enemy extends Actor {
    constructor(params, scene) {
        super({
            skipStateMachine: true,
            name: params.name,
            location: params.location,
            frames: {
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
        }, scene)

        this.stateMachine = interpret(enemyMachine.withContext({ actor: this }))
            .onTransition((state) => {
                //console.log('transition happened', state.context, state.value)
                if (state.context.actor.animationId !== state.value) {
                    state.context.actor.SetAnimation(state.value)
                }
            })
        this.stateMachine.start()

        this.attackRange = 0.5
        this.player = params.player

        
        this.weaponHitBoxes = {
            attack1: {
                4: this.BuildAttackBoundingBox(0.45, -0.3, 0.5, 0.25, 0.14, 0.5),
                5: this.BuildAttackBoundingBox(0.45, -0.3, 0.5, 0.25, 0.14, 0.5)
            },
            attack2: {
                5: this.BuildAttackBoundingBox(0.7, -0.3, 0.5, 0.25, 0.14, 0.5),
                6: this.BuildAttackBoundingBox(0.7, -0.3, 0.5, 0.25, 0.14, 0.5)
            }
        }
        
        this.weaponCooldown = 0

        this.SetBoundingBox(0, 0, 0.25, 0.25)
        
    }

    InRangeOfPlayer() {
        if (this.player && !this.player.IsDead()) {
            let dx = this.sprite.position.x - this.player.sprite.position.x
            let dy = this.sprite.position.z - this.player.sprite.position.z
            let inRangeX = this.movement.x !== 0 && Math.abs(dx) < this.attackRange / 2
            let inRangeY = this.movement.y !== 0 && Math.abs(dy) < this.attackRange / 4
            return inRangeX || inRangeY
        }
        return false
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
            
            this.SetBoundingBox(0, 0, 0.25, 0.25)

            if (this.player) {
                let mx = 1 / 64
                let my = 1 / 64

                let dx = this.sprite.position.x - this.player.sprite.position.x
                let dy = this.sprite.position.z - this.player.sprite.position.z

                if (dx > this.attackRange / 2) {
                    this.movement.set(-mx, this.movement.y)
                }
                if (dx < this.attackRange / 2) {
                    this.movement.set(mx, this.movement.y)
                }
                
                if (!this.flipped && dx > 0 && !this.IsHurting()) {
                    this.Flip()
                } else if (this.flipped && dx < 0 && !this.IsHurting()) {
                    this.Flip()
                }               

                let hitOtherEnemies = this.CollidingWith(getEnemies().filter(enm => !enm.IsDead() && enm !== this))
                if (hitOtherEnemies.length > 0) {
                    let enemy = hitOtherEnemies[0]
                    let avoidForce = 0.016
                    let dir = new THREE.Vector3()
                    dir.subVectors(this.sprite.position, enemy.sprite.position).normalize()
                    this.movement.set(dir.x > 0 ? avoidForce : -avoidForce, dir.z > 0 ? avoidForce * 6 : -avoidForce * 6)
                } else {
                    let inRangeX = this.movement.x !== 0 && Math.abs(dx) < this.attackRange / 2
                    let inRangeY = this.movement.y !== 0 && Math.abs(dy) < this.attackRange / 4

                    if (inRangeX) {
                        this.movement.set(0, this.movement.y)
                    }

                    if (dy > 0) {
                        this.movement.set(this.movement.x, -my)
                    }
                    if (dy < 0) {
                        this.movement.set(this.movement.x, my)
                    }

                    if (inRangeY) {
                        this.movement.set(this.movement.x, 0)
                    }

                    if (inRangeX && inRangeY) {
                        this.movement.set(0, 0)
                    }
                }
                
                if (!this.animationId.includes('attack') && !this.animationId.includes('hurt') && !this.animationId.includes('death')) {
                    this.sprite.position.add(new THREE.Vector3(this.movement.x, 0, this.movement.y))
                }    

                // Apply friction to enemy.
                let friction = 0.9
                this.ApplyForce(new THREE.Vector2(this.force.x * friction, this.force.y * friction))


                // Apply force motion to sprite position.
                this.sprite.position.add(new THREE.Vector3(this.force.x, 0, this.force.y))

                if (this.hurting > 0) {
                    this.hurting--
                }

                if (this.weaponCooldown === 0) {
                    let hitPlayer = this.CheckAttackBoundingBox([this.player], false).filter(p => !p.IsHurting() && !p.IsDead())
                    if (hitPlayer.length > 0) {
                        let hitForce = 0.033
                        hitPlayer.forEach(player => {
                            player.hurting = 32
                            player.hp -= 0.5
                            player.ApplyForce(new THREE.Vector3(this.flipped ? -hitForce : hitForce, 0, 0))
                            this.weaponCooldown = 96
                        })
                    }
                } else {
                    this.weaponCooldown--
                    this.scene.remove(this.attackOBBMesh)
                    this.attackOBBMesh = null
                }

    
                if (this.stateMachine) {
                    this.stateMachine.send({ type: 'update' })
                }
            }
        } catch (err) { console.trace('Error in Enemy Update():', this.name, err) }
	}

}

export default Enemy
