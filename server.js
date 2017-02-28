'use strict'

const atob = require('atob')
const querystring = require('querystring')
const Cookie = require('./lib/cookie')

function Server(crypter, opts) {
  if (!(this instanceof Server)) {
    return new Server(crypter, opts)
  }

  this.opts = opts

  this.cookie_name = opts.cookie.name || 'sso_signed'
  this.loginPath = opts.loginPath || '/login'

  this.apps = {}
  this.strategies = {}

  this.serializer = () => { throw new Error('serializeUser not defined') }
  this.deserializer = () => { throw new Error('deserializeUser not defined') }
  this.authorizator = () => { throw new Error('authorizeUser not defined') }

  this.crypter = crypter
}

Server.prototype.cookieParser = function() {
  return (req, res, next) => {
    this.cookie = Cookie(req, res, {
      crypter: this.crypter,
      keylist: this.opts.cookie.keylist
    })
    next()
  }
}

Server.prototype.authenticate = function() {
  return (req, res, next) => {
    const query = req.query || {}

    if (!query.app) {
      return res.redirect('back')
    }

    const app = atob(decodeURIComponent(query.app))

    this.getAuthenticatedUser(app, (err, user) => {
      if (err) return res.redirect(this.loginPath + '?' + querystring.stringify(query))

      this.send(res, {
        app: app,
        user: user,
        params: query
      })
    })
  }
}

Server.prototype.logIn = function(strategy, opts) {
  const authenticator = this.strategies[strategy]

  if (!authenticator) {
    throw new Error('Missing ' + strategy + ' strategy')
  }

  opts = opts || {}

  return (req, res, next) => {
    const body = req.body || {}
    const app = atob(decodeURIComponent(body.app))

    const username = body[opts.usernameField || 'username']
    const password = body[opts.passwordField || 'password']

    authenticator.call(this, username, password, (err, user) => {
      if (err || !user) {
        return res.redirect('back')
      }

      this.serializer.call(this, user, (err, serialized) => {
        if (err) return next(err)

        this.cookie.set(this.cookie_name, serialized)

        this.authorizator.call(this, user, app, (err, user) => {
          this.send(res, {
            app: app,
            user: user,
            params: body
          })
        })
      })
    })
  }
}

Server.prototype.add = function(app, info) {
  if (typeof app != 'object') {
    let tmp = {}
    tmp[app] = info
    app = tmp
  }

  for (var app_name in app) {
    let info = app[app_name]

    if (typeof info != 'object' || !info.redirect) {
      throw new Error('Configuration missing for app: ' + app_name)
    }

    this.apps[app_name] = info
  }

  return this
}

Server.prototype.use = function(strategy, cb) {
  this.strategies[strategy] = cb

  return this
}

Server.prototype.serializeUser = function(cb) {
  this.serializer = cb

  return this
}

Server.prototype.deserializeUser = function(cb) {
  this.deserializer = cb

  return this
}

Server.prototype.authorizeUser = function(cb) {
  this.authorizator = cb

  return this
}

Server.prototype.getAuthenticatedUser = function(app, cb) {
  this.getLoggedUser((err, user) => {
    if (err) return cb(err)

    if (!user) return cb(new Error('User not found'))

    this.authorizator.call(this, user, app, cb)
  })
}

Server.prototype.getLoggedUser = function(cb) {
  const cookie_value = this.cookie.get(this.cookie_name)

  if (!cookie_value) {
    return cb(null, null);
  }

  this.deserializer.call(this, cookie_value, cb)
}

Server.prototype.send = function(res, opts) {
  const info = this.apps[opts.app]

  if (!info) return res.redirect('back')
  if (!opts.user) return res.redirect(info.redirect)

  let serialized_user = null

  try {
    serialized_user = JSON.stringify(opts.user)
  } catch(err) {
    return res.redirect(info.redirect)
  }

  let query = {
    verify: opts.params.verify || ''
  }

  if (opts.params.public_key) {
    query['user'] = this.crypter.encrypt(serialized_user, decodeURIComponent(opts.params.public_key))
    query['public_key'] = this.crypter.getPublicKey()
  } else {
    query['user'] = this.crypter.encrypt(serialized_user)
  }

  res.redirect(info.redirect + '?' + querystring.stringify(query))
}

module.exports = Server