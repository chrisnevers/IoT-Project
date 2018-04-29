module.exports = {
	markUserLoggedIn: function markUserLoggedIn (connection, user) {
		sql = "UPDATE login SET logged_in = 1 WHERE L1 = \'" + user + "\';"
		connection.query(sql, (err, result) => {
			if (err) console.log("MySQL update error while marking user logged in: " + err)
		})
	},
	markUserLoggedOut: function markUserLoggedOut (connection, user) {
		sql = "UPDATE login SET logged_in = 0 WHERE L1 = \'" + user + "\';"
		connection.query(sql, (err, result) => {
			if (err) console.log("MySQL update error while marking user logged out: " + err)
		})
	}
};