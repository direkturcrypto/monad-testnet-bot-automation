const {ethers, parseEther, formatEther} = require('ethers')
const ROUTER_ABI = require('../abis/uniswapV2.json')
const ERC20_ABI = require('../abis/erc20.json')
const WETHABI = require('../abis/weth.json')
const RPC_URL = "https://testnet-rpc.monad.xyz"

const stakeABI = [
    "function deposit(uint256 _amount, address _receiver) external"
]

exports.stake = (pk, amount=0) => {
    return new Promise(async (resolve, reject) => {
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const wallet = new ethers.Wallet(pk, provider)
        const stakeContract = new ethers.Contract("0xb2f82D0f38dc453D596Ad40A37799446Cc89274A", stakeABI, wallet)
        console.log('Estimating gas for deposit...')
        const gasEstimate = await stakeContract.deposit.estimateGas(amount, wallet.address, {value: amount}).catch((e) => ({status: 500, message: e.shortMessage}))
        if (gasEstimate.status === 500) {
            console.log('Gas estimation failed:', gasEstimate.message)
            return reject(gasEstimate)
        }
        console.log('Gas estimation successful. Estimated gas:', gasEstimate.toString())

        console.log('Sending deposit transaction...')
        const tx = await stakeContract.deposit(amount, wallet.address, {value: amount, gasLimit: gasEstimate}).catch((e) => ({status: 500, message: e.shortMessage}))

        if (tx.status == 500) {
            console.log('Transaction failed:', tx.message)
            reject(tx)
        } else {
            console.log('Transaction successful! Hash:', tx.hash)
            resolve(tx)
        }
    })
}
