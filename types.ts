
// Fix: Import React to resolve the 'React' namespace error for React.ReactNode
import React from 'react';

export interface StatItem {
  value: string;
  label: string;
}

export interface NavLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
}
