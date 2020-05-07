import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import Router, { useRouter } from 'next/router'
import Head from 'next/head'
import { formatEther } from 'ethers/utils'
import Box from './Base/Box'
import { config } from '../config'
import Header from './Header'
import StartupModal from './StartupModal'
import { Tabs } from './Tabs'
import Wallet from './Wallet'
import { TEXT, BACKGROUND, SUBTEXT, ERROR, MAIN, MAIN_DARK } from '../colors'
import {
  FW_BOLD,
  FZ_MEDIUM,
  FZ_SMALL,
  FZ_DEFAULT,
  FZ_LARGE,
  FZ_HEADLINE
} from '../fonts'
import {
  WALLET,
  HISTORY,
  PAYMENT,
  EXCHANGE,
  NFT_COLLECTIBLES,
  openModal
} from '../routes'
import { pushRouteHistory, popRouteHistory } from '../store/appRouter'
import { checkClientInitialized } from '../store/appStatus'

const Initial = ({
  checkClientInitialized,
  pushRouteHistory,
  popRouteHistory,
  appStatus,
  address,
  tokenBalance,
  children
}) => {
  const router = useRouter()
  const isWalletHidden =
    router.pathname === WALLET || router.pathname === HISTORY
  const isTabShownHidden =
    appStatus.status === 'loaded' &&
    (router.pathname === PAYMENT ||
      router.pathname === EXCHANGE ||
      router.pathname === NFT_COLLECTIBLES)

  useEffect(() => {
    checkClientInitialized()
    pushRouteHistory(router.pathname)
    Router.events.on('routeChangeComplete', url => {
      pushRouteHistory(url)
    })
    Router.beforePopState(() => {
      popRouteHistory()
      return true
    })
  }, [])

  // TODO: how to show the other token balances
  const l2Balance = tokenBalance.tokenBalanceList[0]
    ? formatEther(tokenBalance.tokenBalanceList[0].amount.toString()) *
      tokenBalance.ETHtoUSD
    : 0
  const mainchainBalance =
    formatEther(tokenBalance.L1Balance) * tokenBalance.ETHtoUSD

  const content =
    appStatus.status === 'unloaded' || appStatus.status === 'error' ? (
      <div>
        <StartupModal />
      </div>
    ) : appStatus.status === 'loaded' ? (
      children
    ) : (
      <p>loading...</p>
    )

  return (
    <div>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:500,700,900&display=swap"
        />
      </Head>
      <Header />
      <div className="container">
        <h2 className="headline">
          {router.pathname !== HISTORY ? 'Your Wallet' : 'Transaction History'}
        </h2>
        {!isWalletHidden && (
          <Box>
            <div className="wallet">
              {appStatus.status !== 'loaded' ? (
                <span className="wallet__txt">No Wallet</span>
              ) : (
                <Wallet
                  l2={l2Balance}
                  mainchain={mainchainBalance}
                  address={address}
                  onDeposit={() => {
                    openModal('deposit', config.payoutContracts.DepositContract)
                  }}
                />
              )}
            </div>
          </Box>
        )}
        <Box>
          {/* {isTabShownHidden && <Tabs currentPath={router.pathname} />} */}
          {content}
          {appStatus.status === 'error' && (
            <div className="error">
              {appStatus.error ? appStatus.error.message : 'Unexpected error'}
            </div>
          )}
        </Box>
      </div>
      <style>{`
        *,
        *:after,
        *:before {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        }
        button {
          border: none;
        }
        input {
          border: none;
        }
        a {
          color: ${MAIN};
        }
        a:hover {
          color: ${MAIN_DARK};
          text-decoration: none;
        }
        button:focus {outline:0;}
        input:focus {outline:0;}
        body {
          box-sizing: border-box;
          font-family: Roboto, sans-serif;
          font-weight: 500;
          background: ${BACKGROUND};
          color: ${TEXT};
        }
        .sub {
          font-size: ${FZ_MEDIUM};
          color: ${SUBTEXT};
        }
        .fzs {
          font-size: ${FZ_SMALL} !important;
        }
        .fzm {
          font-size: ${FZ_MEDIUM} !important;
        }
        .fzd {
          font-size: ${FZ_DEFAULT} !important;
        }
        .fzl {
          font-size: ${FZ_LARGE} !important;
        }
        .fzh {
          font-size: ${FZ_HEADLINE} !important;
        }
        .mbs {
          margin-bottom: 0.875rem
        }
        .mts {
          margin-top: 0.875rem
        }
        .mbm {
          margin-bottom: 1.5rem
        }
        .mtm {
          margin-top: 1.5rem
        }
        .mtl {
          margin-top: 2rem;
        }
      `}</style>
      <style jsx>{`
        .container {
          max-width: 37.5rem;
          margin: 0 auto;
        }
        .headline {
          font-weight: ${FW_BOLD};
          font-size: ${FZ_MEDIUM};
          color: ${SUBTEXT};
          margin-bottom: 0.5rem;
        }
        .wallet {
          margin: -0.375rem 0;
        }
        .wallet__txt {
          color: ${SUBTEXT};
        }
        .error {
          color: ${ERROR};
          text-align: center;
          margin-top: 0.75rem;
          font-size: ${FZ_MEDIUM};
        }
      `}</style>
    </div>
  )
}

const mapStateToProps = ({ address, appRouter, appStatus, tokenBalance }) => ({
  address,
  appRouter,
  appStatus,
  tokenBalance
})

const mapDispatchToProps = {
  checkClientInitialized,
  pushRouteHistory,
  popRouteHistory
}

export default connect(mapStateToProps, mapDispatchToProps)(Initial)
