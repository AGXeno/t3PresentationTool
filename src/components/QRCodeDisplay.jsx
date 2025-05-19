import React from 'react';
import QRCode from 'qrcode.react';

const QRCodeDisplay = ({ url }) => {
  return (
    <div className="qrcode-display">
      <h3>Scan to Participate</h3>
      <QRCode value={url} size={150} />
      //
      <p className="qrcode-url">{url}</p>
    </div>
  );
};

export default QRCodeDisplay;
