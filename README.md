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
const sso = Sso('secret_shared_key')

const server = sso.server({
  loginPath: 'login',
  cookie: {
    keylist: ['key1', 'key2']
  }
})

app.use(server.cookieParser())

server.add('test_app', {
  redirect: 'http://foo.bar'
})

server.use('auth', (username, password, done) => {
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
app.get('/auth', server.authenticate());
// Endpoint to login user
app.post('/login', server.logIn('auth'));
```

### Client
```javascript
const app = require('express')()
const sso = Sso('secret_shared_key')

const client = sso.client({
  app: 'test',
  verify: 'verify',
  server: 'server_url',
  secure: true
})

app.get('/login', (req, res) => {
  client.logIn(res)
});

app.get('/return', client.user(), (req, res) => {
  console.log(req.user)
});
```