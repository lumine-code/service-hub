var Disposable, ServiceHub;

({Disposable} = require('event-kit'));

ServiceHub = require('../lib/service-hub');

describe("ServiceHub", function() {
  var hub;
  hub = null;
  beforeEach(function() {
    return hub = new ServiceHub();
  });
  describe("::consume(keyPath, versionString, callback)", function() {
    it("invokes the callback with each existing service that matches the key path and version range", function() {
      var services;
      services = [];
      hub.provide("a", "1.0.0", {
        w: 1
      });
      hub.provide("b", "1.0.0", {
        x: 2
      });
      hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      expect(services).toEqual([
        {
          w: 1
        }
      ]);
      hub.provide("a", "1.1.0", {
        y: 3
      });
      hub.provide("b", "1.2.0", {
        z: 4
      });
      return expect(services).toEqual([
        {
          w: 1
        },
        {
          y: 3
        }
      ]);
    });
    it("invokes the callback with the newest version of a service provided in a given batch", function() {
      var services;
      hub.provide("a", {
        "1.0.0": {
          w: 1
        },
        "1.1.0": {
          x: 2
        }
      });
      hub.provide("a", {
        "1.2.0": {
          y: 3
        }
      });
      hub.provide("b", {
        "1.0.0": {
          z: 4
        }
      });
      services = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      return expect(services).toEqual([
        {
          x: 2
        },
        {
          y: 3
        }
      ]);
    });
    it("invokes the callback when a new service is provided that matches the key path and version range", function() {
      var services;
      services = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      expect(services).toEqual([]);
      hub.provide("a", "1.0.0", {
        x: 1
      });
      hub.provide("a", "1.1.0", {
        y: 2
      });
      hub.provide("b", "1.0.0", {
        z: 3
      });
      return expect(services).toEqual([
        {
          x: 1
        },
        {
          y: 2
        }
      ]);
    });
    it("does not invoke the callback for incompatible service versions", function() {
      var services;
      services = [];
      hub.provide("a", "1.9.0", {
        x: 1
      });
      hub.consume("a", "^2.0.0", function(service) {
        return services.push(service);
      });
      hub.provide("a", "3.0.0", {
        y: 2
      });
      return expect(services).toEqual([]);
    });
    it("selects the newest version in a batch that satisfies the consumer", function() {
      var services;
      hub.provide("a", {
        "1.5.0": {
          w: 1
        },
        "1.9.0": {
          x: 2
        },
        "2.0.0": {
          y: 3
        }
      });
      services = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      return expect(services).toEqual([
        {
          x: 2
        }
      ]);
    });
    it("can specify a key path that navigates into the contents of a service", function() {
      var services;
      hub.provide("a", "1.0.0", {
        b: {
          c: 1
        }
      });
      hub.provide("a", "1.0.0", {
        d: {
          e: 2
        }
      });
      services = [];
      hub.consume("a.b", "^1.0.0", function(service) {
        return services.push(service);
      });
      return expect(services).toEqual([
        {
          c: 1
        }
      ]);
    });
    it("can specify a key path that's shorter than the key path passed to ::provide", function() {
      var services;
      hub.provide("a.b", "1.0.0", {
        c: 1
      });
      hub.provide("a.d", "1.0.0", {
        e: 2
      });
      services = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      return expect(services).toEqual([
        {
          b: {
            c: 1
          }
        },
        {
          d: {
            e: 2
          }
        }
      ]);
    });
    it("supports escaped dots in service key paths", function() {
      var service, services;
      service = {
        value: 1
      };
      hub.provide("a\\.b.c", "1.0.0", service);
      services = [];
      hub.consume("a\\.b", "^1.0.0", function(provided) {
        return services.push(provided);
      });
      return expect(services).toEqual([
        {
          c: service
        }
      ]);
    });
    return it("invokes callbacks with only the selected service", function() {
      var callbackArguments, service;
      callbackArguments = null;
      service = {
        value: 1
      };
      hub.provide("a", "1.0.0", service);
      hub.consume("a", "^1.0.0", function() {
        return callbackArguments = arguments;
      });
      return expect(Array.from(callbackArguments)).toEqual([service]);
    });
  });
  describe("disposing of a consumer", function() {
    it("does not invoke the consumer callback for any newly-added providers", function() {
      var disposable, services;
      services = [];
      disposable = hub.consume("a", "^1.0.0", function(service) {
        return services.push(service);
      });
      hub.provide("a", "1.0.0", {
        x: 1
      });
      disposable.dispose();
      hub.provide("a", "1.0.1", {
        y: 2
      });
      return expect(services).toEqual([
        {
          x: 1
        }
      ]);
    });
    return it("can be performed repeatedly without affecting other consumers", function() {
      var disposable, firstServices, secondServices;
      firstServices = [];
      secondServices = [];
      disposable = hub.consume("a", "^1.0.0", function(service) {
        return firstServices.push(service);
      });
      hub.consume("a", "^1.0.0", function(service) {
        return secondServices.push(service);
      });
      disposable.dispose();
      disposable.dispose();
      hub.provide("a", "1.0.0", {
        x: 1
      });
      expect(firstServices).toEqual([]);
      return expect(secondServices).toEqual([
        {
          x: 1
        }
      ]);
    });
  });
  describe("disposing of a provider", function() {
    it("does not invoke the callbacks of any newly-added consumers", function() {
      var disposable1, disposable2, services1, services2;
      disposable1 = hub.provide("a", "1.0.0", {
        x: 1
      });
      disposable2 = hub.provide("a", "1.1.0", {
        y: 2
      });
      services1 = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services1.push(service);
      });
      disposable1.dispose();
      services2 = [];
      hub.consume("a", "^1.0.0", function(service) {
        return services2.push(service);
      });
      expect(services1).toEqual([
        {
          x: 1
        },
        {
          y: 2
        }
      ]);
      return expect(services2).toEqual([
        {
          y: 2
        }
      ]);
    });
    return it("disposes of consumer Disposables", function() {
      var provideDisposable, teardownConsumerSpy1, teardownConsumerSpy2;
      provideDisposable = hub.provide("a", "1.0.0", {
        x: 1
      });
      teardownConsumerSpy1 = jasmine.createSpy('teardownConsumer1');
      teardownConsumerSpy2 = jasmine.createSpy('teardownConsumer2');
      hub.consume("a", "^1.0.0", function(service) {
        return new Disposable(teardownConsumerSpy1);
      });
      hub.consume("a", "^1.0.0", function(service) {
        return new Disposable(teardownConsumerSpy2);
      });
      provideDisposable.dispose();
      expect(teardownConsumerSpy1).toHaveBeenCalled();
      return expect(teardownConsumerSpy2).toHaveBeenCalled();
    });
  });
  return describe("::clear()", function() {
    return it("removes all providers and consumers, disposing of consumers' disposables", function() {
      var consumeSpy, teardownConsumer1Spy, teardownConsumer2Spy;
      hub.provide("a", "1.0.0", {
        w: 1
      });
      hub.provide("b", "1.0.0", {
        x: 2
      });
      consumeSpy = jasmine.createSpy('consume');
      teardownConsumer1Spy = jasmine.createSpy('teardownConsumer1');
      teardownConsumer2Spy = jasmine.createSpy('teardownConsumer2');
      hub.consume("a", "^1.0.0", function(service) {
        return new Disposable(teardownConsumer1Spy);
      });
      hub.consume("b", "^1.0.0", function(service) {
        return new Disposable(teardownConsumer2Spy);
      });
      hub.clear();
      expect(teardownConsumer1Spy).toHaveBeenCalled();
      expect(teardownConsumer2Spy).toHaveBeenCalled();
      hub.consume("a", "^1.0.0", consumeSpy);
      return expect(consumeSpy).not.toHaveBeenCalled();
    });
  });
});
