/**
 * IPFS API Service — Frontend wrapper for IPFS operations
 * ═══════════════════════════════════════════════════════════════
 */

import { apiUrl, headers } from './api';

const ipfsApi = {
  /**
   * Pin current document to IPFS
   * @param {string} documentId - Document ID to pin
   * @returns {Promise<{ipfsHash, gatewayUrl, timestamp}>}
   */
  pinDocument: async (documentId) => {
    const response = await fetch(`${apiUrl}/documents/${documentId}/pin`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to pin document');
    }

    return response.json();
  },

  /**
   * Unpin document from IPFS
   * @param {string} documentId - Document ID to unpin
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  unpinDocument: async (documentId) => {
    const response = await fetch(`${apiUrl}/documents/${documentId}/unpin`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unpin document');
    }

    return response.json();
  },

  /**
   * Get IPFS info for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<{ipfsHash, gatewayUrl, pinnedAt}>}
   */
  getIpfsInfo: async (documentId) => {
    const response = await fetch(`${apiUrl}/documents/${documentId}/ipfs-info`, {
      method: 'GET',
      headers: await headers(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Document not pinned to IPFS');
    }

    return response.json();
  },

  /**
   * Check IPFS service status
   * @returns {Promise<{enabled, connected, message}>}
   */
  getStatus: async () => {
    try {
      const response = await fetch(`${apiUrl}/documents/test/ipfs-status`, {
        method: 'GET',
        headers: await headers(),
      });

      return response.json();
    } catch (error) {
      return {
        ok: false,
        enabled: false,
        connected: false,
        message: error.message,
      };
    }
  },
};

export default ipfsApi;
