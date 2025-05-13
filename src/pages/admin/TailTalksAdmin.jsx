import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TailTalksManagement from './TailTalksManagement';

const TailTalksAdmin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tail Talks Management</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <TailTalksManagement />
        </div>
      </div>
    </div>
  );
};

export default TailTalksAdmin; 