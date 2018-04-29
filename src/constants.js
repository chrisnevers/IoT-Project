module.exports = {
	AWS_DEVICE_ID : 'G030MD046381H7E1', // Id back off aws button
	AWS_DEVICE_KEY_PATH: '/home/pi/IoT-Project/aws_keys/private.pem.key',
	AWS_DEVICE_CERT_PATH: '/home/pi/IoT-Project/aws_keys/certificate.pem.crt',
	AWS_DEVICE_CA_PATH: '/home/pi/IoT-Project/aws_keys/root-CA.crt',
	AWS_DEVICE_CLIENT_ID: 'IOT-Button-1',
	AWS_DEVICE_HOST : 'a555ho3l29mvv.iot.us-west-2.amazonaws.com',
	CAMERA_PORTS : [
		"8081", // Pi Zero 1 - Forwarded Port 8081 --> 192.168.1.196:8081
		"8082" 	// Pi Zero 2 - Forwarded Port 8082 --> 192.168.1.198:8081
	],
	DAYS_PHOTOS_ARE_KEPT : 7,			// Photos are deleted after seven days by default.
	SALT_ROUNDS : 10, 					// PW hashing stuff
	SQL_HOST     : 'localhost',
	SQL_USER     : 'root',
	SQL_PASSWORD : '',
	SQL_DATABASE : 'iotdevdb'
};