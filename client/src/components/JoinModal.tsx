import React, { useState } from 'react';

interface JoinModalProps {
  onJoin: (name: string) => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ onJoin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    onJoin(trimmed || 'Anonymous');
  };

  return (
    <div id="nameBox">
      <div className="name-card">
        <h2>Pinehall Virtual Space</h2>
        <p>Enter your display name to join the space:</p>
        <form onSubmit={handleSubmit} className="input-row">
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <button type="submit" id="joinBtn">
            Join
          </button>
        </form>
      </div>
    </div>
  );
};
