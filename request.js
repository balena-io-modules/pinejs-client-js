// Generated by CoffeeScript 1.11.1
(function() {
  var BluebirdLRU, PinejsClientCore, PinejsClientRequest, Promise, StatusError, TypedError, _, request, validParams,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require('lodash');

  request = require('request');

  Promise = require('bluebird');

  PinejsClientCore = require('./core');

  BluebirdLRU = require('bluebird-lru-cache');

  TypedError = require('typed-error');

  request = Promise.promisify(request, {
    multiArgs: true
  });

  StatusError = (function(superClass) {
    extend(StatusError, superClass);

    function StatusError(message, statusCode) {
      this.message = message;
      this.statusCode = statusCode;
      StatusError.__super__.constructor.call(this, this.message);
    }

    return StatusError;

  })(TypedError);

  validParams = ['cache'];

  module.exports = PinejsClientRequest = (function(superClass) {
    extend(PinejsClientRequest, superClass);

    function PinejsClientRequest(params, backendParams) {
      var i, len, validParam;
      PinejsClientRequest.__super__.constructor.call(this, params);
      this.backendParams = {};
      if (_.isObject(backendParams)) {
        for (i = 0, len = validParams.length; i < len; i++) {
          validParam = validParams[i];
          if (backendParams[validParam] != null) {
            this.backendParams[validParam] = backendParams[validParam];
          }
        }
      }
      if (this.backendParams.cache != null) {
        this.cache = BluebirdLRU(this.backendParams.cache);
      }
    }

    PinejsClientRequest.prototype._request = function(params) {
      if (params.gzip == null) {
        params.gzip = true;
      }
      if (params.timeout == null) {
        params.timeout = 30000;
      }
      if (params.strictSSL == null) {
        params.strictSSL = true;
      }
      params.json = true;
      if ((this.cache != null) && params.method === 'GET') {
        return this.cache.get(params.url).then(function(cached) {
          if (params.headers == null) {
            params.headers = {};
          }
          params.headers['If-None-Match'] = cached.etag;
          return request(params).spread(function(response, body) {
            var ref;
            if (response.statusCode === 304) {
              return cached;
            }
            if ((200 <= (ref = response.statusCode) && ref < 300)) {
              return {
                etag: response.headers.etag,
                body: body
              };
            }
            throw new StatusError(body, response.statusCode);
          });
        })["catch"](BluebirdLRU.NoSuchKeyError, function() {
          return request(params).spread(function(response, body) {
            var ref;
            if ((200 <= (ref = response.statusCode) && ref < 300)) {
              return {
                etag: response.headers.etag,
                body: body
              };
            }
            throw new StatusError(body, response.statusCode);
          });
        }).then((function(_this) {
          return function(cached) {
            _this.cache.set(params.url, cached);
            return _.cloneDeep(cached.body);
          };
        })(this));
      } else {
        return request(params).spread(function(response, body) {
          var ref;
          if ((200 <= (ref = response.statusCode) && ref < 300)) {
            return body;
          }
          throw new StatusError(body, response.statusCode);
        });
      }
    };

    return PinejsClientRequest;

  })(PinejsClientCore(_, Promise));

}).call(this);
