import React from 'react';

const UserOrderStepper = ({ currentStatus, courierDetails }) => {
  const steps = [
    {
      status: 'pending',
      label: 'Order Placed',
      icon: '/images/order-placed.svg'
    },
    {
      status: 'confirmed',
      label: 'Confirmed',
      icon: '/images/confirmed.svg'
    },
    {
      status: 'dispatched',
      label: 'Dispatched',
      icon: '/images/dispatched.svg'
    },
    {
      status: 'delivered',
      label: 'Delivered',
      icon: '/images/delivered.svg'
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
                <img 
                  src={step.icon} 
                  alt={step.label}
                  className="w-4 h-4"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
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