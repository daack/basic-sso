'use strict'

const Cookies = require('cookies')
const Keygrip = require('keygrip')

function Cookie(crypter, domain, opts) {
  if (!(this instanceof Cookie)) {
    return new Cookie(crypter, domain, opts)
  }

  this.crypter = crypter
  this.key = opts.name || 'sso_signed'
  this.secret = opts.secret
  this.keygrip = new Keygrip(opts.keylist)

  this.opts = Object.assign({
    signed: true,
    overwrite: true,
    domain: domain
  }, opts)

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

  this.cookies.set(this.key, value, this.opts)
}

Cookie.prototype.delete = function() {
  this.cookies.set(this.key, null, {
    expires: new Date(0)
  })
}

module.exports = Cookie