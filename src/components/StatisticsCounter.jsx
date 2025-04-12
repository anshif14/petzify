import React, { useState, useEffect } from 'react';

const StatisticsCounter = () => {
  const [stats, setStats] = useState({
    petsAdopted: 1000,
    happyFamilies: 500,
    partnerShelters: 50,
    brands: 30,
    isLoading: true
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // For a real implementation, you would fetch actual counts from Firestore
        // This is simplified to match the image requirement
        
        setStats({
          petsAdopted: 1000,
          happyFamilies: 500, 
          partnerShelters: 50,
          brands: 30,
          isLoading: false
        });
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setStats({
          petsAdopted: 1000,
          happyFamilies: 500,
          partnerShelters: 50,
          brands: 30,
          isLoading: false
        });
      }
    };

    fetchStatistics();
  }, []);

  // Function to animate the counter display
  const Counter = ({ value, label }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      if (stats.isLoading) return;
      
      // If the value is not a number (like '24/7'), just set it directly
      if (typeof value !== 'number') {
        setCount(value);
        return;
      }
      
      const duration = 2000; // 2 seconds animation
      const steps = 50;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          clearInterval(timer);
          setCount(value);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }, [value]);
    
    return (
      <div className="flex flex-col items-center">
        <h3 className="text-5xl font-bold mb-2 text-primary">
          {typeof count === 'number' ? count.toLocaleString() + '+' : count}
        </h3>
        <p className="text-center text-primary">{label}</p>
      </div>
    );
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
          <Counter value={stats.petsAdopted} label="Pets Adopted" />
          <Counter value={stats.happyFamilies} label="Happy Families" />
          <Counter value={stats.partnerShelters} label="Partner Shelters" />
          <Counter value={stats.brands} label="Brands" />
        </div>
      </div>
    </section>
  );
};

export default StatisticsCounter; 