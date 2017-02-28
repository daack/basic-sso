'use strict'

const btoa = require('btoa')
const querystring = require('querystring')

function Client(crypter, opts) {
  if (!(this instanceof Client)) {
    return new Client(crypter, opts)
  }

  this.app = btoa(opts.app)
  this.verify = opts.verify
  this.server = opts.server
  this.secure = opts.secure || false

  this.crypter = crypter
}

Client.prototype.logIn = function(res) {
  const query = {
    app: this.app
  }

  if (this.verify) {
    query['verify'] = this.verify
  }

  if (this.secure) {
    query['public_key'] = this.crypter.getPublicKey()
  }

  res.redirect(this.server + '?' + querystring.stringify(query))
}

Client.prototype.user = function() {
  return (req, res, next) => {
    const query = req.query || {}

    req.user = null

    if (!query.user) {
      return next()
    }

    if (query.verify && query.verify != this.verify) {
      return next()
    }

    req.user = this.crypter.decrypt(query.user, query.public_key)

    next()
  }
}

module.exports = Client