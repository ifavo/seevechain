const { Framework } = require('@vechain/connex-framework')
const { Driver, SimpleNet } = require('@vechain/connex.driver-nodejs')
const commands = require('../commands')
const actions = require('../actions')

async function subscribeToVechainBlocks(io, client) {
  const driver = await Driver.connect(new SimpleNet('https://vethor-node.vechain.com/'))
  const thor = new Framework(driver).thor
  const tick = thor.ticker()

  while (true) {
    const head = await tick.next()
    await getBlock(thor, head.number, client)
    io.emit('serverSendLatest', await actions.getLatest())
  }
}

async function getBlock(thor, number, client) {
  const block = await thor.block(number).get()
  if (!block) {
    return await getBlock(thor, number, client)
  } else {
    await commands.saveBlock({ client, block })
    for (const txId of block.transactions) {
      await getTransaction(thor, txId, block, client)
    }
    for (const txId of testData) {
      await getTransaction(thor, txId, block, client)
    }
  }
  return block
}

async function getTransaction(thor, txId, block, client) {
  try {
    const transaction = await thor.transaction(txId).get()
    const receipt = await thor.transaction(txId).getReceipt()

    if (!receipt || !transaction) {
      await getTransaction(thor, txId, block, client)
    } else {
      await commands.saveTransaction({ client, transaction, receipt, block })
    }
  } catch(error) {
    if (error.message.includes('head: leveldb: not found')) {
      await getTransaction(thor, txId, block, client)
    } else throw error
  }
}

module.exports = {
  subscribeToVechainBlocks,
  getBlock,
  getTransaction,
}

const testData = [
  // // VET Transfer
  // '0x779f09e2582a7d48e05282c3fd4fe101755d25a9026403b5c6c8e8f0e9faafbe',
  // // Failed VIM dispenser
  // '0xc70055e5c2754987ab587faa9ae49d1a47e5b504d0f3c9cd6511ee914b45ef4d',
  // // Less than 1 transfer,
  // '0x4e2bc7c6b59fd70d7428d0a601b9e85355f9a3d0fbdf0b4b521881c006f0673c',
  // // Shanghai Gas
  // '0x115650937760478dec8cce8037d9623024256c6f14228d8ed4a617772c95c55d',
  // // Yohongtai Foods
  // '0x5557c413b58cf349be37d7cd078e66b7bc447af33e735888f6672ca9300bdeb2',
  // // Multiple token transfer
  // '0x41df9604f7fc23d044cb2ca6afc2814eb33be74d83d6776722c068644c708901',
  // // SHA Transfer
  // '0xafb658f02456edff8c81fc697ffe4f3f3a56d339ba09dde0cb9052d529ad4480',
  // // EHrT Transfer
  // '0x9694221ce4d5b19a7fcea9e32c73650465e34af2f64c4d7eb59497ba08679387',
  // // New Contract
  // '0x4d05a8bf59aec8911de80d92d1a81e3f9a86216e20d5cb78f356ccb55597424a',
  // // Reverted
  // '0x76768c32144bda9d20ec652479683a4ae533f57bf6fa3944b40c8c029bff9cf2',
]
