module.exports = function serviceHubContract(label, loadServiceHub) {
  describe(label, () => {
    let ServiceHub;
    let hub;

    beforeAll(async () => {
      ServiceHub = await loadServiceHub();
    });

    beforeEach(() => {
      hub = new ServiceHub();
    });

    describe("name matching", () => {
      it("delivers a service to a consumer of the same name", () => {
        const service = { name: "the-service" };
        const consume = jasmine.createSpy("consume");

        hub.provide("status-bar", "1.0.0", service);
        hub.consume("status-bar", "^1.0.0", consume);

        expect(consume.calls.count()).toBe(1);
        expect(consume).toHaveBeenCalledWith(service);
      });

      it("does not deliver to a consumer of a different name", () => {
        const consume = jasmine.createSpy("consume");

        hub.provide("status-bar", "1.0.0", {});
        hub.consume("title-bar", "^1.0.0", consume);

        expect(consume).not.toHaveBeenCalled();
      });

      it("does not treat dotted service names as lookup paths", () => {
        const consumeParent = jasmine.createSpy("consumeParent");
        const consumeChild = jasmine.createSpy("consumeChild");

        hub.provide("linter.provider", "1.0.0", {});
        hub.provide("outline", "1.0.0", {});
        hub.consume("linter", "^1.0.0", consumeParent);
        hub.consume("outline.provider", "^1.0.0", consumeChild);

        expect(consumeParent).not.toHaveBeenCalled();
        expect(consumeChild).not.toHaveBeenCalled();
      });

      it("keeps sibling service names independent", () => {
        const registry = { kind: "registry" };
        const background = { kind: "background" };
        const consumeRegistry = jasmine.createSpy("consumeRegistry");
        const consumeBackground = jasmine.createSpy("consumeBackground");

        hub.provide("busy-signal.registry", "1.0.0", registry);
        hub.provide("busy-signal.background-registry", "1.0.0", background);
        hub.consume("busy-signal.registry", "^1.0.0", consumeRegistry);
        hub.consume(
          "busy-signal.background-registry",
          "^1.0.0",
          consumeBackground,
        );

        expect(consumeRegistry).toHaveBeenCalledOnceWith(registry);
        expect(consumeBackground).toHaveBeenCalledOnceWith(background);
      });

      it("delivers once per matching provider", () => {
        const first = { id: 1 };
        const second = { id: 2 };
        const consume = jasmine.createSpy("consume");

        hub.provide("linter.provider", "1.0.0", first);
        hub.provide("linter.provider", "1.0.0", second);
        hub.consume("linter.provider", "^1.0.0", consume);

        expect(consume.calls.allArgs()).toEqual([[first], [second]]);
      });
    });

    describe("ordering", () => {
      it("delivers when the consumer registers first", () => {
        const service = {};
        const consume = jasmine.createSpy("consume");

        hub.consume("tree-view.roots", "^1.0.0", consume);
        expect(consume).not.toHaveBeenCalled();

        hub.provide("tree-view.roots", "1.0.0", service);
        expect(consume).toHaveBeenCalledOnceWith(service);
      });

      it("delivers when the provider registers first", () => {
        const service = {};
        const consume = jasmine.createSpy("consume");

        hub.provide("tree-view.roots", "1.0.0", service);
        hub.consume("tree-view.roots", "^1.0.0", consume);

        expect(consume).toHaveBeenCalledOnceWith(service);
      });
    });

    describe("versions", () => {
      it("delivers the highest version satisfying the consumer's range", () => {
        const consume = jasmine.createSpy("consume");

        hub.provide("example.service", {
          "1.0.0": "v1",
          "1.2.0": "v1.2",
          "2.0.0": "v2",
        });
        hub.consume("example.service", "^1.0.0", consume);

        expect(consume).toHaveBeenCalledOnceWith("v1.2");
      });

      it("warns when the name matches but versions do not", () => {
        spyOn(console, "warn");
        const consume = jasmine.createSpy("consume");

        hub.provide("example.service", "1.0.0", {});
        hub.consume("example.service", "^2.0.0", consume);

        expect(consume).not.toHaveBeenCalled();
        expect(console.warn.calls.count()).toBe(1);
        expect(console.warn.calls.argsFor(0)[0]).toContain("example.service");
        expect(console.warn.calls.argsFor(0)[0]).toContain("1.0.0");
        expect(console.warn.calls.argsFor(0)[0]).toContain("^2.0.0");
      });

      it("warns when a compatible provider supplies no service object", () => {
        spyOn(console, "warn");
        const consume = jasmine.createSpy("consume");

        hub.provide("example.service", { "1.0.0": null });
        hub.consume("example.service", "^1.0.0", consume);

        expect(consume).not.toHaveBeenCalled();
        expect(console.warn.calls.argsFor(0)[0]).toContain(
          "supplied no service object",
        );
      });

      it("does not warn when a service name has no provider", () => {
        spyOn(console, "warn");

        hub.consume("example.service", "^1.0.0", () => {});

        expect(console.warn).not.toHaveBeenCalled();
      });
    });

    describe("disposal", () => {
      it("stops delivering to a disposed consumer", () => {
        const consume = jasmine.createSpy("consume");

        hub.consume("terminal", "^1.0.0", consume).dispose();
        hub.provide("terminal", "1.0.0", {});

        expect(consume).not.toHaveBeenCalled();
      });

      it("disposes a consumer registration when the provider goes away", () => {
        const dispose = jasmine.createSpy("dispose");

        const providerDisposable = hub.provide("terminal", "1.0.0", {});
        hub.consume("terminal", "^1.0.0", () => ({ dispose }));
        providerDisposable.dispose();

        expect(dispose).toHaveBeenCalledTimes(1);
      });

      it("stops delivering a disposed service to later consumers", () => {
        const consume = jasmine.createSpy("consume");

        hub.provide("terminal", "1.0.0", {}).dispose();
        hub.consume("terminal", "^1.0.0", consume);

        expect(consume).not.toHaveBeenCalled();
      });

      it("disposes a registration when the consumer goes away", () => {
        const dispose = jasmine.createSpy("dispose");

        hub.provide("terminal", "1.0.0", {});
        const consumerDisposable = hub.consume("terminal", "^1.0.0", () => ({
          dispose,
        }));
        consumerDisposable.dispose();

        expect(dispose).toHaveBeenCalledTimes(1);
      });

      it("disposes a registration once when both sides go away", () => {
        const dispose = jasmine.createSpy("dispose");

        const providerDisposable = hub.provide("terminal", "1.0.0", {});
        const consumerDisposable = hub.consume("terminal", "^1.0.0", () => ({
          dispose,
        }));
        consumerDisposable.dispose();
        providerDisposable.dispose();

        expect(dispose).toHaveBeenCalledTimes(1);
      });

      it("does not accumulate registrations across consume and dispose cycles", () => {
        const first = jasmine.createSpy("first");
        const second = jasmine.createSpy("second");

        const providerDisposable = hub.provide("terminal", "1.0.0", {});
        hub.consume("terminal", "^1.0.0", () => ({ dispose: first })).dispose();
        hub.consume("terminal", "^1.0.0", () => ({ dispose: second }));
        providerDisposable.dispose();

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
      });

      it("clears every provider, consumer, and active registration", () => {
        const dispose = jasmine.createSpy("dispose");
        const oldConsumer = jasmine.createSpy("oldConsumer");
        const newConsumer = jasmine.createSpy("newConsumer");

        hub.provide("terminal", "1.0.0", {});
        hub.consume("terminal", "^1.0.0", () => ({ dispose }));
        hub.consume("other", "^1.0.0", oldConsumer);
        hub.clear();

        expect(dispose).toHaveBeenCalledTimes(1);
        hub.provide("other", "1.0.0", {});
        hub.consume("terminal", "^1.0.0", newConsumer);
        expect(oldConsumer).not.toHaveBeenCalled();
        expect(newConsumer).not.toHaveBeenCalled();
      });
    });

    describe("unmatchedConsumers", () => {
      it("reports a consumer no provider has satisfied", () => {
        hub.consume("outline", "^1.0.0", () => {});

        expect(hub.unmatchedConsumers()).toEqual([
          { keyPath: "outline", versionRange: "^1.0.0" },
        ]);
      });

      it("does not report a consumer after it has once been satisfied", () => {
        hub.consume("outline", "^1.0.0", () => {});
        const providerDisposable = hub.provide("outline", "1.0.0", {});
        providerDisposable.dispose();

        expect(hub.unmatchedConsumers()).toEqual([]);
      });

      it("does not report a disposed consumer", () => {
        hub.consume("outline", "^1.0.0", () => {}).dispose();

        expect(hub.unmatchedConsumers()).toEqual([]);
      });
    });
  });
};
