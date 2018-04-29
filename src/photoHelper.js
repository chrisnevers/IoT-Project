const dateFormat	= require('dateformat')
const fs 			= require('fs')
const path 			= require('path')

let self = module.exports = {
	getPhotosWithDate: async function getPhotosWithDate(date, i, dir, fileType) {
		let files = [];
		let list = fs.readdirSync(__dirname + "/public/" + dir);
	    for (j = 0; j < list.length; ++j) {
	        if (path.extname(list[j]) === fileType && list[j].includes(date)) {
	            let val = dir + list[j];
	            files.push(val);
	        }
	    }
	    return files;
	},
	getPhotos: async function getPhotos (date) {
		console.log("Getting Photos From Date:", date);
		const fileType = ".jpg";
		let files = [];
		let length = constants.CAMERA_PORTS.length;

		for (let i = 0; i < length; ++i) {
			dir = "images/zero-" + (i + 1) + "/";
			files.push(...(await self.getPhotosWithDate(date, i, dir, fileType)));
		}
		return files;
	},
	getDateNDaysAgo: function getDateNDaysAgo(n) {
	    let date = new Date();
	    date.setDate(date.getDate() - n);
	    return date.getFullYear() + '-' + ((date.getMonth() < 9 ? '0': '') + (date.getMonth() + 1)) + '-' + date.getDate();
	},
	getLastNDays: function getLastNDays(n) {
		let dates = [];
		for (var i = 0; i < n; ++i) { dates.push(self.getDateNDaysAgo(i)); }
		return dates;
	}
};
