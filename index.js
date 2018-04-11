const fetch = require('isomorphic-fetch')
const fs = require('fs')
const api = require('@cityofzion/neon-js').api

const tokenDataUrl = 'http://notifications.neeeo.org/v1/tokens'
const baseImageUrl =
	'https://raw.githubusercontent.com/neonexchange/neo-tokens/master/assets'
const net = 'MainNet'
const NETWORK_ID = {
	MAINNET: '1'
}
let promises
const tokenData = {}

const blackList = {
	NRV: '2e25d2127e0240c6deaf35394702feb236d4d7fc'
}

api.loadBalance(api.getRPCEndpointFrom, { net }).then(endpoint => {
	fetch(tokenDataUrl)
		.then(data => data.json())
		.then(response => {
			promises = response.results.map(({ token }) => {
				const { decimals, symbol, script_hash, name } = token
				const scriptHash = script_hash.startsWith('0x')
					? script_hash.slice(2)
					: script_hash
				return api.nep5.getToken(endpoint, scriptHash).then(tokenInfo => {
					let image = ''
					const formattedSymbol = symbol.toLowerCase()
					if (fs.existsSync(`./assets/svg/${formattedSymbol}.svg`)) {
						image = `${baseImageUrl}/svg/${formattedSymbol}.svg`
					} else if (fs.existsSync(`./assets/png/${formattedSymbol}.png`)) {
						image = `${baseImageUrl}/png/${formattedSymbol}.png`
					}
					if (!blackList[symbol] && blackList[symbol] !== scriptHash) {
						tokenData[symbol] = {
							symbol,
							companyName: name,
							type: 'NEP5',
							networks: {
								[NETWORK_ID.MAINNET]: {
									name,
									hash: scriptHash,
									decimals,
									totalSupply: tokenInfo && tokenInfo.totalSupply
								}
							},
							image
						}
					}
				})
			})
			Promise.all(promises).then(() => {
				fs.writeFile('tokenList.json', JSON.stringify(tokenData, null, 2))
			})
		})
})
