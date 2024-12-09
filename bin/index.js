const { GithubDeviceAuth } = require("../src/index");

(async () => {
  const auth = new GithubDeviceAuth({ clientId: '...clientId....', scope: '' });
  //const deviceData = await auth.requestDeviceCode();

  const result = await auth.authenticate({
    statusCallback: async (data) => {
      console.log(data);
    },
    deviceCodeCallback: async (deviceData) => {
      console.log('Visit the following URL in your browser and enter the user code:');
      console.log(deviceData.verification_uri);
      console.log('User Code: ' + deviceData.user_code);
      console.log('Expires in: ' + deviceData.expires_in + ' seconds');
    }
  });
  console.log(result);
})();