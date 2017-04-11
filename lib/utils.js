'use strict'

const btoa = require('btoa')
const atob = require('atob')

function Utils() {}

Utils.promisify = function(cb) {
  return new Promise(cb)
}

Utils.encryptApp = function(name) {
  return btoa(name)
}

Utils.decryptApp = function(name) {
  return atob(decodeURIComponent(name))
}

module.exports = Utils