const express 		= require('express')
const cookieParser 	= require('cookie-parser')
const bodyParser   	= require('body-parser')
const session      	= require('express-session')
const mysql 		= require('mysql')
const bcrypt 		= require('bcryptjs')
const rpio 			= require('rpio')
const awsIot 		= require ('aws-iot-device-sdk')
const moment 		= require('moment')
const externalip 	= require('externalip');


// GPIO pin mappings
const red = 20
const green = 21
var redTimer = 0
var greenTimer = 0
var offTimer = 0

const cameras = [
	"8081", // Pi Zero 1 - Forwarded Port 8081 --> 192.168.1.196:8081
	"8082" 	// Pi Zero 2 - Forwarded Port 8082 --> 192.168.1.198:8081
]

// Streaming status - On (true) or Off (false)
var status = true

// PW hashing stuff
const saltRounds = 10;

// Set up GPIO LEDs
rpio.init({mapping: 'gpio'})

rpio.open(red, rpio.OUTPUT)
rpio.open(green, rpio.OUTPUT)

// Get router ip address
externalip(function (err, ip) {
	if (err) {
		console.log("Could not get router ip address. Exiting...\n");
		cleanup(); // Exit
	}
	routerIp = ip;
	console.log('Got router\'s ip address:', ip);
});

// AWS IOT Button Device Info
const device = awsIot.device({
	// debug: true,
	keyPath: '/home/pi/IoT-Project/aws_keys/private.pem.key',
	certPath: '/home/pi/IoT-Project/aws_keys/certificate.pem.crt',
	caPath: '/home/pi/IoT-Project/aws_keys/root-CA.crt',
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
app.use(session({ 
	secret: 'secret-token', 
	cookie: { maxAge: 60000 },
	resave: false,
	saveUninitialized: false
}));

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
					sql = "INSERT INTO login (L1, l2, role) VALUES (\'" + user + "\', \'" + hash + "\', \'b\');"

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

function markUserLoggedIn (user) {
	sql = "UPDATE login SET logged_in = 1 WHERE L1 = \'" + user + "\';"
	connection.query(sql, function(err, result) {
		if (err) console.log("MySQL update error while marking user logged in: " + err)
	})
}

function markUserLoggedOut (user) {
	sql = "UPDATE login SET logged_in = 0 WHERE L1 = \'" + user + "\';"
	connection.query(sql, function(err, result) {
		if (err) console.log("MySQL update error while marking user logged out: " + err)
	})
}

app.post('/login', function (req, res) {

	user = req.body.username
	pw = req.body.password
	hash = ""

	// Connect to MySQL
	// connection.connect()

	// Create sql query to grab pw from DB
	sql = "SELECT * FROM login WHERE L1 = \'" + user + "\';"

	connection.query(sql, function(err, result) {
		if (err) {
			console.log("MySQL insertion error at login: " + err)
			res.render('index', { error: 'Username/password not found', success: '' })
		} else {
			// End MYSQL connection
			// connection.end()

			// hash = pw from DB
			hash = result[0].L2
			permission = result[0].role;
			console.log ("permission:", permission)

			// Compare pw and hash. (pw is raw password from form)
			bcrypt.compare(pw, hash, function(err, result) {
				// If there's an error, log it and display it on page
				if (err) {
					console.log(err)
					res.render('index', { error: err, success: ''})
				}
			    if (result && permission == 'a') {
				    console.log("Password matches db password. Logging in " + user)
				    req.session.user = user;
					res.render('home', { user: user, cameras: cameras, status: (status) ? "on" : "off", ip : routerIp })
					markUserLoggedIn(user);
					// res.redirect('/home')
			    } else {
			    	if (permission == 'b') {
			    		console.log("Username does not have correct permissions. Rejecting " + user)
				    	res.render('index', { error: 'Username does not have correct permissions. Change permissions on server.', success: '' })			    		
			    	} else {
				    	console.log("Password does not match db password. Rejecting " + user)
				    	res.render('index', { error: 'Username/password not found', success: '' })			    		
			    	}
			    }
			});
		}
	})
})

app.post('/logout', function (req, res) {
	if (req.session.user) {
		markUserLoggedOut(req.session.user);
		req.session.destroy();
	}
	res.render('index', { error: '', success: 'User logged out.' })
})

io.on('connection', function (socket) {
	// socket.emit('news', { "message": "hello world" })

	device.on('message', function(topic, payload) {
		status = !status
		console.log("Changing stream status to " + status)
		socket.emit('news', { "message": payload.toString(), status: status })
		
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
	socket.on('disconnect', function () {
	    socket.removeAllListeners('news')
	    socket.removeAllListeners('disconnect')
	    io.removeAllListeners('connection')
	})
	// socket.removeAllListeners()
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
