'use strict'

const Server = require('./server')
const Client = require('./client')
const Crypter = require('./lib/crypter')

function Sso(secret) {
  if (!(this instanceof Sso)) {
    return new Sso(secret)
  }

  this.crypter = Crypter(secret)
}

Sso.prototype.server = function(opts) {
  return Server(this.crypter, opts)
}

Sso.prototype.client = function(opts) {
  return Client(this.crypter, opts)
}

module.exports = Sso