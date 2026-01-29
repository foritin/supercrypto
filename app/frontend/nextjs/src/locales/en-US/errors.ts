/**
 * Error codes i18n - English
 * 
 * Keep in sync with constants/error-codes.ts
 * Supports interpolation: {{paramName}}
 */
const errors = {
  errors: {
    // ============ Authentication (1xxx) ============
    1001: 'Session expired, please login again',
    1002: 'Invalid authentication token',
    1003: 'Signature verification failed',
    1004: 'Invalid nonce',
    1005: 'Session revoked, please login again',

    // ============ Asset (2xxx) ============
    2001: 'Asset not found',
    2002: 'Asset symbol already exists',
    2003: 'Asset is not available for subscription',
    2004: 'Subscription amount exceeds remaining supply',

    // ============ Contract Binding (3xxx) ============
    3001: 'Project {{project}} has no primary contract set. Please configure it in Contract Monitor',
    3002: 'No available contracts for project {{project}}',
    3003: 'Specified contracts not found',
    3004: 'Contract {{contract_name}} is already bound to asset {{bound_asset_name}}',
    3005: 'Contract is not bound',
    3006: 'Contract deployment record not found',

    // ============ KYC (4xxx) ============
    4001: 'KYC record not found',
    4002: 'KYC application is pending review',
    4003: 'KYC is already approved',
    4004: 'KYC status does not allow this operation',
    4005: 'KYC is already synced on-chain',
    4006: 'On-chain sync not required for this environment',
    4007: 'Please complete KYC verification first',

    // ============ Subscription (5xxx) ============
    5001: 'Subscription record not found',
    5002: 'Subscription amount is below minimum {{min_amount}}',
    5003: 'Subscription amount exceeds remaining supply ({{remaining}})',
    5004: 'Subscription conflict, please retry',
    5005: 'Request is being processed, please wait',

    // ============ Environment (6xxx) ============
    6001: 'This operation is not allowed in current environment',
    6002: 'This operation is only available in Hardhat environment',
    6003: 'This operation is only available in development environment',

    // ============ Common Errors (9xxx) ============
    9000: 'Unknown error',
    9001: 'Validation failed',
    9002: 'Resource not found',
    9003: 'Unauthorized, please login',
    9004: 'Permission denied',
    9005: 'Resource conflict',

    // Default error
    default: 'Operation failed, please retry',
  },
}

export default errors
