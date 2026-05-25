// require('dotenv').config()
// const pool = require('../connectionLocal');

// var Client = require('ftp')

// /**
//  * @author Rajat Metry
//  * @param {MySQL Query} query
//  * @returns Insert BOM Dump Data
//  */
// const executeQuery1 = async (query) => {
// 	return new Promise((resolve) => {
// 		pool.getConnection(function (error, connection) {
// 			if (error) {
// 				console.log("\n" + error + " | " + pool.config.connectionConfig.host)
// 			} else {
// 				connection.changeUser({
// 					database: process.env.DB1_NAME_LOCAL
// 				});
// 				connection.query(query, (error, elements) => {
// 					if (error) {
// 						connection.release();
// 						console.log("\n" + query)
// 						console.log("\n" + error)
// 					} else {
// 						connection.release();
// 						return resolve(elements)
// 					}
// 				});
// 			}
// 		});
// 	});
// }

// const connectionProperties = {
// 	host: process.env.FTP_HOST_BOM,
// 	user: process.env.FTP_USER_BOM,
// 	password: process.env.FTP_PASS_BOM,
// 	connTimeout: 60000,
// 	pasvTimeout: 60000
// }

// exports.init = async () => {
// 	const c = new Client();
// 	let content = '';
// 	let queryString = ''
// 	c.on('ready', function () {
// 		c.list([process.env.FTP_FOLDERPATH_BACKFLUSH], function (err, list) {
// 			if (err) {
// 				console.log(err)
// 			} else {
// 				let folderName = list[list.length - 1].name
// 				if (folderName.includes("ZMB51") && list[list.length - 1].type != 'd') {
// 					let refid = folderName.split("_")[1].split(".")[0].slice(3, 18)
// 					c.get(process.env.FTP_FOLDERPATH_BACKFLUSH + folderName, function (err, stream) {
// 						stream.on('data', function (chunk) {
// 							content += chunk.toString()
// 						});
// 						stream.on('end', async function () {
// 							let backflushMapping = ['Material', 'Plant', 'Material Description', 'Storage Location', 'Order', 'Doc.Header Text', 'Movement Type', 'Entry Date', 'Time of Entry', 'Amount in LC', 'Material Document', 'Base Unit', 'Quantity', 'User name']
// 							let lineSeperatedString = content.split("\r\n")
// 							let lineSeperatedHeader = lineSeperatedString[0].split("|")
// 							for (let x = 1; x < lineSeperatedString.length; x++) {
// 								let lineSeperatedArray = lineSeperatedString[x].split("|")
// 								queryString += "('"
// 								for (let y = 0; y < lineSeperatedArray.length; y++) {
// 									let index = backflushMapping.indexOf(lineSeperatedHeader[y])
// 									lineSeperatedArray[y] = backflushMapping[index] == 'Doc.Header Text' ? lineSeperatedArray[y] === "" ? "-" : lineSeperatedArray[y] : lineSeperatedArray[y]
// 									if (index >= 0 && lineSeperatedArray[y] != "") {

// 										lineSeperatedArray[y] = (backflushMapping[index] == 'Entry Date') ? lineSeperatedArray[y].split("-").reverse().join("-") : lineSeperatedArray[y]
// 										queryString += lineSeperatedArray[y].replace(/[^a-zA-Z0-9. :/-]/g, '').trim() + "', '"
// 									}
// 								}
// 								queryString = queryString.substring(0, queryString.length - 3)
// 								queryString += "), "
// 							}
// 							queryString = queryString.substring(0, queryString.length - 4)
// 							queryString = queryString.split(", ('")

// 							if (queryString.length > 0) {
// 								await executeQuery1("INSERT INTO backflushing (material, plant, materialname, location, orderno, header, movementtype, date, time, amount, docno, units, qty, username) VALUES " + queryString.join(", ('") + " ON DUPLICATE KEY UPDATE material = VALUES(material), plant = VALUES(plant), materialname = VALUES(materialname), location = VALUES(location), orderno = VALUES(orderno), header = VALUES(header), movementtype = VALUES(movementtype), date = VALUES(date), time = VALUES(time), amount = VALUES(amount), units = VALUES(units), qty = VALUES(qty), username = VALUES(username)")
// 								await executeQuery1("UPDATE all_service_status SET flag = '" + +new Date().toString().substring(8, 10) + "' WHERE service_name = 'BACKFLUSHING'")
// 								console.log("\tBACKFLUSHING | UPLOADED")

// 								let oldPath = process.env.FTP_FOLDERPATH_BACKFLUSH + folderName
// 								let newPath = process.env.FTP_DESTINATION_FOLDERPATH_BACKFLUSH + folderName
// 								c.rename(oldPath, newPath, async function (err) {
// 									if (err) throw err;
// 									await executeQuery1("UPDATE all_service_status SET flag = '" + +new Date().toString().substring(8, 10) + "' WHERE service_name = 'BACKFLUSHING'")
// 									console.log("\tBACKFLUSHING | MOVED | " + newPath)
// 									c.end();
// 								});
// 							} else {
// 								let oldPath = process.env.FTP_FOLDERPATH_BACKFLUSH + folderName
// 								let newPath = process.env.FTP_DESTINATION_FOLDERPATH_BACKFLUSH + folderName
// 								c.rename(oldPath, newPath, async function (err) {
// 									if (err) throw err;
// 									await executeQuery1("UPDATE all_service_status SET flag = '" + +new Date().toString().substring(8, 10) + "' WHERE service_name = 'BACKFLUSHING'")
// 									console.log("\tBACKFLUSHING | MOVED | " + newPath)
// 									c.end();
// 								});
// 							}
// 						})
// 					})
// 				} else {
// 					console.log("\tBACKFLUSHING | EMPTY")
// 					c.end();
// 				}
// 			}
// 		})
// 	})
// 	c.connect(connectionProperties)
// 	c.on('error', console.dir)
// }