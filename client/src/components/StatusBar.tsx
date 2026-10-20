import React from 'react';

interface StatusBarProps {
  message: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  return <div id="status">{message}</div>;
};
