
import React from 'react';
import { UserPlus, Users, PlayCircle, Star } from 'lucide-react';
import { StatItem, NavLink } from './types';

export const COLORS = {
  primary: '#e3262e',
  secondary: '#f3f4f6',
  textMain: '#111827',
  textMuted: '#6b7280',
};

// FALLBACK_DATA: usado apenas quando o backend não responder
export const STATS: StatItem[] = [
  { value: '+22 milhões', label: 'de usuários' },
  { value: '+70 mil', label: 'acompanhantes' },
  { value: '+0', label: 'de imagens' },
  { value: '+0', label: 'avaliações' },
];

export const BOTTOM_NAV: NavLink[] = [
  { label: 'Cadastre Grátis', href: '#', icon: <UserPlus className="w-5 h-5" /> },
  { label: 'Acompanhantes', href: '#', icon: <Users className="w-5 h-5" /> },
  { label: 'Punto Shots', href: '#', icon: <PlayCircle className="w-5 h-5" /> },
  { label: 'Avaliações', href: '#', icon: <Star className="w-5 h-5" /> },
];
