/**
 * PayPal REST API Service
 * Handles payment processing and webhook verification
 * 
 * SECURITY CRITICAL:
 * - All webhook events must be verified with PayPal signature
 * - Never update block status without webhook verification
 * - All transactions must be logged for audit trail
 */

import axios from 'axios';
import crypto from 'crypto';

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_SECRET;
    this.mode = process.env.PAYPAL_MODE || 'sandbox';
    this.baseUrl = this.mode === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Get PayPal Access Token
   * Caches token to avoid unnecessary API calls
   * @returns {string} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Cache for 55 minutes (token usually valid for 1 hour)
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('PayPal Access Token Error:', error.response?.data || error.message);
      throw new Error('Failed to get PayPal access token');
    }
  }

  /**
   * Create PayPal Order
   * @param {object} orderData - Order data { amount, currency, userId, blockId }
   * @returns {string} PayPal order ID
   */
  async createOrder(orderData) {
    try {
      const token = await this.getAccessToken();
      const { amount, currency = 'USD', userId, blockId } = orderData;

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toString()
              },
              description: `Pixel Ad Block #${blockId}`,
              custom_id: `${userId}|${blockId}` // Used to verify webhook
            }
          ],
          application_context: {
            return_url: `${process.env.CLIENT_URL}/payment/success`,
            cancel_url: `${process.env.CLIENT_URL}/payment/cancel`
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.id; // PayPal order ID
    } catch (error) {
      console.error('PayPal Create Order Error:', error.response?.data || error.message);
      throw new Error('Failed to create PayPal order');
    }
  }

  /**
   * Capture PayPal Order
   * Called after user completes payment on PayPal
   * @param {string} orderId - PayPal order ID
   * @returns {object} Capture result
   */
  async captureOrder(orderId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('PayPal Capture Order Error:', error.response?.data || error.message);
      throw new Error('Failed to capture PayPal order');
    }
  }

  /**
   * Verify PayPal Webhook Signature
   * SECURITY CRITICAL: Must verify all webhook events
   * @param {object} headers - Webhook request headers
   * @param {string} body - Raw webhook request body
   * @returns {boolean} True if signature is valid
   */
  async verifyWebhookSignature(headers, body) {
    try {
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const certUrl = headers['paypal-cert-url'];
      const transmissionSig = headers['paypal-transmission-sig'];
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;

      if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
        console.error('Missing webhook headers');
        return false;
      }

      // Create expected signature
      const expectedSigRaw = transmissionId + '|' + transmissionTime + '|' + webhookId + '|' + 
        crypto.createHash('sha256').update(body).digest('hex');

      const expectedSig = crypto
        .createHmac('sha256', process.env.PAYPAL_SECRET)
        .update(expectedSigRaw)
        .digest('base64');

      return expectedSig === transmissionSig;
    } catch (error) {
      console.error('Webhook Signature Verification Error:', error.message);
      return false;
    }
  }

  /**
   * Process Webhook Event
   * @param {object} event - PayPal webhook event
   * @returns {object} Processed event data
   */
  parseWebhookEvent(event) {
    const { event_type, resource, id: eventId } = event;
    
    return {
      eventType: event_type,
      eventId: eventId,
      resource: resource,
      orderId: resource.id,
      status: resource.status,
      amount: resource.amount?.value,
      currency: resource.amount?.currency_code,
      customId: resource.custom_id,
      paypalTransactionId: resource.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process Refund
   * @param {string} captureId - PayPal capture ID
   * @returns {object} Refund result
   */
  async refundPayment(captureId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('PayPal Refund Error:', error.response?.data || error.message);
      throw new Error('Failed to process refund');
    }
  }
}

export default new PayPalService();
