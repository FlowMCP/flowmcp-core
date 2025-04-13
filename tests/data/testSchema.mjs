const testSchema = {
    "root": "https://api.etherscan.io",
    "vars": [ "ETHERSCAN_API_KEY" ],
    "headers": {},
    "routes": {
        "getContractABI": {
            "requestMethod": "GET",
            "description": "Returns the Contract ABI of a verified smart contract.",
            "route": "/api",
            "parameters": [
                {
                    "position": ["module", "contract", "body"],
                    "z": []
                },
                {
                    "position": ["module", "contract", "query"],
                    "z": []
                },
                {
                    "position": ["action", "getabi", "query"],
                    "z": []
                },
                {
                    "position": ["address", "{{USER_PARAM}}", "query"],
                    "z": ["string", "min(42)", "max(42)"]
                },
                {
                    "position": ["apikey", "{{ETHERSCAN_API_KEY}}", "query"],
                    "z": []
                }
            ],
            "tests": [
              {
                "_description": "Basic test for getContractABI",
                "address": "0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413"
              }
            ],
            "modifiers": [ [ 'post', 'convertToJSON' ] ]
          },
          "getContractSourceCode": {
            "requestMethod": "GET",
            "description": "Returns the Solidity source code of a verified smart contract.",
            "route": "/api",
            "parameters": [
              {
                "position": ["module", "contract", "query"],
                "z": []
              },
              {
                "position": ["action", "getsourcecode", "query"],
                "z": []
              },
              {
                "position": ["address", "{{USER_PARAM}}", "query"],
                "z": ["string", "min(42)", "max(42)"]
              },
              {
                "position": ["apikey", "{{ETHERSCAN_API_KEY}}", "query"],
                "z": []
              }
            ],
            "tests": [
              {
                "_description": "Basic test for getContractSourceCode",
                "address": "0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413"
              }
            ],
            'modifiers': []
          },
    },
    "modifiers": {
        "convertToJSON": async( struct ) => {
            if( struct['data']['status'] !== '1' ) {
                console.log( 'HERE')
                struct['status'] = false
                struct['messages'].push( data['message'] )
                return struct
            }

            struct['data'] = struct['data']['result']
            return struct
        }
    }
}


export { testSchema }