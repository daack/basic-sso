'use strict'

const atob = require('atob')
const querystring = require('querystring')

const Cookie = require('./lib/cookie')

function Server(dhke, opts) {
  if (!(this instanceof Server)) {
    return new Server(dhke, opts)
  }

  this.dhke = dhke
  this.cookie = Cookie(this.dhke.crypter, opts.cookie)

  this.strategies = {}
  this.apps = {}

  this.serializer = () => { throw new Error('serializeUser not defined') }
  this.deserializer = () => { throw new Error('deserializeUser not defined') }
  this.authorizator = (user, app, done) => {
    done(null, user)
  }
}

Server.prototype.authenticate = function() {
  return (req, res, next) => {
    this.cookie.initializeRequest(req, res)

    const query = req.query || {}

    if (!query.app) {
      return res.redirect('back')
    }

    const app = atob(decodeURIComponent(query.app))

    this.getAuthenticatedUser(app, (err, user) => {
      if (err || !user) {
        return next()
      }

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
    this.cookie.initializeRequest(req, res)

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

        this.authorizator.call(this, user, app, (err, user) => {
          if (err) return next(err)

          this.cookie.set(serialized)

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

Server.prototype.logOut = function(redirect) {
  return (req, res, next) => {
    this.cookie.delete()

    if (redirect) {
      return res.redirect(redirect)
    }

    next()
  }
}

Server.prototype.addApp = function(app, info) {
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

Server.prototype.strategy = function(strategy, cb) {
  this.strategies[strategy] = cb

  return this
}

Server.prototype.authorizeUser = function(cb) {
  this.authorizator = cb

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

Server.prototype.getAuthenticatedUser = function(app, cb) {
  this.getLoggedUser((err, user) => {
    if (err || !user) return cb(new Error('User not logged'))

    this.authorizator.call(this, user, app, cb)
  })
}

Server.prototype.getLoggedUser = function(cb) {
  const cookie_value = this.cookie.get()

  if (!cookie_value) {
    return cb(null, null);
  }

  try {
    this.deserializer.call(this, cookie_value, cb)
  } catch(err) {
    cb(err)
  }
}

Server.prototype.send = function(res, opts) {
  const info = this.apps[opts.app]

  if (!info) return res.redirect('back')

  const query = {
    verify: opts.params.verify || '',
    user: this.dhke.encrypt(opts.app, JSON.stringify(opts.user))
  }

  res.redirect(info.redirect + '?' + querystring.stringify(query))
}

module.exports = Server