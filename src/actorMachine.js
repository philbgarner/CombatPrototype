import { createMachine } from "xstate"

const actorMachine = createMachine({
    id: 'actor',
    initial: 'idle',
    context: {
        actor: null
    },
    states: {
        idle: {
            entry: 'idle',
            type: 'atomic',
            always: [
                { target: 'death', cond: (context, event) => context.actor?.IsDead()},        
                { target: 'hurt', cond: (context, event) => context.actor?.IsHurting()},
                { target: 'attack1', cond: (context, event) => {
                                return context.actor?.GetInput('attack')
                            } },
                    { target: 'run', cond: (context, event) => {
                                return (context.actor?.GetInput('horizontal') !== 0 || context.actor?.GetInput('vertical') !== 0) && !context.actor?.GetInput('attack')
                            } }
                ]
        },
        attack1: {
            entry: 'attack1',
            type: 'atomic',
            always: [
                { target: 'death', cond: (context, event) => context.actor?.IsDead()},        
                { target: 'hurt', cond: (context, event) => context.actor?.IsHurting()},
                { target: 'idle', cond: (context, event) => {
                                return context.actor.currentSprite >= context.actor.frames[context.actor.animationId].length - 1 && !context.actor?.GetInput('attack')
                            } }
                ]
        },
        attack2: {
            entry: 'attack2',
            type: 'atomic',
            always: [
                { target: 'death', cond: (context, event) => context.actor?.IsDead()},        
                { target: 'hurt', cond: (context, event) => context.actor?.IsHurting()},
                { target: 'idle', cond: (context, event) => {
                            return context.actor.currentSprite >= context.actor.frames[context.actor.animationId].length - 1
                        } }
            ]
        },
        run: {
            entry: 'run',
            type: 'atomic',
            always: [
                    { target: 'death', cond: (context, event) => context.actor?.IsDead()},        
                    { target: 'hurt', cond: (context, event) => context.actor?.IsHurting()},
                    { target: 'idle', cond: (context, event) => {
                                return context.actor?.GetInput('horizontal') === 0 && context.actor?.GetInput('vertical') === 0
                            } },
                    { target: 'attack2', cond: (context, event) => {
                        return context.actor?.GetInput('attack') && context.actor?.GetInput('vertical') === 0
                    } }
                ]
        },
        death: {
            entry: 'death',
            type: 'atomic'
        },
        hurt: {
            entry: 'hurt',
            type: 'atomic',
            always: [
                { target: 'idle', cond: (context, event) => !context.actor?.IsHurting()}
            ]
        },
    },
    // guards: {
    //     isAttacking: (context, event) => {
    //         console.log(context)
    //         return context.actor?.animationId === 'swordAttack'
    //     },
    //     isStabbing: (context, event) => {
    //         return context.actor?.animationId === 'swordStabAttack'
    //     },
    //     isRunning: (context, event) => {
    //         return context.actor?.animationId === 'swordRun'
    //     },
    //     isIdle: (context, event) => {
    //         return context.actor?.animationId === 'swordIdle'
    //     }
    // },
    actions: {
        // idle: (context, event) => {
        //     console.log('idle')
        // },
        // attack: (context, event) => {
        //     console.log('attack')
        // },
        // stab: (context, event) => {
        //     console.log('stab')
        // },
        // run: (context, event) => {
        //     console.log('run')
        // },
        update: (context, event) => {
            console.log('update', context, event)
        }
    }
})

export default actorMachine