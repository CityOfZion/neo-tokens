## NEP5 Token List

A list of NEP5 tokens on MainNet. This is useful for NEO wallets that would like to get all the scripthashes and relevant data for each token.

Step 1: wait until the NEP5 token is listed here (http://notifications.neeeo.org/v1/tokens)
Step 2: upload NEP5 token image to assets/svg or assets/png
Step 3: submit PR (tokenList.json will automatically be updated through CircleCI)

Note: when a PR is merged there will be an automated commit added after that calls yarn start to recreate the tokenList file used by the wallets. You only need to upload an image asset and name your commit "uploading neo.svg" as an example. the rest is automated
