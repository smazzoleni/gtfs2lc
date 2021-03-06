/**
 * Pieter Colpaert © Ghent University - iMinds 
 * Combines connection rules, trips and services to an unsorted stream of connections
 */

const { format } = require('date-fns');
const uri_templates = require('uri-templates');

var URIStrategy = function (baseUris) {
  var defaultBaseUris = {
    stop: 'http://example.org/stops/{stop_id}',
    route: 'http://example.org/routes/{routes.route_id}',
    trip: 'http://example.org/trips/{trips.trip_id}/{trips.startTime(YYYYMMDD)}',
    connection: 'http://example.org/connections/{trips.startTime(YYYYMMDD)}/{connection.departureStop}/{trips.trip_id}'
  };
  if (!baseUris) {
    baseUris = defaultBaseUris;
  } else {
    if (typeof baseUris.stop !== 'string') {
      baseUris.stop = defaultBaseUris.stop;
    }
    if (typeof baseUris.trip !== 'string') {
      baseUris.trip = defaultBaseUris.trip;
    }
    if (typeof baseUris.route !== 'string') {
      baseUris.route = defaultBaseUris.route;
    }
    if (typeof baseUris.connection !== 'string') {
      baseUris.connection = defaultBaseUris.connection;
    }
  }

  this._stopTemplate = uri_templates(baseUris.stop);
  this._routeTemplate = uri_templates(baseUris.route);
  this._tripTemplate = uri_templates(baseUris.trip);
  this._connectionTemplate = uri_templates(baseUris.connection);

};

/**
 * Returns a persistent identifier for a connection
 */
URIStrategy.prototype.getId = function (connection) {
  return resolveURI(this._connectionTemplate, connection);
};

URIStrategy.prototype.getStopId = function (id) {
  return this._stopTemplate.fill({ [this._stopTemplate.varNames[0]]: id });
};

URIStrategy.prototype.getTripId = function (connection) {
  return resolveURI(this._tripTemplate, connection);
}

URIStrategy.prototype.getRouteId = function (connection) {
  return resolveURI(this._routeTemplate, connection);
}

function resolveURI(template, connection) {
  let varNames = template.varNames;
  let fillerObj = {};

  for (let i in varNames) {
    fillerObj[varNames[i]] = resolveValue(varNames[i], connection);
  }

  return template.fill(fillerObj);
}

function resolveValue(param, connection) {
  // GTFS source file and attribute name
  let source = param.split('.')[0];
  let attr = param.split('.')[1];

  // Entity objects to be resolved as needed
  let trip = null;
  let route = null;
  let caldate = null;

  let value = null;

  switch (source) {
    case 'trips':
      trip = connection.trip;
      if (attr.indexOf('startTime') >= 0) {
        let dateformat = attr.match(/\((.*?)\)/)[1];
        value = format(trip.startTime, dateformat);
      } else {
        value = trip[attr];
      }
      break;
    case 'routes':
      route = connection.trip.route;
      value = route[attr];
      break;
    case 'connection':
      if (attr.indexOf('departureTime') >= 0) {
        let dateformat = attr.match(/\((.*?)\)/)[1];
        value = format(connection.departureTime, dateformat);
      } else if (attr.indexOf('arrivalTime') >= 0) {
        let dateformat = attr.match(/\((.*?)\)/)[1];
        value = format(connection.arrivalTime, dateformat);
      } else {
        value = connection[attr];
      }
      break;
  }

  return value;
}

module.exports = URIStrategy;
