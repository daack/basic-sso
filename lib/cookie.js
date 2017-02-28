'use strict'

const Cookies = require('cookies')
const Keygrip = require('keygrip')

function Cookie(req, res, opts) {
  if (!(this instanceof Cookie)) {
    return new Cookie(req, res, opts)
  }

  this.opts = opts
  this.crypter = opts.crypter
  this.cookies = new Cookies(req, res, {
    keys: new Keygrip(opts.keylist)
  })
}

Cookie.prototype.get = function(key) {
  const value = this.cookies.get(key, {
    signed: true
  })

  return value ? this.crypter.decrypt(value) : value
}

Cookie.prototype.set = function(key, value) {
  value = this.crypter.encrypt(value)

  this.cookies.set(key, value, {
    signed: true,
    overwrite: true
  })
}

module.exports = Cookie