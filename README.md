# @lumine-code/service-hub

Provides semantically versioned service registration and consumption.

## Features

- **Version negotiation**: connects consumers only to providers with compatible semantic versions.
- **Multiple APIs**: allows providers to expose compatibility shims for several service versions.
- **Disposable lifecycles**: unregisters providers and consumers without changing service behavior.

## Installation

```sh
npm install @lumine-code/service-hub
```

## Usage

The `order-pizza` library wants to provide a global service for use by other
modules in the application. It calls provide on a global `ServiceHub` instance
with the name of the service and the current semantic version of the API:

```js
// Provider
global.services.provide('order-pizza', '1.0.0', {
  placeOrder(size, topping) { /* ... */ }
})
```

Then two other libraries *consume* this service, ensuring they are compatible
with its API by specifying a version range:

```js
// Consumer 1
function workingLate() {
  global.services.consume('order-pizza', '^1.0.0', orderPizza => {
    orderPizza.placeOrder('medium', 'four cheese')
  })
}

// Consumer 2
function burntDinner() {
  global.services.consume('order-pizza', '^1.0.0', orderPizza => {
    orderPizza.placeOrder('large', 'pepperoni')
  })
}
```

Now the author of the `order-pizza` makes a breaking change to the API. They
start providing another instance of the service associated with the next major
version number, converting the old service to a shim for compatibility:

```js
// Provider
const placeOrder = ({size, toppings}) => { /* ... */ }

// Providing the new API
global.services.provide('order-pizza', '2.0.0', {placeOrder})

// Shimming the old API
global.services.provide('order-pizza', '1.0.0', {
  placeOrder(size, topping) {
    return placeOrder({size, toppings: [topping]})
  }
})
```

If at some point the API changed so drastically that it wasn't possible to shim
previous versions, at least the outdated consumers wouldn't use the new API
incorrectly. They would just fail to discover the service.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
