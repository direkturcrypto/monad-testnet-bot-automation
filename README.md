# Monad Automated Transaction Script

## Overview
This script automates various on-chain transactions on the Monad testnet using Ethereum smart contracts. It performs a series of predefined actions such as swapping tokens, staking, deploying contracts, and more. The script is designed to run continuously on a VPS, executing these actions at random intervals during specified operating hours.

## Features
- **Auto-Rotate Transactions**: The script randomly selects and executes up to three different actions from a predefined list.
- **Token Swapping**: Swaps between various tokens including MONAD, USDC, BEAN, and WMON.
- **Staking**: Stakes MONAD tokens.
- **Contract Deployment**: Deploys new smart contracts.
- **Token Wrapping/Unwrapping**: Wraps and unwraps MONAD tokens to wMONAD.
- **Liquidity Management**: Adds and withdraws liquidity from Uniswap-like pools.
- **Random Transactions**: Sends random transactions to random addresses.
- **Hedgemony Swaps**: Executes swaps using the Hedgemony service, with automatic transaction history submission.

## Requirements
- Node.js (v14 or higher)
- Environment variables:
  - `PK`: Your Ethereum private key.
  - `hedgeAccessToken`: Access token for the Hedgemony service (if applicable).
- Dependencies:
  - `dotenv`: For loading environment variables from a .env file.
  - `ethers`: For interacting with Ethereum smart contracts.
  - `axios`: For making HTTP requests (used in Hedgemony swaps).

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/direkturcrypto/monad-testnet-bot-automation.git
   cd monad-testnet-bot-automation
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

## Configuration
Set the required environment variables in your VPS. You can do this by creating a `.env` file in the root directory of the project or by setting them directly in your VPS environment.

Example `.env` file:
```
PK=your_ethereum_private_key
hedgeAccessToken=your_hedgemony_access_token
```

## Running the Script
To run the script on your VPS, use the following command:
```bash
node index.js
```

The script will continuously execute random actions during operating hours (9 AM to 5 PM GMT+7) and wait for the next cycle outside of these hours.

## Notes
- Ensure that your private key is kept secure and not exposed in public repositories.
- The script assumes that the necessary smart contracts and tokens are already deployed on the Monad testnet.
- Adjust the thresholds and amounts in the script as needed for your specific use case.
