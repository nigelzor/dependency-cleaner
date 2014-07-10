'use strict';

var fs = require('fs')
var detective = require('detective')
var readdirp = require('readdirp')
var builtin = 'assert buffer child_process cluster console constants crypto dgram dns domain events freelist fs http https module net os path punycode querystring readline repl stream string_decoder sys timers tls tty url util vm zlib'.split(' ')

module.exports = function (dir, fileFilter, directoryFilter, callback) {
  var requisitions = {}

  function processFile (file) {
    fs.readFile(file.fullPath, function (err, data) {
      if (err) return
      var script = data.toString()
      try {
        detective(script).map(function (reqStr) {
          if (reqStr.charAt(0) === '.') return
          requisitions[reqStr.replace(/\/.*/, '')] = true
        })
      } catch (e) {
        console.error('In file ' + file.path, e)
      }
    });
  }

  readdirp({root: dir, fileFilter: fileFilter, directoryFilter: directoryFilter}, processFile,
    function allProcessed (err, res) {
      if (err) return callback(err)

      fs.readFile(dir + '/package.json', function (err, data) {
        if (err) return callback(err)

        var dependencies = {
          used: [],
          unused: [],
          missing: [],
          'used-dev': [],
          'unused-dev': []
        }

        var packageJSON = JSON.parse(data.toString())
        var packageDeps = packageJSON.dependencies || {}
        var packageDevDeps = packageJSON.devDependencies || {}

        Object.keys(packageDeps).forEach(function (dependency) {
          if (requisitions[dependency]) {
            dependencies.used.push(dependency)
          } else {
            dependencies.unused.push(dependency)
          }
        })
        Object.keys(packageDevDeps).forEach(function (dependency) {
          if (requisitions[dependency]) {
            dependencies['used-dev'].push(dependency)
          } else {
            dependencies['unused-dev'].push(dependency)
          }
        })
        Object.keys(requisitions).forEach(function (dependency) {
          if (packageDeps[dependency] == null && packageDevDeps[dependency] == null && builtin.indexOf(dependency) === -1) {
            dependencies.missing.push(dependency)
          }
        })

        if (typeof callback == 'function') return callback(null, dependencies)
      })
    }
  )
}
