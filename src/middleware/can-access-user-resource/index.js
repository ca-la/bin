"use strict";

const User = require("../../components/users/domain-object");

// A simple psuedo-middleware for determining if a user is either the owner of a
// resource, or an admin who can access something anyway.
//
// Sample usage:
//
// function* getPaymentMethods() {
//   const { userId } = this.query; //
//   this.assert(userId, 400, 'User ID must be provided'); //
//   canAccessUserResource.call(this, userId); //
// }
function canAccessUserResource(ownerUserId) {
  if (!ownerUserId) {
    throw new Error("Must pass ownerUserId to canAccessUserResource");
  }

  const isAdmin = this.state.role === User.ROLES.admin;
  const isUserOrAdmin = isAdmin || ownerUserId === this.state.userId;
  this.assert(isUserOrAdmin, 403);
}

module.exports = canAccessUserResource;
