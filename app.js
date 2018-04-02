const express 		= require('express')
const cookieParser 	= require('cookie-parser')
const bodyParser   	= require('body-parser')
const session      	= require('express-session')
const mysql 		= require('mysql')
const bcrypt 		= require('bcryptjs')
const rpio 			= require('rpio')
const awsIot 		= require ('aws-iot-device-sdk')
const moment 		= require('moment')

// GPIO pin mappings
const red = 20
const green = 21
var redTimer = 0
var greenTimer = 0
var offTimer = 0

// PW hashing stuff
const saltRounds = 10;

// Set up GPIO LEDs
rpio.init({mapping: 'gpio'})

rpio.open(red, rpio.OUTPUT)
rpio.open(green, rpio.OUTPUT)

// AWS IOT Button Device Info
const device = awsIot.device({
	// debug: true,
	keyPath: 'aws_keys/private.pem.key',
	certPath: 'aws_keys/certificate.pem.crt',
	caPath: 'aws_keys/root-CA.crt',
	clientId: 'IOT-Button-1',
	host: 'a555ho3l29mvv.iot.us-west-2.amazonaws.com'
})

const awsDeviceId = 'G030MD046381H7E1';

device.on('connect', function() {
	console.log('Connected to AWS IoT button!')
	device.subscribe('iotbutton/' + awsDeviceId)
})

// Create application
const app 			= express()
const server 		= require('http').createServer(app);
const io 			= require('socket.io')(server);

// Enter MySQL credentials
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'iotdevdb'
});

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'))

// Set templating engine
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
	// First param (string) - file name of .ejs file to render
	// Second param (json) 	- variables that are sent to index.ejs when rendering
	res.render('index', { error: '', success: '' })
})

app.post('/signup', function (req, res) {

	user = req.body.username
	pw = req.body.password

	// Create sql query to grab pw from DB
	sql = "SELECT L2 FROM login WHERE L1 = \'" + user + "\';"

	connection.query(sql, function(err, result) {
		if (err) {
			console.log("MySQL insertion error at signup: " + err)
			res.render('index', { error: err, success: '' })
		} else {
			if (result.length > 0) {
				// User exists so return
				res.render('index', { error: 'User already exists', success: '' })
			} else {
				// User does not exist - so create row in DB
				bcrypt.hash(pw, saltRounds, function(error, hash) {
					// Create sql statement to store hashed password in DB.
					sql = "INSERT INTO login (L1, l2, role) VALUES (\'" + user + "\', \'" + hash + "\', \'a\');"

					connection.query(sql, function(err, result) {
						if (err) {
							console.log("MySQL insertion error at signup: " + err)
							res.render('index', { error: err, success: '' })
						} else {
							// End MYSQL connection
							// connection.end()
							console.log("Signed up: " + user)
							res.render('index', { error: '', success: 'User successfully created.' })
						}
					})
				});
			}
		}
	})
})

app.post('/login', function (req, res) {

	user = req.body.username
	pw = req.body.password
	hash = ""

	// Connect to MySQL
	// connection.connect()

	// Create sql query to grab pw from DB
	sql = "SELECT L2 FROM login WHERE L1 = \'" + user + "\';"

	connection.query(sql, function(err, result) {
		if (err) {
			console.log("MySQL insertion error at login: " + err)
			res.render('index', { error: 'Username/password not found', success: '' })
		} else {
			// End MYSQL connection
			// connection.end()

			// hash = pw from DB
			hash = result[0].L2

			// Compare pw and hash. (pw is raw password from form)
			bcrypt.compare(pw, hash, function(err, result) {
				// If there's an error, log it and display it on page
				if (err) {
					console.log(err)
					res.render('index', { error: err, success: ''})
				}
			    if (result) {
				    console.log("Password matches db password. Logging in " + user)
					res.render('home', { user: user })
					// res.redirect('/home')
			    } else {
			    	console.log("Password does not match db password. Rejecting " + user)
			    	res.render('index', { error: 'Username/password not found', success: '' })
			    }
			});
		}
	})
})

io.on('connection', function (socket) {
	// socket.emit('news', { "message": "hello world" })
	device.on('message', function(topic, payload) {
		socket.emit('news', { "message": payload.toString() })
		
		// Create sql query to grab pw from DB
		sql = "INSERT INTO iotlog (ldate, ltime, devname, logentry) VALUES (NOW(), \'" + getTime() + "\', \'" + awsDeviceId + "\', \'" + payload.toString() + "\');"

		connection.query(sql, function(err, result) {
			if (err) {
				console.log("MySQL insertion error logging aws msg: " + err)
			} else {
				console.log("Logged AWS message" + payload.toString())
			}
		})
	})
	// socket.on('my other event', function (data) {
	// 	console.log(data)
	// })
})

function getTime() {
	return moment().format('LTS')
}

function greenLightOn() {
	rpio.write(green, rpio.HIGH)
	clearTimeout(offTimer)
	offTimer = setTimeout(function () {
		rpio.write(green, rpio.LOW)
	}, 1000)
}

function redLightOn() {
	rpio.write(red, rpio.HIGH)
	clearTimeout(offTimer)
	offTimer = setTimeout(function () {
		rpio.write(red, rpio.LOW)
	}, 1000)
}

// Specify port to listen on here
server.listen(3000, function() {
	console.log('IoT listening on port 3000!')
	// Blink green to show everything is fine
	greenTimer = setInterval(greenLightOn, 3000)
})

function error (msg) {
	console.log("Error: " + msg)
	// If error stop blinking green
	rpio.write(green, rpio.LOW)
	clearInterval(greenTimer)
	// Start blinking red
	redTimer = setInterval(redLightOn, 3000)
}

function cleanup () {
	// On exit, clear all blink timers
	clearInterval(greenTimer)
	clearInterval(redTimer)
	// Turn off all lights
	rpio.write(red, rpio.LOW)
	rpio.write(green, rpio.LOW)
	// Shutdown server & exit
	server.close()
	process.exit()
}

process.on('SIGINT', function() { cleanup() })
process.on('uncaughtException', function() { cleanup() })
