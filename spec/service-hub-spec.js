const serviceHubContract = require("./support/service-hub-contract");

serviceHubContract("CommonJS ServiceHub", async () =>
  require("@lumine-code/service-hub"),
);

serviceHubContract("ECMAScript module ServiceHub", async () => {
  const module = await import("@lumine-code/service-hub");
  return module.default;
});

describe("module compatibility", () => {
  it("exports the ServiceHub class directly from CommonJS", () => {
    const ServiceHub = require("@lumine-code/service-hub");

    expect(typeof ServiceHub).toBe("function");
    expect(new ServiceHub()).toEqual(jasmine.any(ServiceHub));
  });

  it("exports the same class as the ECMAScript default and named export", async () => {
    const module = await import("@lumine-code/service-hub");

    expect(module.default).toBe(module.ServiceHub);
    expect(new module.default()).toEqual(jasmine.any(module.ServiceHub));
  });
});
