'use strict'

const Cookies = require('cookies')
const Keygrip = require('keygrip')

function Cookie(key, opts) {
  if (!(this instanceof Cookie)) {
    return new Cookie(key, opts)
  }

  this.key = key
  this.crypter = opts.crypter
  this.secret = opts.secret
  this.keygrip = new Keygrip(opts.keylist)

  this.cookies = null
}

Cookie.prototype.initializeRequest = function(req, res) {
  this.cookies = new Cookies(req, res, { keys: this.keygrip })
}

Cookie.prototype.get = function() {
  const value = this.cookies.get(this.key, {
    signed: true
  })

  return value ? this.crypter.decrypt(value, this.secret) : value
}

Cookie.prototype.set = function(value) {
  value = this.crypter.encrypt(value, this.secret)

  this.cookies.set(this.key, value, {
    signed: true,
    overwrite: true
  })
}

module.exports = Cookie