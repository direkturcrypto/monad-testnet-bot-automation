const {ethers} = require('ethers')
const RPC_URL = "https://testnet-rpc.monad.xyz"

// Simple storage contract ABI and bytecode
const contractABI = [
    {
        "inputs": [],
        "name": "retrieve",
        "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256","name": "num","type": "uint256"}],
        "name": "store",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const contractBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea2646970667358221220322c78243e61b783558c522c2c233054779f849a994f650225ca75e7005841c464736f6c63430008120033"

exports.deployContract = (pk) => {
    return new Promise(async (resolve, reject) => {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL)
            const wallet = new ethers.Wallet(pk, provider)
            
            // Create contract factory
            const factory = new ethers.ContractFactory(contractABI, contractBytecode, wallet)
            
            console.log('Deploying simple storage contract...')
            const contract = await factory.deploy()
            
            // Wait for contract deployment
            await contract.waitForDeployment()
            
            const address = await contract.getAddress()
            console.log('Contract deployed successfully at:', address)
            
            resolve({
                address: address,
                contract: contract,
                abi: contractABI
            })
        } catch (error) {
            console.error('Deployment failed:', error.message)
            reject(error)
        }
    })
}
