import * as R from 'ramda'
import { expect } from 'chai'
import { RESTMethod, Transaction } from '../../lib/__general'
import sortTransactions from '../../lib/sortTransactions'

const createTransaction = R.mergeDeepRight<Partial<Transaction>>({
  id: 'abcd',
  name: 'test-transaction',
  host: 'localhost',
  protocol: 'http:'
})

describe('sortTransactions', () => {
  describe('given transactions in arbitrary order', () => {
    it('should sort transactions according to the internal manifest', () => {
      const getTransaction = createTransaction({
        request: {
          method: RESTMethod.GET,
          url: '/endpoint'
        }
      })
      const optionsTransaction = createTransaction({
        request: {
          method: RESTMethod.OPTIONS,
          url: '/endpoint'
        }
      })
      const transactions: Transaction[] = [getTransaction, optionsTransaction]
      const result = sortTransactions(transactions)

      expect(result).to.deep.equal([optionsTransaction, getTransaction])
    })
  })

  describe('given a transactions list in the proper order', () => {
    // ...
  })
})
