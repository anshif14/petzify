import React from 'react';

const UserOrderStepper = ({ currentStatus, courierDetails }) => {
  const steps = [
    {
      status: 'pending',
      label: 'Order Placed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      status: 'confirmed',
      label: 'Confirmed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    {
      status: 'dispatched',
      label: 'Dispatched',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    {
      status: 'delivered',
      label: 'Delivered',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
  ];

  const getStepStatus = (stepStatus) => {
    const statusOrder = ['pending', 'confirmed', 'dispatched', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.status}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  getStepStatus(step.status) === 'completed'
                    ? 'bg-green-500 text-white'
                    : getStepStatus(step.status) === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.icon}
              </div>
              <p
                className={`mt-1 text-[10px] font-medium ${
                  getStepStatus(step.status) === 'completed'
                    ? 'text-green-500'
                    : getStepStatus(step.status) === 'current'
                    ? 'text-blue-500'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  getStepStatus(steps[index + 1].status) === 'completed'
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Courier Details */}
      {currentStatus === 'dispatched' && courierDetails && (
        <div className="mt-2 p-1.5 bg-blue-50 rounded-lg text-[10px]">
          <p className="text-blue-800">
            <span className="font-medium">Courier:</span> {courierDetails.company}
          </p>
          <p className="text-blue-800">
            <span className="font-medium">Tracking Number:</span> {courierDetails.trackingNumber}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserOrderStepper; 