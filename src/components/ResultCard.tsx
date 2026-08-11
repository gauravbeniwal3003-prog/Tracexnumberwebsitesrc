import React from 'react';
import FormattedResponseCard from './FormattedResponseCard';

interface ResultCardProps {
  data: any;
  serviceType?: string;
  index?: number;
  key?: React.Key;
}

export default function ResultCard({ data, serviceType }: ResultCardProps) {
  return <FormattedResponseCard data={data} serviceType={serviceType} />;
}
