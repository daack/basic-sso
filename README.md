# Basic SSO :unlock:

Basic authentication mechanism for Single sign-on

* [Install](#install)
* [Example](#example)

<a name="install"></a>

## Install

To install basic-sso, simply use npm:

```
npm install basic-sso --save
```

<a name="example"></a>

## Example

### Server

```javascript
const app = require('express')()
const Sso = require('basic-sso')

const sso = Sso('server_unique_app_name', {
	prime: 'diffie_hellman_prime',
	listen: 8001 // port for key exchange
})

const server = sso.server({
	cookie: {
		secret: 'password',
		keylist: ['foo', 'bar'],
		name: 'sso_signed',
		secure: false,
		httpOnly: true
	}
})

server.addApp('client', {
	redirect: 'http://127.0.0.1:3000/landing'
})

server.strategy('strategy', (username, password, done) => {
  const user = User.findByUsername(username)

  // Compare password

  done(null, user)
})

server.authorizeUser((user, app, done) => {
  // if user can access this app

  done(null, {
    // user info to return to client
  })
})

server.serializeUser((user, done) => {
  // What to put in the cookie
  done(null, user.id)
})

server.deserializeUser((id, done) => {
  // Retrive user from cookie
  const user = User.findById(id)
  done(null, user)
})

// Endpoint to authenticate user
app.get('/auth', server.authenticate(), (req, res, next) => {
	// render login page
})
// Endpoint to login user
app.post('/login', server.logIn('strategy'))
```

### Client

```javascript
const app = require('express')()
const Sso = require('basic-sso')

const sso = Sso('client_unique_app_name', {
	prime: 'diffie_hellman_prime',
	listen: 8002 // port for key exchange
})

const client = sso.client({
	verify: 'verify',
	server: {
		name: 'server',
		host: '127.0.0.1',
		port: 3000,
		dh_port: 8001,
		auth_path: '/auth'
	}
})

app.get('/login', (req, res) => {
	client.redirectLogIn(res)
})

app.get('/landing', client.landing(), (req, res) => {
	console.log(req.user)
})
```
