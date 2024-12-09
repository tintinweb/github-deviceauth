# github-deviceauth

A minimalistic library to perform GitHub OAuth via the DeviceAuth Flow

## Example

```javascript

const { GithubDeviceAuth } = require("../src/index");

(async () => {
  const auth = new GithubDeviceAuth({ clientId: '...clientId....', scope: '' });

  const result = await auth.authenticate({
    statusCallback: async (data) => {
      // all status updates
      console.log(data);
    },
    deviceCodeCallback: async (deviceData) => {
      // requestDeviceCode response
      console.log('Visit the following URL in your browser and enter the user code:');
      console.log(deviceData.verification_uri);
      console.log('User Code: ' + deviceData.user_code);
      console.log('Expires in: ' + deviceData.expires_in + ' seconds');
    }
  });
  console.log(result); // success; users auth token
})();

```