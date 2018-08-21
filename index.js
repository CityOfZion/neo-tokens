const fetch = require('isomorphic-fetch')
const fs = require('fs')
const { api } = require('@cityofzion/neon-js')

const tokenDataUrl = 'http://notifications.neeeo.org/v1/tokens'
const baseImageUrl = `https://rawgit.com/${process.env.PROJECT_NAME}/neo-tokens/master/assets`

const NETWORK_ID = {
	MAINNET: '1'
}

const BLACKLIST = {
	NRV: '2e25d2127e0240c6deaf35394702feb236d4d7fc',
	ONT: '442e7964f6486005235e87e082f56cd52aa663b8',
	RPX: 'ecc6b20d3ccac1ee9ef109af5a7cdb85706b1df9'
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

async function getToken(endpoint, scriptHash) {
	try {
		const data = await api.nep5.getToken(endpoint, scriptHash)
		return data
	} catch (err) {
		return null
	}
}

async function getTokenData(net) {
	const endpoint = await api.getRPCEndpointFrom({ net }, api.neoscan)
	const response = await fetch(tokenDataUrl)
	const data = await response.json()
	const tokenData = {}

	const promises = data.results.map(async ({ token }) => {
		const { decimals, symbol, script_hash: hash, name } = token
		const scriptHash = hash.startsWith('0x') ? hash.slice(2) : hash
		const image = getImage(symbol)
		const tokenInfo = await getToken(endpoint, scriptHash)

		if (!tokenInfo) {
			// eslint-disable-next-line no-console
			console.warn(`Unable to fetch NEP5 token data for "${symbol}" (${scriptHash})`)
			return
		}

		if (BLACKLIST[symbol] === scriptHash) {
			return
		}

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
