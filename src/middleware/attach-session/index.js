'use strict';

// attachSession() will search for a session matching the `Authorization`
// request header, which should be in the format `Token abc123xyz`.
//
// If one exists, the userId will be attached as `this.state.userId`

const SessionsDAO = require('../../dao/sessions');

function* attachSession(next) {
  const headerMatches = /^Token (.+)$/.exec(this.headers.authorization);

  const token = (headerMatches && headerMatches[1]) || this.query.token;

  let session;

  if (token) {
    session = yield SessionsDAO.findById(token);
  }

  Object.assign(this.state, {
    token,
    role: session && session.role,
    userId: session && session.userId
  });

  yield next;
}

module.exports = attachSession;
