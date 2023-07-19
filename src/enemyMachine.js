//https://xstate.js.org/docs/guides/introduction-to-state-machines-and-statecharts/#states

import { createMachine } from "xstate"

const enemyMachine = createMachine({
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
                                return context.actor?.InRangeOfPlayer() && context.actor?.weaponCooldown === 0 && !context.actor?.player?.IsHurting()
                            } },
                    { target: 'run', cond: (context, event) => {
                                return (context.actor?.movement.x !== 0 || context.actor?.movement.y !== 0) && !context.actor?.InRangeOfPlayer()
                                    && !context.actor?.player?.IsDead()
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
                                return !context.actor?.InRangeOfPlayer() && context.actor?.currentSprite >= context.actor?.frames[context.actor?.animationId].length - 1 
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
                                return context.actor?.movement.x === 0 && context.actor?.movement.y === 0
                            } },
                ]
        },
        hurt: {
            entry: 'hurt',
            type: 'atomic',
            always: [
                { target: 'idle', cond: (context, event) => { 
                    return !context.actor?.IsHurting()
                 }}
            ]
        },
        death: {
            entry: 'death',
            type: 'atomic'
        }
    },
    actions: {
        update: (context, event) => {
            console.log('update', context, event)
        }
    }
})

export default enemyMachine