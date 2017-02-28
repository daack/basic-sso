'use strict'

const http = require('http')
const url = require('url')
const querystring = require('querystring')
const btoa = require('btoa')
const request = require('request')

function Client(crypter, opts) {
  if (!(this instanceof Client)) {
    return new Client(crypter, opts)
  }

  this.app = btoa(opts.app)
  this.verify = opts.verify
  this.server = opts.server
  this.serverPublicKey = null

  this.crypter = crypter

  this.registration(opts)
}

Client.prototype.registration = function(opts) {
  request.post({
    url: url.format({
      protocol: this.server.protocol || 'http:',
      hostname: this.server.host,
      port: this.server.port || 80,
      pathname: this.server.register
    }),
    form: {
      sign: this.crypter.encrypt(opts.app),
      public_key: this.crypter.getPublicKey()
    }
  }, (err, httpResponse, body) => {
    if (!err && httpResponse.statusCode == 200) {
      this.setServerPublicKey(JSON.parse(body).public_key)
    }
  })
}

Client.prototype.logIn = function(res) {
  const query = {
    app: this.app
  }

  if (this.verify) {
    query['verify'] = this.verify
  }

  res.redirect(url.format({
    protocol: this.server.protocol || 'http:',
    hostname: this.server.host,
    port: this.server.port || 80,
    pathname: this.server.auth,
    search: querystring.stringify(query)
  }))
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

    req.user = this.crypter.decrypt(query.user, this.serverPublicKey)

    next()
  }
}

Client.prototype.setServerPublicKey = function(key) {
  this.serverPublicKey = key
}

module.exports = Client