import React from 'react';
import FormattedResponseCard from './FormattedResponseCard';

interface ResultCardProps {
  result?: any;
  aadhaarPanResult?: any;
  data?: any;
  serviceType?: string;
  service?: string;
  index?: number;
  key?: React.Key;
  copiedResponse?: boolean;
  handleCopyResponse?: () => void;
}

export default function ResultCard(props: ResultCardProps) {
  // Try to find the data payload from the possible props
  const payload = props.aadhaarPanResult || props.result || props.data;
  const sType = props.service || props.serviceType || 'data';
  
  if (!payload) return null;

  return (
    <FormattedResponseCard 
      data={payload} 
      serviceType={sType} 
    />
  );
}
