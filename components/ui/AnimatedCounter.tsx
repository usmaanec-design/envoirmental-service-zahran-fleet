import React from 'react';
import CountUp from 'react-countup';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1.5,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
}) => {
  return (
    <CountUp
      end={value}
      duration={duration}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      separator={separator}
      useEasing={true}
      easingFn={(t, b, c, d) => {
        // easeOutExpo
        return c * (-Math.pow(2, -10 * t / d) + 1) + b;
      }}
    />
  );
};

export default AnimatedCounter;
