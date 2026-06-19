import { useState } from 'react';
import { Info, X } from 'lucide-react';

export const InfoBanner = ({ message }: { message: string }) => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="info-banner">
      <Info size={15} />
      <span>{message} <a href="#">Support Server</a>.</span>
      <button className="info-banner-close" onClick={() => setVisible(false)}><X size={14}/></button>
    </div>
  );
};
