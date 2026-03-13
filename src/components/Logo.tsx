import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Shield/Circle for Protection */}
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        className="stroke-emerald-600 dark:stroke-emerald-400" 
        strokeWidth="2"
      />
      
      {/* Briefcase Base */}
      <path 
        d="M7 10H17V17C17 18.1046 16.1046 19 15 19H9C7.89543 19 7 18.1046 7 17V10Z" 
        className="fill-emerald-600 dark:fill-emerald-400"
      />
      
      {/* Briefcase Handle */}
      <path 
        d="M10 10V8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8V10" 
        className="stroke-emerald-600 dark:stroke-emerald-400" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      
      {/* Radar/Tracking Pulse */}
      <circle 
        cx="12" 
        cy="14.5" 
        r="1.5" 
        fill="white"
      />
      <path 
        d="M12 12C13.3807 12 14.5 13.1193 14.5 14.5" 
        stroke="white" 
        strokeWidth="1" 
        strokeLinecap="round"
      />
      <path 
        d="M9.5 14.5C9.5 13.1193 10.6193 12 12 12" 
        stroke="white" 
        strokeWidth="1" 
        strokeLinecap="round"
      />
    </svg>
  );
};
