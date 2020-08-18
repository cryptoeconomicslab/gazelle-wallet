import * as ethers from 'ethers'
import LightClient from '@cryptoeconomicslab/plasma-light-client'
import { EthWallet } from '@cryptoeconomicslab/eth-wallet'
import { Address, Bytes } from '@cryptoeconomicslab/primitives'
import { IndexedDbKeyValueStore } from '@cryptoeconomicslab/indexeddb-kvs'
import {
  AdjudicationContract,
  CommitmentContract,
  CheckpointDisputeContract,
  DepositContract,
  ERC20Contract,
  ExitDisputeContract,
  OwnershipPayoutContract
} from '@cryptoeconomicslab/eth-contract'
import * as Sentry from '@sentry/browser'
import { config } from './config'
import {
  MetamaskService,
  MetamaskSnapWallet,
  MagicLinkService,
  WalletConnectService,
  WALLET_KIND
} from './wallet'
import { sleep } from './utils'

if (process.env.SENTRY_ENDPOINT) {
  Sentry.init({
    dsn: process.env.SENTRY_ENDPOINT
  })
}

function getProvider(network) {
  if (network === 'local') {
    return new ethers.providers.JsonRpcProvider(process.env.MAIN_CHAIN_URL)
  } else if (network === 'kovan') {
    return new ethers.getDefaultProvider('kovan')
  }
}

async function registerPeth(client) {
  try {
    // FIXME: temporary measures
    await sleep(1000)
    await client.registerToken(
      config.PlasmaETH,
      config.payoutContracts.DepositContract
    )
  } catch (e) {
    console.error(e)
    console.log('retry register PETH')
    await registerPeth(client)
  }
}

async function instantiate(walletParams) {
  const networkName = process.env.ETH_NETWORK
  const kind = walletParams.kind

  let wallet, signer
  if (kind === WALLET_KIND.WALLET_PRIVATEKEY) {
    wallet = new EthWallet(
      new ethers.Wallet(walletParams.privateKey, getProvider(networkName))
    )
    signer = wallet.getEthersWallet()
  } else if (kind === WALLET_KIND.WALLET_METAMASK) {
    wallet = await MetamaskService.initialize(networkName)
    signer = wallet.provider.getSigner()
  } else if (kind === WALLET_KIND.WALLET_MAGIC_LINK) {
    wallet = await MagicLinkService.initialize(walletParams.email, networkName)
    if (!wallet) {
      location.reload()
      return
    }
    signer = wallet.provider.getSigner()
  } else if (kind === WALLET_KIND.WALLET_CONNECT) {
    wallet = await WalletConnectService.initilize(networkName)
    signer = wallet.provider.getSigner()
  } else if (kind === WALLET_KIND.WALLET_METAMASK_SNAP) {
    await window.ethereum.enable()
    wallet = new MetamaskSnapWallet()
    signer = new ethers.providers.Web3Provider(window.ethereum).getSigner()
    wallet.getEthersWallet = () =>
      new ethers.providers.Web3Provider(window.ethereum).getSigner()
  } else {
    throw new Error(`gazelle-wallet doesn't support ${kind}`)
  }

  const address = wallet.getAddress()
  const kvs = new IndexedDbKeyValueStore(
    Bytes.fromString('wallet_' + address.data)
  )
  const eventDb = await kvs.bucket(Bytes.fromString('event'))
  const provider = getProvider(networkName)
  const eventWatcherOptions = {
    interval: 12000
  }
  const disputeContractEventWatcherOptions = {
    interval: 20000
  }
  const adjudicationContract = new AdjudicationContract(
    Address.from(config.adjudicationContract),
    eventDb,
    signer,
    provider,
    eventWatcherOptions
  )

  const ownershipPayoutContract = new OwnershipPayoutContract(
    Address.from(config.payoutContracts.OwnershipPayout),
    signer
  )

  function depositContractFactory(address) {
    return new DepositContract(
      address,
      eventDb,
      signer,
      provider,
      eventWatcherOptions
    )
  }

  function tokenContractFactory(address) {
    return new ERC20Contract(address, signer)
  }

  const commitmentContract = new CommitmentContract(
    Address.from(config.commitment),
    eventDb,
    signer,
    provider,
    eventWatcherOptions
  )

  const checkpointDisputeContract = new CheckpointDisputeContract(
    Address.from(config.checkpointDispute),
    eventDb,
    signer,
    provider,
    disputeContractEventWatcherOptions
  )

  const exitDisputeContract = new ExitDisputeContract(
    Address.from(config.exitDispute),
    eventDb,
    signer,
    provider,
    disputeContractEventWatcherOptions
  )

  const client = await LightClient.initilize({
    wallet,
    witnessDb: kvs,
    adjudicationContract,
    depositContractFactory,
    tokenContractFactory,
    commitmentContract,
    ownershipPayoutContract,
    checkpointDisputeContract,
    exitDisputeContract,
    deciderConfig: config,
    aggregatorEndpoint: process.env.AGGREGATOR_URL
  })

  await registerPeth(client)

  return client
}

export default async function initialize(walletParams) {
  const lightClient = await instantiate(walletParams)
  localStorage.setItem('loggedInWith', walletParams.kind)
  return lightClient
}