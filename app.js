const express 		= require('express')
const cookieParser 	= require('cookie-parser')
const bodyParser   	= require('body-parser')
const session      	= require('express-session')
const mysql 		= require('mysql')
const bcrypt 		= require('bcryptjs')
const awsIot 		= require ('aws-iot-device-sdk')
const moment 		= require('moment')
const externalip 	= require('externalip')
const asyncHandler 	= require('express-async-handler')
const { exec } 		= require('child_process');

const gpio			= require('./src/gpio.js')
const sqlHelper		= require('./src/sqlHelper.js')
const photoHelper 	= require('./src/photoHelper.js')
const constants		= require('./src/constants.js')

// Streaming status: Should the cameras be broadcasting their stream?
var status 	= true

// Set up GPIO LEDs
gpio.init();

// Get router ip address
externalip((err, ip) => {
	if (err) {
		console.log("Could not get router ip address. Exiting...\n");
		gpio.cleanup(); // Exit
	}
	routerIp = ip;
	console.log('Got router\'s ip address:', ip);
});

// AWS IOT Button Device Info
const device = awsIot.device({
	// debug: true,
	keyPath : constants.AWS_DEVICE_KEY_PATH,
	certPath: constants.AWS_DEVICE_CERT_PATH,
	caPath 	: constants.AWS_DEVICE_CA_PATH,
	clientId: constants.AWS_DEVICE_CLIENT_ID,
	host 	: constants.AWS_DEVICE_HOST
})

device.on('connect', () => {
	console.log('Connected to AWS IoT button!')
	device.subscribe('iotbutton/' + constants.AWS_DEVICE_ID)
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
  host     : constants.SQL_HOST,
  user     : constants.SQL_USER,
  password : constants.SQL_PASSWORD,
  database : constants.SQL_DATABASE
});

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'))

app.set('view engine', 'ejs')

app.get('/', function (req, res) {
	// First param (string) - file name of .ejs file to render
	// Second param (json) 	- variables that are sent to index.ejs when rendering
	res.render('index', { error: '', success: '' })
})

app.post('/signup', (req, res) => {
	user = req.body.username
	pw 	 = req.body.password

	// Create sql query to grab pw from DB
	sql = "SELECT L2 FROM login WHERE L1 = \'" + user + "\';"

	connection.query(sql, (err, result) => {
		if (err) { res.render('index', { error: err, success: '' }) }
		else {
			if (result.length > 0) {
				// User exists so return
				res.render('index', { error: 'User already exists', success: '' })
			} else {
				// User does not exist - so create row in DB
				bcrypt.hash(pw, constants.SALT_ROUNDS, (error, hash) => {
					// Create sql statement to store hashed password in DB.
					sql = "INSERT INTO login (L1, l2, role) VALUES (\'" + user + "\', \'" + hash + "\', \'b\');"
					connection.query(sql, (err, result) => {
						if (err) { res.render('index', { error: err, success: '' })} 
						else { res.render('index', { error: '', success: 'User successfully created.' })}
					})
				});
			}
		}
	})
})

app.post('/getScreenshots', asyncHandler(async (req, res, next) => {
	let publicDir = __dirname + "/public/";
	let photos = await photoHelper.getPhotos(req.body.day, publicDir);
	let date = req.body.day;
	res.render('photos', { date: date, photos: photos });
}));

app.post('/remountRemotes', asyncHandler((req, res, next) => {
	// command 
	// sudo sshfs -o allow_other,password_stdin pi@pizero1:/var/lib/motion/ public/images/zero-1 <<< chrispi
	days = photoHelper.getLastNDays(constants.DAYS_PHOTOS_ARE_KEPT);
	for (let i = 1; i <= constants.CAMERA_PORTS.length; ++i) {
		command = "echo \"" + constants.PI_ZEROS_PW + "\" | sudo sshfs -o allow_other,password_stdin pi@pizero" + i + ":/var/lib/motion/ public/images/zero-" + i;
		exec(command, (err, stdout, stderr) => {
			if (err) console.log("Error:", err);
		});
	}
	res.render('home', { 
		cameras: constants.CAMERA_PORTS, 
		status: (status) ? "on" : "off", 
		ip : routerIp,
		days: days
	});
}));

app.post('/login', (req, res) => {

	user = req.body.username
	pw = req.body.password
	hash = ""

	// Create sql query to grab pw from DB
	sql = "SELECT * FROM login WHERE L1 = \'" + user + "\';"

	connection.query(sql, (err, result) => {
		if (err) {
			console.log("MySQL insertion error at login: " + err)
			res.render('index', { error: 'Username/password not found', success: '' })
		} else {
			hash = result[0].L2 // hash = pw from DB
			permission = result[0].role;

			// Compare pw and hash. (pw is raw password from form)
			bcrypt.compare(pw, hash, (err, result) => {

				days = photoHelper.getLastNDays(constants.DAYS_PHOTOS_ARE_KEPT);

				if (err) { res.render('index', { error: err, success: ''}) }

			    if (result && permission == 'a') {
				    console.log("Password matches db password. Logging in " + user)
				    req.session.user = user;
				    res.render('home', { 
		    			cameras: constants.CAMERA_PORTS, 
		    			status: (status) ? "on" : "off", 
		    			ip : routerIp,
		    			days: days
			    	});
				    sqlHelper.markUserLoggedIn(connection, user);

			    } else {
			    	if (permission == 'b') {
				    	res.render('index', { error: 'Username does not have correct permissions. Change permissions on server.', success: '' })			    		
			    	} else {
				    	res.render('index', { error: 'Username/password not found', success: '' })			    		
			    	}
			    }
			});
		}
	})
})

app.post('/logout', (req, res) => {
	let user = req.session.user;
	if (user) {
		sqlHelper.markUserLoggedOut(connection, user);
		req.session.destroy();
	}
	res.render('index', { error: '', success: 'User logged out.' })
})

io.on('connection', (socket) => {
	// socket.emit('news', { "message": "hello world" })
	// socket.on('my other event', function (data) { console.log(data) })

	device.on('message', (topic, payload) => {
		status = !status
		console.log("Changing stream status to " + status)
		socket.emit('news', { "message": payload.toString(), status: status })
		
		// Create sql query to grab pw from DB
		let time = moment().format('LTS');
		sql = "INSERT INTO iotlog (ldate, ltime, devname, logentry) VALUES (NOW(), \'" + time + "\', \'" +constants.AWS_DEVICE_ID + "\', \'" + payload.toString() + "\');"

		connection.query(sql, (err, result) => {
			if (err) { console.log("MySQL insertion error logging aws msg: " + err) } 
			else { console.log("Logged AWS message" + payload.toString()) }
		})
	})

	socket.on('disconnect', () => {
	    socket.removeAllListeners('news')
	    socket.removeAllListeners('disconnect')
	    io.removeAllListeners('connection')
	})
	// socket.removeAllListeners()
})

server.listen(3000, () => {
	console.log('IoT listening on port 3000!')
	greenTimer = setInterval(gpio.greenLightOn, 3000)
})

process.on('SIGINT', () => gpio.cleanup(server))
process.on('uncaughtException', () => gpio.cleanup(server))
