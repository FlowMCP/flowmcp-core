const schema = {
    "name": "ExampleAPI",
    "description": "A simple example API for demonstration purposes.",
    "version": "1.0.0",
    "flowMCP": "1.0.0",
    "root": "https://api.example.com",
    "requiredServerParams": ["API_KEY"],
    "headers": {},
    "routes": {
      "getExampleData": {
        "requestMethod": "GET",
        "description": "Retrieves example data from the API.",
        "route": "/data",
        "parameters": [
          { "position": { "key": "module", "value": "example", "location": "query" } },
          { "position": { "key": "action", "value": "getdata", "location": "query" } },
          {
            "position": {
              "key": "userId",
              "value": "{{USER_PARAM}}",
              "location": "query"
            },
            "z": {
              "primitive": "string",
              "options": ["regex(^user_[a-z0-9]+$)"]
            }
          },
          {
            "position": {
              "key": "apikey",
              "value": "{{API_KEY}}",
              "location": "query"
            }
          }
        ],
        "tests": [
          {
            "_description": "Basic test for getExampleData",
            "userId": "user_abc123"
          }
        ],
        "modifiers": [
          {
            "phase": "post",
            "handler": "formatExampleResponse"
          }
        ]
      }
    },
    "handlers": {
      "formatExampleResponse": async ({ struct, payload }) => {
        if (!struct['data'].success) {
          struct['status'] = false;
          struct['messages'].push(struct.data.message || "Unknown error.");
          return { struct, payload };
        }
        struct['data'] = struct['data'].result;
        return { struct, payload };
      }
    }
  }

  
export { schema };