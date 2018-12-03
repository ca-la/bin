'use strict';

const DesignEventsDAO = require('../../dao/design-events');
const NotificationsService = require('../../services/create-notifications');
const User = require('../../domain-objects/user');

function isAllowedEventType(role, event) {
  if (!event || (event && !event.type)) {
    return false;
  }

  const DESIGNER_ALLOWED_EVENT_TYPES = [
    'SUBMIT_DESIGN',
    'COMMIT_QUOTE'
  ];
  const PARTNER_ALLOWED_EVENT_TYPES = [
    'ACCEPT_SERVICE_BID',
    'REJECT_SERVICE_BID'
  ];
  const ADMIN_ALLOWED_EVENT_TYPES = [
    ...DESIGNER_ALLOWED_EVENT_TYPES,
    ...PARTNER_ALLOWED_EVENT_TYPES,
    'BID_DESIGN',
    'REJECT_DESIGN',
    'COMMIT_COST_INPUTS',
    'REMOVE_PARTNER'
  ];

  const isAdmin = role === User.ROLES.admin;
  const isPartner = role === User.ROLES.partner;
  let allowedTypes = DESIGNER_ALLOWED_EVENT_TYPES;

  if (isPartner) {
    allowedTypes = PARTNER_ALLOWED_EVENT_TYPES;
  }

  if (isAdmin) {
    allowedTypes = ADMIN_ALLOWED_EVENT_TYPES;
  }

  return allowedTypes.includes(event.type);
}

function* addDesignEvent() {
  const { body: designEvent } = this.request;
  this.assert(isAllowedEventType(this.state.role, designEvent), 403);
  this.assert(
    designEvent.id === this.params.eventId,
    400,
    'ID in route does not match ID in request body'
  );

  const eventData = {
    ...designEvent,
    actorId: this.state.userId,
    designId: this.params.designId
  };

  const added = yield DesignEventsDAO.create(eventData);

  if (added.type === 'ACCEPT_SERVICE_BID') {
    NotificationsService.sendPartnerAcceptServiceBidNotification(
      this.params.designId,
      this.state.userId
    );
  } else if (added.type === 'REJECT_SERVICE_BID') {
    NotificationsService.sendPartnerRejectServiceBidNotification(
      this.params.designId,
      this.state.userId
    );
  }

  this.body = added;
  this.status = 200;
}

function* addDesignEvents() {
  const { body: designEvents } = this.request;
  this.assert(
    designEvents.every(isAllowedEventType.bind(null, this.state.role)),
    403
  );

  const eventData = designEvents.map(event => ({
    ...event,
    actorId: this.state.userId,
    designId: this.params.designId
  }));

  const added = yield DesignEventsDAO.createAll(eventData);

  this.body = added;
  this.status = 200;
}

function* getDesignEvents() {
  const events = yield DesignEventsDAO.findByDesignId(this.params.designId);

  this.body = events;
  this.status = 200;
}

module.exports = {
  addDesignEvent,
  addDesignEvents,
  getDesignEvents
};
