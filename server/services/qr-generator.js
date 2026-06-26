/**
 * QRForge — QR Code Image Generator
 * 
 * Generates QR code images with customizable styles.
 * Supports PNG and SVG output formats.
 */

import QRCode from 'qrcode';

/**
 * Default QR style configuration.
 */
const DEFAULT_STYLE = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  errorCorrection: 'H', // Always H for logo support (30% recovery)
  margin: 2,
  width: 1024,
};

/**
 * Generate a QR code image as a Data URL (PNG).
 * @param {string} url - The URL to encode
 * @param {Object} styleConfig - Style customization
 * @returns {Promise<string>} Base64 data URL
 */
export async function generateQRDataUrl(url, styleConfig = {}) {
  const style = { ...DEFAULT_STYLE, ...styleConfig };

  const options = {
    errorCorrectionLevel: style.errorCorrection,
    margin: style.margin,
    width: style.width,
    color: {
      dark: style.fgColor,
      light: style.bgColor,
    },
  };

  return QRCode.toDataURL(url, options);
}

/**
 * Generate a QR code as PNG buffer.
 * @param {string} url - The URL to encode
 * @param {Object} styleConfig - Style customization
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateQRBuffer(url, styleConfig = {}) {
  const style = { ...DEFAULT_STYLE, ...styleConfig };

  const options = {
    errorCorrectionLevel: style.errorCorrection,
    margin: style.margin,
    width: style.width,
    color: {
      dark: style.fgColor,
      light: style.bgColor,
    },
    type: 'png',
  };

  return QRCode.toBuffer(url, options);
}

/**
 * Generate a QR code as SVG string.
 * @param {string} url - The URL to encode
 * @param {Object} styleConfig - Style customization
 * @returns {Promise<string>} SVG string
 */
export async function generateQRSvg(url, styleConfig = {}) {
  const style = { ...DEFAULT_STYLE, ...styleConfig };

  const options = {
    errorCorrectionLevel: style.errorCorrection,
    margin: style.margin,
    color: {
      dark: style.fgColor,
      light: style.bgColor,
    },
    type: 'svg',
  };

  return QRCode.toString(url, options);
}

export default {
  generateQRDataUrl,
  generateQRBuffer,
  generateQRSvg,
};
