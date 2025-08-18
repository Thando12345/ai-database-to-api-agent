class APISpec {
  constructor(name, endpoints = [], security = {}) {
    this.name = name;
    this.endpoints = endpoints;
    this.security = security;
    this.version = '1.0.0';
  }

  addEndpoint(endpoint) {
    this.endpoints.push(endpoint);
  }

  toOpenAPI() {
    return {
      openapi: '3.0.0',
      info: { title: this.name, version: this.version },
      paths: this.endpoints.reduce((paths, endpoint) => {
        paths[endpoint.path] = { [endpoint.method]: endpoint.toSpec() };
        return paths;
      }, {})
    };
  }
}

class Endpoint {
  constructor(path, method, operation, security = []) {
    this.path = path;
    this.method = method;
    this.operation = operation;
    this.security = security;
  }

  toSpec() {
    return {
      summary: this.operation,
      security: this.security,
      responses: { '200': { description: 'Success' } }
    };
  }
}

module.exports = { APISpec, Endpoint };