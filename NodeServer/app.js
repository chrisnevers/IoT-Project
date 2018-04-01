const express 		= require('express')
const cookieParser 	= require('cookie-parser')
const bodyParser   	= require('body-parser')
const session      	= require('express-session')
const mysql 		= require('mysql')
const bcrypt 		= require('bcryptjs')

const saltRounds = 10;
const app = express()

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
					res.redirect('/home')
			    } else {
			    	console.log("Password does not match db password. Rejecting " + user)
			    	res.render('index', { error: 'Username/password not found', success: '' })
			    }
			});
		}
	})
})

app.get('/home', function (req, res) {
	res.render('home', {'name': 'Chris' })
})

// Specify port to listen on here
app.listen(3000, function() {
	console.log('IoT listening on port 3000!')
})

