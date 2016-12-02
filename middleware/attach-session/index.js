'use strict';

// attachSession() will search for a session matching the `Authorization`
// request header, which should be in the format `Token abc123xyz`.
//
// If one exists, the userId will be attached as `this.state.userId`

const SessionsDAO = require('../../dao/sessions');

function* attachSession(next) {
  const headerMatches = (/^Token (.+)$/).exec(this.headers.authorization);

  let session;

  if (headerMatches) {
    session = yield SessionsDAO.findById(headerMatches[1]);
  }

  Object.assign(this.state, {
    userId: session && session.userId
  });

  yield next;
}

module.exports = attachSession;
