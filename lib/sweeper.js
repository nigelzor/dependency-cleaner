'use strict';

var fs = require('fs')
var detective = require('detective')
var readdirp = require('readdirp')

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
          unused: []
        }

        var packageJSON = JSON.parse(data.toString())
        Object.keys(packageJSON.dependencies).forEach(function (dependency) {
          if (requisitions[dependency]) {
            dependencies.used.push(dependency)
          } else {
            dependencies.unused.push(dependency)
          }
        })

        if (typeof callback == 'function') return callback(null, dependencies)
      })
    }
  )
}
