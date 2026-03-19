import admin from './admin'
import assets from './assets'
import common from './common'
import dev from './dev'
import errors from './errors'
import faq from './faq'
import home from './home'
import invest from './invest'
import kyc from './kyc'
import layout from './layout'
import portfolio from './portfolio'
import redeem from './redeem'
import security from './security'
import staking from './staking'
import subscription from './subscription'
import wallet from './wallet'

const valueEN = {
  ...common,
  ...wallet,
  ...layout,
  ...home,
  ...kyc,
  ...assets,
  ...portfolio,
  ...subscription,
  ...invest,
  ...redeem,
  ...staking,
  ...admin,
  ...dev,
  ...errors,
  ...faq,
  ...security,
}

export default valueEN

