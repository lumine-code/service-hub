(function() {
  var Consumer, Disposable, Provider, ServiceHub;

  ({Disposable} = require('event-kit'));

  Consumer = require('./consumer');

  Provider = require('./provider');

  module.exports = ServiceHub = class ServiceHub {
    constructor() {
      this.consumers = [];
      this.providers = [];
    }

    // Public: Provide a service by invoking the callback of all current and future
    // consumers matching the given key path and version range.

    // * `keyPath` A {String} of `.` separated keys indicating the services's
    //   location in the namespace of all services.
    // * `version` A {String} containing a [semantic version](http://semver.org/)
    //   for the service's API.
    // * `service` An object exposing the service API.

    // Returns a {Disposable} on which `.dispose()` can be called to remove the
    // provided service.
    provide(keyPath, version, service) {
      var consumer, i, len, provider, ref, servicesByVersion;
      if (service != null) {
        servicesByVersion = {};
        servicesByVersion[version] = service;
      } else {
        servicesByVersion = version;
      }
      provider = new Provider(keyPath, servicesByVersion);
      this.providers.push(provider);
      ref = this.consumers.slice();
      for (i = 0, len = ref.length; i < len; i++) {
        consumer = ref[i];
        if (!consumer.isDestroyed) {
          provider.provide(consumer);
        }
      }
      return new Disposable(() => {
        var index;
        provider.destroy();
        index = this.providers.indexOf(provider);
        return this.providers.splice(index, 1);
      });
    }

    // Public: Consume a service by invoking the given callback for all current
    // and future provided services matching the given key path and version range.

    // * `keyPath` A {String} of `.` separated keys indicating the services's
    //   location in the namespace of all services.
    // * `versionRange` A {String} containing a [semantic version range](https://www.npmjs.org/doc/misc/semver.html)
    //   that any provided services for the given key path must satisfy.
    // * `callback` A {Function} to be called with current and future matching
    //   service objects.

    // Returns a {Disposable} on which `.dispose()` can be called to remove the
    // consumer.
    consume(keyPath, versionRange, callback) {
      var consumer, i, len, provider, ref;
      consumer = new Consumer(keyPath, versionRange, callback);
      this.consumers.push(consumer);
      ref = this.providers.slice();
      for (i = 0, len = ref.length; i < len; i++) {
        provider = ref[i];
        provider.provide(consumer);
      }
      return new Disposable(() => {
        var index;
        index = this.consumers.indexOf(consumer);
        if (index >= 0) {
          return this.consumers.splice(index, 1);
        }
      });
    }

    // Public: Clear out all service consumers and providers, disposing of any
    // disposables returned by previous consumers.
    clear() {
      var i, len, provider, ref;
      ref = this.providers.slice();
      for (i = 0, len = ref.length; i < len; i++) {
        provider = ref[i];
        provider.destroy();
      }
      this.providers = [];
      return this.consumers = [];
    }

  };

}).call(this);
