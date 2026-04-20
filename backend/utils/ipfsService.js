const axios = require('axios');
const FormData = require('form-data');

/**
 * IPFS Service — Pinata integration for document storage
 * ═══════════════════════════════════════════════════════════════
 * Handles pinning documents to IPFS via Pinata gateway
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

class IPFSService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.apiSecret = process.env.PINATA_API_SECRET;
    this.jwt = process.env.PINATA_JWT;
    this.enabled = process.env.IPFS_ENABLED === 'true';

    if (this.enabled && !this.jwt) {
      console.warn('⚠️  IPFS enabled but JWT not configured in environment');
    }
  }

  /**
   * Verify connection to Pinata API
   */
  async verifyConnection() {
    if (!this.enabled) {
      console.log('ℹ️  IPFS integration disabled');
      return false;
    }

    try {
      const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`,
        },
      });
      console.log('✅ IPFS (Pinata) connection verified');
      return true;
    } catch (error) {
      console.error('❌ IPFS connection failed:', error.message);
      return false;
    }
  }

  /**
   * Pin document content to IPFS
   * @param {Object} document - Document object { title, content, id }
   * @returns {Promise<{ipfsHash, gatewayUrl, timestamp}>}
   */
  async pinDocument(document) {
    if (!this.enabled) {
      throw new Error('IPFS integration is not enabled');
    }

    if (!document || !document.content) {
      throw new Error('Document content is required');
    }

    try {
      // Create document metadata with content
      const documentData = {
        id: document.id || `doc-${Date.now()}`,
        title: document.title || 'Untitled Document',
        content: document.content,
        author: document.author || 'Anonymous',
        createdAt: document.createdAt || new Date().toISOString(),
        pinnedAt: new Date().toISOString(),
      };

      // Create FormData for file upload
      const form = new FormData();
      form.append('file', Buffer.from(JSON.stringify(documentData)), 'document.json');

      // Add metadata
      const metadata = {
        name: `${documentData.title} (${documentData.id})`,
        keyvalues: {
          docId: documentData.id,
          docTitle: documentData.title,
          timestamp: Date.now(),
        },
      };
      form.append('pinataMetadata', JSON.stringify(metadata));

      // Pin options: auto-remove after 30 days if not refreshed
      const pinOptions = {
        cidVersion: 0,
        progress: false,
      };
      form.append('pinataOptions', JSON.stringify(pinOptions));

      // Upload to Pinata
      const response = await axios.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.jwt}`,
        },
        timeout: 30000,
      });

      const ipfsHash = response.data.IpfsHash;
      const gatewayUrl = `${PINATA_GATEWAY}/${ipfsHash}`;

      console.log(`✅ Document pinned to IPFS: ${ipfsHash}`);

      return {
        ipfsHash,
        gatewayUrl,
        timestamp: new Date().toISOString(),
        size: response.data.PinSize,
      };
    } catch (error) {
      console.error('❌ Failed to pin document to IPFS:', error.message);
      throw new Error(`IPFS pin failed: ${error.message}`);
    }
  }

  /**
   * Update existing pinned document
   * @param {string} oldHash - Previous IPFS hash to unpin
   * @param {Object} document - Updated document
   * @returns {Promise<{ipfsHash, gatewayUrl}>}
   */
  async updatePinnedDocument(oldHash, document) {
    if (!this.enabled) {
      throw new Error('IPFS integration is not enabled');
    }

    try {
      // Pin new version
      const newPin = await this.pinDocument(document);

      // Unpin old version (async, non-blocking)
      if (oldHash) {
        this.unpinDocument(oldHash).catch((err) => {
          console.warn(`⚠️  Failed to unpin old version ${oldHash}:`, err.message);
        });
      }

      return newPin;
    } catch (error) {
      console.error('❌ Failed to update pinned document:', error.message);
      throw error;
    }
  }

  /**
   * Unpin document from IPFS
   * @param {string} ipfsHash - IPFS hash to remove
   * @returns {Promise<boolean>}
   */
  async unpinDocument(ipfsHash) {
    if (!this.enabled || !this.jwt) {
      return false;
    }

    try {
      await axios.delete(`${PINATA_API_URL}/pinning/unpin/${ipfsHash}`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`,
        },
      });
      console.log(`✅ Document unpinned from IPFS: ${ipfsHash}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to unpin document:', error.message);
      return false;
    }
  }

  /**
   * Get all pinned documents
   * @returns {Promise<Array>}
   */
  async listPinnedDocuments() {
    if (!this.enabled || !this.jwt) {
      return [];
    }

    try {
      const response = await axios.get(`${PINATA_API_URL}/data/pinList?status=pinned`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`,
        },
      });

      return response.data.rows || [];
    } catch (error) {
      console.error('❌ Failed to list pinned documents:', error.message);
      return [];
    }
  }

  /**
   * Generate IPFS gateway URL
   * @param {string} hash - IPFS hash
   * @returns {string} - Gateway URL
   */
  getGatewayUrl(hash) {
    return `${PINATA_GATEWAY}/${hash}`;
  }

  /**
   * Check if hash is valid IPFS hash
   * @param {string} hash - Hash to validate
   * @returns {boolean}
   */
  isValidIPFSHash(hash) {
    // Valid CIDv0: starts with Qm and is 46 characters
    // Valid CIDv1: starts with bafy and is variable length
    const cidv0Pattern = /^Qm[a-zA-Z0-9]{44}$/;
    const cidv1Pattern = /^bafy[a-zA-Z0-9]+$/;
    return cidv0Pattern.test(hash) || cidv1Pattern.test(hash);
  }
}

// Singleton instance
const ipfsService = new IPFSService();

// Verify connection on startup
if (process.env.IPFS_ENABLED === 'true') {
  ipfsService.verifyConnection().catch((err) => {
    console.error('IPFS verification failed:', err);
  });
}

module.exports = ipfsService;
