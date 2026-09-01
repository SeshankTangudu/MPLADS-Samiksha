import React from 'react';
import { Info } from 'lucide-react';

export const DisclaimerBanner = () => {
  return (
    <div className="bg-amber-50/90 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-center space-x-2">
      <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <p className="font-medium">
        <span className="font-bold">Standing Disclaimer:</span> Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.
      </p>
    </div>
  );
};

export default DisclaimerBanner;
