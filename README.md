# service-hub

Connects versioned services between independently activated packages.

ServiceHub lets packages collaborate without importing one another. Providers publish versioned service objects, consumers request compatible ranges, and disposable registrations keep both sides aligned with package activation and teardown.

> [!WARNING]
> **This package is deprecated.** [Lumine](https://github.com/lumine-code/lumine) no longer depends on it — the test harness unified on Jasmine 6 and modern Node.js, so this Jasmine 1 compatibility runner is unnecessary. This repository is archived and no longer maintained.

## Features

- **Order-independent registration**: connects providers and consumers regardless of which side registers first.
- **Semantic versions**: delivers the highest provided version satisfying each consumer's range.
- **Multiple providers**: delivers every matching provider independently to a consumer.
- **Lifecycle cleanup**: disposes a consumer's returned registration exactly once when either side goes away.
- **Diagnostics**: warns about incompatible versions or empty providers and reports consumers that have never matched.
- **Dual modules**: keeps CommonJS as the default API and provides a native ECMAScript module entry.

## Installation

```sh
npm install @lumine-code/service-hub
```

## Usage

```js
const ServiceHub = require("@lumine-code/service-hub");

const hub = new ServiceHub();
const source = { format: "example" };
const provider = hub.provide("model-reader.provider", "1.0.0", {
  read(source) {
    return source;
  },
});

const consumer = hub.consume("model-reader.provider", "^1.0.0", (reader) => {
  const model = reader.read(source);
  return { dispose() {} };
});

consumer.dispose();
provider.dispose();
```

Native ECMAScript modules can import the same class:

```js
import ServiceHub, {
  ServiceHub as NamedServiceHub,
} from "@lumine-code/service-hub";
```

## API

### `new ServiceHub()`

Creates an isolated registry of providers and consumers.

### `provide(name, version, service)`

Publishes one service version and returns a disposable that removes it. Pass an object mapping exact versions to service objects instead of `version` and omit `service` to publish several API versions from one provider.

### `consume(name, versionRange, callback)`

Calls `callback` once for every current and future matching provider and returns a disposable that removes the consumer. If the callback returns an object with `dispose()`, ServiceHub calls it exactly once when either the provider or consumer is removed.

### `unmatchedConsumers()`

Returns `{keyPath, versionRange}` records for active consumers that no provider has ever satisfied. This is an explicit diagnostic because a provider may still arrive through lazy package activation.

### `clear()`

Removes every provider and consumer and disposes all active consumer registrations.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
