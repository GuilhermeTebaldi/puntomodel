
import React from 'react';
import { BlogPost } from './types';

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'As melhores cidades para turismo de luxo no Brasil',
    excerpt: 'Descubra os destinos que oferecem as experiências mais exclusivas e sofisticadas do país.',
    content: 'O Brasil é um país de contrastes e belezas naturais sem igual. Quando falamos em turismo de luxo, algumas cidades se destacam pela infraestrutura impecável, gastronomia de classe mundial e serviços personalizados...',
    author: 'Admin',
    date: '12 de Fevereiro, 2024',
    category: 'Cidades',
    imageUrl: 'https://picsum.photos/seed/luxury/800/500'
  },
  {
    id: '2',
    title: 'Guia de etiqueta: Como se comportar em encontros de alto nível',
    excerpt: 'Dicas essenciais para garantir que sua experiência seja agradável e respeitosa para ambas as partes.',
    content: 'Elegância vai além das roupas. Trata-se de como você trata as pessoas e como se porta em diferentes ambientes...',
    author: 'Especialista',
    date: '10 de Fevereiro, 2024',
    category: 'Estilo de Vida',
    imageUrl: 'https://picsum.photos/seed/etiquette/800/500'
  },
  {
    id: '3',
    title: 'Entrevista: A rotina de uma modelo de sucesso',
    excerpt: 'Conversamos com uma das nossas modelos mais bem avaliadas sobre sua trajetória e cuidados diários.',
    content: 'Manter a forma e a saúde mental em uma profissão tão exigente requer disciplina e foco...',
    author: 'Redação',
    date: '08 de Fevereiro, 2024',
    category: 'Modelos',
    imageUrl: 'https://picsum.photos/seed/model/800/500'
  },
  {
    id: '4',
    title: 'Dicas de segurança para usuários da plataforma',
    excerpt: 'Sua privacidade e segurança são nossa prioridade. Confira como navegar com tranquilidade.',
    content: 'A Puntoescort investe constantemente em tecnologia para proteger seus dados e garantir encontros seguros...',
    author: 'Segurança',
    date: '05 de Fevereiro, 2024',
    category: 'Segurança',
    imageUrl: 'https://picsum.photos/seed/security/800/500'
  }
];

export const Logo = () => (
  <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#E31B23" />
      <path d="M2 17L12 22L22 17" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12L12 17L22 12" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>Punto<span className="text-gray-400 font-light italic">escort</span></span>
  </div>
);
