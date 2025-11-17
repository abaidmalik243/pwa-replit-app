import { useState } from 'react';
import CategoryFilter from '../CategoryFilter';

export default function CategoryFilterExample() {
  const [active, setActive] = useState('All');
  const categories = ['All', 'Bestsellers', 'Appetizers', 'Main Course', 'Desserts', 'Beverages'];
  
  return (
    <CategoryFilter 
      categories={categories}
      activeCategory={active}
      onCategoryChange={setActive}
    />
  );
}
