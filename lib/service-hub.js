const { Disposable } = require("@lumine-code/event-kit");
const { Range, SemVer } = require("semver");

class Registration {
  constructor(provider, consumer, disposable) {
    this.provider = provider;
    this.consumer = consumer;
    this.disposable = disposable;
    this.disposed = false;
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;
    this.provider.registrations.delete(this);
    this.consumer.registrations.delete(this);
    this.disposable?.dispose();
  }
}

class Consumer {
  constructor(keyPath, versionRange, callback) {
    this.keyPath = keyPath;
    this.callback = callback;
    this.versionRange = new Range(versionRange);
    this.registrations = new Set();
    this.isDestroyed = false;
    this.isSatisfied = false;
  }

  destroy() {
    this.isDestroyed = true;
    for (const registration of [...this.registrations]) registration.dispose();
  }
}

class Provider {
  constructor(keyPath, servicesByVersion) {
    this.keyPath = keyPath;
    this.registrations = new Set();
    this.servicesByVersion = {};
    this.versions = [];

    for (const version in servicesByVersion) {
      this.servicesByVersion[version] = servicesByVersion[version];
      this.versions.push(new SemVer(version));
    }
    this.versions.sort((left, right) => right.compare(left));
  }

  provide(consumer) {
    if (consumer.keyPath !== this.keyPath) return;

    let versionMatched = false;
    for (const version of this.versions) {
      if (!consumer.versionRange.test(version)) continue;

      versionMatched = true;
      const service = this.servicesByVersion[version.toString()];
      if (service == null) continue;

      consumer.isSatisfied = true;
      const disposable = consumer.callback.call(null, service);
      if (typeof disposable?.dispose === "function") {
        const registration = new Registration(this, consumer, disposable);
        this.registrations.add(registration);
        consumer.registrations.add(registration);
      }
      return;
    }

    if (versionMatched) {
      console.warn(
        `Service "${this.keyPath}" matched ${consumer.versionRange.raw} but its provider ` +
          "supplied no service object; nothing was delivered",
      );
    } else {
      console.warn(
        `Service "${this.keyPath}" is provided at ${this.versions.join(", ")} ` +
          `but consumed at ${consumer.versionRange.raw}; nothing was delivered`,
      );
    }
  }

  destroy() {
    for (const registration of [...this.registrations]) registration.dispose();
  }
}

class ServiceHub {
  constructor() {
    this.consumers = [];
    this.providers = [];
  }

  provide(keyPath, version, service) {
    let servicesByVersion;
    if (service != null) {
      servicesByVersion = { [version]: service };
    } else {
      servicesByVersion = version;
    }

    const provider = new Provider(keyPath, servicesByVersion);
    this.providers.push(provider);
    for (const consumer of this.consumers.slice()) {
      if (!consumer.isDestroyed) provider.provide(consumer);
    }

    return new Disposable(() => {
      provider.destroy();
      const index = this.providers.indexOf(provider);
      if (index >= 0) this.providers.splice(index, 1);
    });
  }

  consume(keyPath, versionRange, callback) {
    const consumer = new Consumer(keyPath, versionRange, callback);
    this.consumers.push(consumer);
    for (const provider of this.providers.slice()) provider.provide(consumer);

    return new Disposable(() => {
      consumer.destroy();
      const index = this.consumers.indexOf(consumer);
      if (index >= 0) this.consumers.splice(index, 1);
    });
  }

  unmatchedConsumers() {
    return this.consumers
      .filter((consumer) => !consumer.isSatisfied && !consumer.isDestroyed)
      .map((consumer) => ({
        keyPath: consumer.keyPath,
        versionRange: consumer.versionRange.raw,
      }));
  }

  clear() {
    for (const provider of this.providers.slice()) provider.destroy();
    for (const consumer of this.consumers.slice()) consumer.destroy();
    this.providers = [];
    this.consumers = [];
  }
}

module.exports = ServiceHub;
