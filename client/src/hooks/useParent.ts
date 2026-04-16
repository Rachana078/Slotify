import { useState } from 'react';

export function useParent() {
  const [parentId] = useState(() => localStorage.getItem('parentId'));
  const saveParent = (id: string) => localStorage.setItem('parentId', id);
  return { parentId, saveParent };
}
