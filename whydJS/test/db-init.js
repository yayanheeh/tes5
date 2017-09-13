// inits the mongodb database like app.js does
// => useful for running integration tests from outside of whydJS

process.appParams = {
  urlPrefix: '',
  mongoDbHost: process.env['MONGODB_HOST'] || 'localhost',
  mongoDbPort: process.env['MONGODB_PORT'] || mongodb.Connection.DEFAULT_PORT, // 27017
  mongoDbAuthUser: process.env['MONGODB_USER'],
  mongoDbAuthPassword: process.env['MONGODB_PASS'],
  mongoDbDatabase: process.env['MONGODB_DATABASE'], // || "openwhyd_data",
};

var fs = require('fs');
var mongodb = require('../app/models/mongodb.js');

var initScript = './config/initdb.js';

exports.initDb = function async(done) {
  mongodb.init(function(err, db) {
    if (err) throw err;
    var mongodbInstance = this;  
    console.log('Applying db init script:', initScript, '...');
    mongodbInstance.runShellScript(fs.readFileSync(initScript), function(err) {
      if (err) throw err;
      mongodbInstance.cacheCollections(function() {
        mongodb.cacheUsers(function() {
          done();
        });
      });
    });
  });
};
