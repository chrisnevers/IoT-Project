/* 
 This file is responsible for maintaining the GPIO port
 activity on the break out board i.e. turning the red 
 and green light on and off.
*/
const rpio 			= require('rpio')

// GPIO pin mappings
const red = 20
const green = 21
var redTimer = 0
var greenTimer = 0
var offTimer = 0

module.exports = {
	init: function init () {
		// Set up GPIO LEDs
		rpio.init({mapping: 'gpio'})

		rpio.open(red, rpio.OUTPUT)
		rpio.open(green, rpio.OUTPUT)
	},
	cleanup: function cleanup (server) {
		// On exit, clear all blink timers
		clearInterval(greenTimer)
		clearInterval(redTimer)
		// Turn off all lights
		rpio.write(red, rpio.LOW)
		rpio.write(green, rpio.LOW)
		// Shutdown server & exit
		server.close()
		process.exit()
	},
	error: function error (msg) {
		console.log("Error: " + msg)
		// If error stop blinking green
		rpio.write(green, rpio.LOW)
		clearInterval(greenTimer)
		// Start blinking red
		redTimer = setInterval(redLightOn, 3000)
	},
	greenLightOn: function greenLightOn() {
		rpio.write(green, rpio.HIGH)
		clearTimeout(offTimer)
		offTimer = setTimeout(function () {
			rpio.write(green, rpio.LOW)
		}, 1000)
	},
	redLightOn: function redLightOn() {
		rpio.write(red, rpio.HIGH)
		clearTimeout(offTimer)
		offTimer = setTimeout(function () {
			rpio.write(red, rpio.LOW)
		}, 1000)
	}
};
