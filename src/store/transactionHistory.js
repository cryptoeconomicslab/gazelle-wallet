import { formatEther } from 'ethers/utils'
import { createAction, createReducer } from '@reduxjs/toolkit'
import clientWrapper from '../client'
import { getTokenByTokenContractAddress } from '../constants/tokens'
import { pushToast } from './toast'

export const TRANSACTION_HISTORY_PROGRESS = {
  UNLOADED: 'UNLOADED',
  LOADING: 'LOADING',
  LOADED: 'LOADED',
  ERROR: 'ERROR'
}

export const setHistoryList = createAction('SET_HISTORY_LIST')
export const setHistoryListStatus = createAction('SET_HISTORY_LIST_STATUS')
export const setHistoryListError = createAction('SET_HISTORY_LIST_ERROR')

export const historyReducer = createReducer(
  {
    historyList: [],
    status: TRANSACTION_HISTORY_PROGRESS.UNLOADED,
    error: null
  },
  {
    [setHistoryList]: (state, action) => {
      state.historyList = action.payload
      state.status = TRANSACTION_HISTORY_PROGRESS.LOADED
    },
    [setHistoryListStatus]: (state, action) => {
      state.status = action.payload
    },
    [setHistoryListError]: (state, action) => {
      state.error = action.payload
      state.status = TRANSACTION_HISTORY_PROGRESS.ERROR
    }
  }
)

export const getTransactionHistories = () => {
  return async (dispatch, getState) => {
    try {
      if (getState().history.status === TRANSACTION_HISTORY_PROGRESS.LOADING) {
        return
      }

      dispatch(setHistoryListStatus(TRANSACTION_HISTORY_PROGRESS.LOADING))
      const client = await clientWrapper.getClient()
      if (!client) return
      const histories = (await client.getAllUserActions()).map(history => {
        const token = getTokenByTokenContractAddress(history.tokenAddress)
        return {
          message: history.type,
          amount: formatEther(history.amount.toString()),
          unit: token.unit,
          blockNumber: history.blockNumber.toString(),
          counterParty: history.counterParty,
          depositContractAddress: token.depositContractAddress,
          range: { start: history.range.start, end: history.range.end }
        }
      })
      dispatch(setHistoryList(histories))
    } catch (e) {
      // FIXME: temporary measures
      if (
        e.message ===
        `Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`
      ) {
        dispatch(getTransactionHistories())
        return
      }
      console.error(e)
      dispatch(setHistoryListError(e))
      dispatch(
        pushToast({
          message: 'Get your transaction history failed.',
          type: 'error'
        })
      )
    }
  }
}
