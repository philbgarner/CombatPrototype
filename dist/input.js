var maps = {
  "keyboard": {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "attack": " ",
    "select": "Shift",
    "cancel": "Escape"
  },

  "gamepad": {
    "moveUp": "button12",
    "moveDown": "button13",
    "moveLeft": "button14",
    "moveRight": "button15",
    "attack": "button0",
    "select": "button7",
    "cancel": "button1"
  }
}

var listening = false

function handlerPressed (button) {
  setState(button, true)
  if (callbacksPressed[button]) {
    callbacksPressed[button](button)
  }
}

function handlerReleased (button) {
  setState(button, false)
  if (callbacksReleased[button]) {
    callbacksReleased[button](button)
  }
}

function GetInputKeys(inputType) {
  inputType = inputType.toLowerCase()
  return Object.keys(maps[inputType])
}

function GetInputValue(inputType, key) {
  inputType = inputType.toLowerCase()
  return maps[inputType][key]
}

var inputState = {}
var callbacksReleased = {}
var callbacksPressed = {}

var enabled = [ 'keyboard', 'gamepad' ]

function setState(button, value) {
  inputState[button] = value
}

function getState(button) {
  if (!listening) {
    return false
  }
  return inputState[button] ? inputState[button] : false
}

function listenerKeyDown(e) {
  if (!listening) {
    return
  }
  let inputs = Object.keys(maps.keyboard)
  for (let i in inputs) {
    if (e.key === maps.keyboard[inputs[i]]) {
      handlerPressed(inputs[i])
    }
  }
}

function listenerKeyUp(e) {
  if (!listening) {
    return
  }
  let inputs = Object.keys(maps.keyboard)
  for (let i in inputs) {
    if (e.key === maps.keyboard[inputs[i]]) {
      handlerReleased(inputs[i])
    }
  }
}

function initInput() {
  inputState = {}
  callbacksReleased = {}
  callbacksPressed = {}
  if (enabled.includes('keyboard')) {
    window.removeEventListener('keydown', listenerKeyDown)
    window.removeEventListener('keyup', listenerKeyUp)
    window.addEventListener('keydown', listenerKeyDown)
    window.addEventListener("keyup", listenerKeyUp)
  }
  if (enabled.includes('gamepad')) {
    gameControl.on('connect', function(gamepad) {
      let inputs = Object.keys(maps.gamepad)
      for (let i in inputs) {
        gamepad.on(maps.gamepad[inputs[i]], () => {
        }).after(maps.gamepad[inputs[i]], () => {
          handlerReleased(inputs[i])
        }).before(maps.gamepad[inputs[i]], () => {
          handlerPressed(inputs[i])
        })
      }
    })
  }
  listening = false
}
initInput()

var input = {
  listen: () => {
    listening = true
  },
  unlisten: () => {
    listening = false
  },
  released: (button, method) => {
    callbacksReleased[button] = method
  },
  pressed: (button, method) => {
    callbacksPressed[button] = method
  }
}
