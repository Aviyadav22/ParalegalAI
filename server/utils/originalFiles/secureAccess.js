const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use the existing JWT_SECRET from environment or generate a fallback
const SECRET = process.env.JWT_SECRET || process.env.SIG_KEY || 'fallback-secret-key';

/**
 * Generate a secure, time-limited token for accessing an original file
 * @param {string} fileId - The file ID to grant access to
 * @param {Object} options - Token options
 * @param {number} options.expiresIn - Token expiration in seconds (default: 300 = 5 minutes)
 * @param {string} options.userId - Optional user ID for audit trail
 * @returns {string} Signed JWT token
 */
function generateFileAccessToken(fileId, options = {}) {
  const {
    expiresIn = 300, // 5 minutes default
    userId = null,
    workspaceId = null
  } = options;

  const payload = {
    fileId,
    type: 'file-access',
    userId,
    workspaceId,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, SECRET, { expiresIn });
}

/**
 * Verify a file access token
 * @param {string} token - The JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyFileAccessToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);
    
    // Verify it's a file access token
    if (decoded.type !== 'file-access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    // Token expired, invalid signature, or malformed
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Generate a secure URL for accessing an original file
 * @param {string} fileId - The file ID
 * @param {Object} options - URL generation options
 * @returns {string} Secure URL with token
 */
function generateSecureFileUrl(fileId, options = {}) {
  const token = generateFileAccessToken(fileId, options);
  const baseUrl = options.baseUrl || '';
  return `${baseUrl}/api/original-files/${fileId}?token=${token}`;
}

/**
 * Middleware to verify file access token from request
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Express next function
 */
function verifyFileAccessMiddleware(request, response, next) {
  const token = request.query.token || request.headers['x-file-access-token'];
  
  if (!token) {
    return response.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const decoded = verifyFileAccessToken(token);
  
  if (!decoded) {
    return response.status(401).json({
      success: false,
      error: 'Invalid or expired access token'
    });
  }

  // Verify the fileId in token matches the requested fileId
  if (decoded.fileId !== request.params.fileId) {
    return response.status(403).json({
      success: false,
      error: 'Token does not match requested file'
    });
  }

  // Attach decoded token to request for potential audit logging
  request.fileAccessToken = decoded;
  
  next();
}

module.exports = {
  generateFileAccessToken,
  verifyFileAccessToken,
  generateSecureFileUrl,
  verifyFileAccessMiddleware
};
