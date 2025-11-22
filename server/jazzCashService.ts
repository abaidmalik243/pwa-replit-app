import crypto from 'crypto';

// Use sandbox URLs for now - can be configured via env var
const JAZZCASH_BASE_URL = process.env.JAZZCASH_BASE_URL || 'https://sandbox.jazzcash.com.pk';
const JAZZCASH_PAYMENT_URL = `${JAZZCASH_BASE_URL}/CustomerPortal/transactionmanagement/merchantform/`;

/**
 * Get JazzCash credentials with validation
 */
function getJazzCashCredentials() {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

  if (!merchantId || !password || !integritySalt) {
    throw new Error('JazzCash credentials not configured. Please set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, and JAZZCASH_INTEGRITY_SALT environment variables.');
  }

  return { merchantId, password, integritySalt };
}

interface JazzCashPaymentData {
  orderId: string;
  amount: number; // In PKR (will be converted to paisas)
  billReference: string;
  description: string;
  returnUrl: string;
  customerMobile?: string;
  customerEmail?: string;
}

interface JazzCashFormData {
  pp_Version: string;
  pp_TxnType: string;
  pp_Language: string;
  pp_MerchantID: string;
  pp_SubMerchantID: string;
  pp_Password: string;
  pp_TxnRefNo: string;
  pp_Amount: string;
  pp_TxnCurrency: string;
  pp_TxnDateTime: string;
  pp_BillReference: string;
  pp_Description: string;
  pp_TxnExpiryDateTime: string;
  pp_ReturnURL: string;
  pp_SecureHash: string;
  ppmpf_1?: string;
  ppmpf_2?: string;
  ppmpf_3?: string;
  ppmpf_4?: string;
  ppmpf_5?: string;
  pp_MobileNumber?: string;
  pp_CNIC?: string;
}

/**
 * Generate HMAC-SHA256 hash for JazzCash transaction
 */
function generateSecureHash(data: JazzCashFormData, integritySalt: string): string {
  // Build sorted string as per JazzCash documentation (alphabetically sorted)
  const sortedString = 
    integritySalt + '&' +
    data.pp_Amount + '&' +
    data.pp_BillReference + '&' +
    data.pp_Description + '&' +
    data.pp_Language + '&' +
    data.pp_MerchantID + '&' +
    data.pp_Password + '&' +
    data.pp_ReturnURL + '&' +
    data.pp_TxnCurrency + '&' +
    data.pp_TxnDateTime + '&' +
    data.pp_TxnExpiryDateTime + '&' +
    data.pp_TxnRefNo + '&' +
    data.pp_TxnType + '&' +
    data.pp_Version;

  return crypto
    .createHmac('sha256', integritySalt)
    .update(sortedString)
    .digest('hex');
}

/**
 * Verify response hash from JazzCash callback
 */
function verifyResponseHash(responseData: any, integritySalt: string): boolean {
  const receivedHash = responseData.pp_SecureHash;
  
  if (!receivedHash) {
    return false;
  }

  // Build string from response parameters (alphabetically sorted per JazzCash spec)
  const sortedString = 
    integritySalt + '&' +
    (responseData.pp_Amount || '') + '&' +
    (responseData.pp_BillReference || '') + '&' +
    (responseData.pp_Description || '') + '&' +
    (responseData.pp_Language || '') + '&' +
    (responseData.pp_MerchantID || '') + '&' +
    (responseData.pp_ResponseCode || '') + '&' +
    (responseData.pp_ResponseMessage || '') + '&' +
    (responseData.pp_RetreivalReferenceNo || '') + '&' +
    (responseData.pp_TxnCurrency || '') + '&' +
    (responseData.pp_TxnDateTime || '') + '&' +
    (responseData.pp_TxnRefNo || '') + '&' +
    (responseData.pp_TxnType || '') + '&' +
    (responseData.pp_Version || '');

  const calculatedHash = crypto
    .createHmac('sha256', integritySalt)
    .update(sortedString)
    .digest('hex');

  return calculatedHash === receivedHash;
}

/**
 * Create JazzCash payment session
 */
export function createJazzCashPayment(paymentData: JazzCashPaymentData): {
  formData: JazzCashFormData;
  paymentUrl: string;
} {
  // Validate credentials first
  const credentials = getJazzCashCredentials();
  
  // Generate transaction reference with timestamp
  const txnDateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const txnRefNo = `T${txnDateTime}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  // Calculate expiry time (1 hour from now)
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  
  // Convert amount to paisas (1 PKR = 100 paisas)
  const amountInPaisas = Math.round(paymentData.amount * 100);

  // Build form data
  const formData: JazzCashFormData = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET', // Mobile Wallet
    pp_Language: 'EN',
    pp_MerchantID: credentials.merchantId,
    pp_SubMerchantID: '',
    pp_Password: credentials.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amountInPaisas.toString(),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: paymentData.billReference,
    pp_Description: paymentData.description.substring(0, 100), // Max 100 chars
    pp_TxnExpiryDateTime: txnExpiryDateTime,
    pp_ReturnURL: paymentData.returnUrl,
    pp_SecureHash: '', // Will be set below
    ppmpf_1: paymentData.customerMobile || '',
    ppmpf_2: paymentData.customerEmail || '',
    ppmpf_3: '',
    ppmpf_4: paymentData.orderId,
    ppmpf_5: '',
  };

  // Add mobile number if provided
  if (paymentData.customerMobile) {
    formData.pp_MobileNumber = paymentData.customerMobile;
  }

  // Generate and set secure hash
  formData.pp_SecureHash = generateSecureHash(formData, credentials.integritySalt);

  return {
    formData,
    paymentUrl: JAZZCASH_PAYMENT_URL,
  };
}

/**
 * Validate JazzCash response
 */
export function validateJazzCashResponse(responseData: any): {
  success: boolean;
  transactionId?: string;
  responseCode: string;
  responseMessage: string;
  amount?: number;
  orderId?: string;
} {
  // Get credentials for hash verification
  const credentials = getJazzCashCredentials();
  
  // Verify hash first
  const isHashValid = verifyResponseHash(responseData, credentials.integritySalt);
  
  if (!isHashValid) {
    return {
      success: false,
      responseCode: 'INVALID_HASH',
      responseMessage: 'Response hash verification failed',
    };
  }

  // Check response code (000 = success)
  const isSuccess = responseData.pp_ResponseCode === '000';
  
  return {
    success: isSuccess,
    transactionId: responseData.pp_TxnRefNo,
    responseCode: responseData.pp_ResponseCode,
    responseMessage: responseData.pp_ResponseMessage,
    amount: responseData.pp_Amount ? parseInt(responseData.pp_Amount) / 100 : undefined,
    orderId: responseData.ppmpf_4, // Order ID stored in custom field
  };
}

/**
 * Check if JazzCash is properly configured
 */
export function isJazzCashConfigured(): boolean {
  try {
    getJazzCashCredentials();
    return true;
  } catch {
    return false;
  }
}
