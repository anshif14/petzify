import React from 'react';

const OrderStepper = ({ currentStatus, courierDetails }) => {
  const steps = [
    {
      status: 'pending',
      label: 'Order Placed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      status: 'confirmed',
      label: 'Confirmed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      status: 'dispatched',
      label: 'Dispatched',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      status: 'delivered',
      label: 'Delivered',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
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
    <div className="w-full py-6">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.status}>
            {/* Step */}
            <div className="relative flex flex-col items-center flex-1">
              {/* Circle and Icon */}
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
                  ${
                    getStepStatus(step.status) === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : getStepStatus(step.status) === 'current'
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-gray-200 border-gray-300'
                  }`}
              >
                <div className={getStepStatus(step.status) === 'upcoming' ? 'text-gray-500' : 'text-white'}>
                  {step.icon}
                </div>
              </div>
              
              {/* Label */}
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">
                  {step.label}
                </div>
                {step.status === 'dispatched' && currentStatus === 'dispatched' && courierDetails && (
                  <div className="text-xs text-gray-500 mt-1">
                    {courierDetails.company}<br />
                    Tracking: {courierDetails.trackingNumber}
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-6 left-full w-full h-0.5 transform -translate-y-1/2
                    ${
                      getStepStatus(step.status) === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default OrderStepper; 