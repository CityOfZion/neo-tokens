// workaround for https://github.com/nodejs/node/issues/16196
require('tls').DEFAULT_ECDH_CURVE = 'auto'

const fetch = require('isomorphic-fetch')
const fs = require('fs')
const { api } = require('@cityofzion/neon-js')

const tokenDataUrl = 'https://n1.cityofzion.io/v1/tokens'
const backupTokenDataUrl = 'http://notifications1.neeeo.org/v1/tokens'
const baseImageUrl = `https://rawgit.com/${process.env.PROJECT_NAME}/neo-tokens/master/assets`

const NETWORK_ID = {
	MAINNET: '1'
}

const BLACKLIST = {
	// neon-js RangeError failures
	'98ed9573c864d7c325e12e5923b54a0e08a2a17e': 'LFX',
	'c54fc1e02a674ce2de52493b3138fb80ccff5a6e': 'LFX',
	'fd48828f107f400c1ae595366f301842886ec573': 'NNC',

	// deprecated tokens
	'2e25d2127e0240c6deaf35394702feb236d4d7fc': 'NRV',
	'442e7964f6486005235e87e082f56cd52aa663b8': 'ONT',
	'4b4f63919b9ecfd2483f0c72ff46ed31b5bbb7a4': 'SOUL',
	'505663a29d83663a838eee091249abd167e928f5': 'CGAS', // v1.0.2
	'9121e89e8a0849857262d67c8408601b5e8e0524': 'CGAS', // v1.0.1
	'a0b328c01eac8b12b0f8a4fe93645d18fb3f1f0a': 'NKN'
}

function getImage(symbol) {
	const formattedSymbol = symbol.toLowerCase()

	if (fs.existsSync(`./assets/svg/${formattedSymbol}.svg`)) {
		return `${baseImageUrl}/svg/${formattedSymbol}.svg`
	} else if (fs.existsSync(`./assets/png/${formattedSymbol}.png`)) {
		return `${baseImageUrl}/png/${formattedSymbol}.png`
	}
}

function sortObject(obj) {
	return Object.keys(obj).sort().reduce((accumulator, key) => ({
		...accumulator,
		[key]: obj[key]
	}), {})
}

function mergeTokenData(trusted, backup) {
	const filteredBackup = backup.filter(backupToken => {
		const found = trusted.find(token => token.contract.hash === backupToken.contract.hash)
		return !found
	})

	return filteredBackup.concat(trusted)
}

async function getTokenData(net) {
	const endpoint = await api.getRPCEndpointFrom({ net }, api.neoscan)
	const response = await fetch(tokenDataUrl)
	const backupResponse = await fetch(backupTokenDataUrl)

	const data = await response.json()
	const backupData = await backupResponse.json()
	const mergedData = mergeTokenData(data.results, backupData.results)

	const tokenData = {}

	const promises = mergedData.map(async ({ token }) => {
		const { decimals, symbol, script_hash: hash, name } = token
		const scriptHash = hash.startsWith('0x') ? hash.slice(2) : hash

		if (BLACKLIST[scriptHash] === symbol) {
			// eslint-disable-next-line no-console
			console.info(`Skipping blacklisted token "${symbol}" (${scriptHash})`)
			return
		}

		const image = getImage(symbol)
		const tokenInfo = await api.nep5.getToken(endpoint, scriptHash)

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
	})

	await Promise.all(promises)

	return sortObject(tokenData)
}

async function writeTokenData(filename) {
	const tokenData = await getTokenData('MainNet')
	fs.writeFileSync(filename, JSON.stringify(tokenData, null, 2))
}

try {
	writeTokenData('tokenList.json')
} catch (err) {
	// eslint-disable-next-line no-console
	console.error(err)
	process.exit(1)
}
