var vm = require('vm');
var async = require('async');

// this method runs the commands of a mongo shell script (e.g. initdb.js)
exports.runScriptOnDatabase = function(script, db, callback) {

  var commands = script.toString().split(/[\;\n]/);
  async.eachSeries(commands, function(command, nextCommand){

    command = command.trim();

    if (!command || /^\/\//.test(command) || /^\/\*.*\*\/$/.test(command)) {
      //console.log('IGNORE', command);
      nextCommand();
      return;
    } else {
      //console.log('RUN', command);
    }

    function makeCallback(prefix, callback) {
      return function(err, res) {
        //console.log(prefix, '=>', err ? err.errmsg : 'ok');
        callback();
      };
    }
    function wrapCollection(colName, callback, commandCallback) {
      db.collection(colName, function(err, col) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, {
          dropIndex: function() {
            var args = Array.prototype.slice.call(arguments).concat([
              makeCallback(colName + '.dropIndex', commandCallback)
            ]);
            return col.dropIndex.apply(col, args)
          },
          ensureIndex: function() {
            var args = Array.prototype.slice.call(arguments).concat([
              makeCallback(colName + '.ensureIndex', commandCallback)
            ]);
            return col.ensureIndex.apply(col, args)
          },
        });
      });
    }

    var shellDb = {
      createCollection: function(colName) {
        db.createCollection(colName, {}, makeCallback('db.createCollection', nextCommand));
      },
    };

    db.collections(function(err, collections) {
      if (err) throw err;
      async.eachSeries(collections, function(colObj, nextCollection) {
        // for each collection:
        wrapCollection(colObj.collectionName, function(err, res) {
          if (err) throw err;
          shellDb[colObj.collectionName] = res;
          nextCollection();
        }, nextCommand);
      }, function() {
        // when all collections are wrapped => run the current command
        new vm.Script(command).runInContext(vm.createContext({
          print: function() {
            var args = ['[mongo shell]'].concat(Array.prototype.slice.call(arguments));
            console.log.apply(console, args);
            nextCommand();
          },
          db: shellDb,
        }));
      });
    });

  }, callback);
};
