import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

export interface Term {
  id: number;
  name: string;
  tier: number;
  category: string;
  description: string;
}

export interface Edge {
  id: number;
  from_term_id: number;
  to_term_id: number;
  from_term_name: string;
  to_term_name: string;
  keyword: string;
  description: string;
  difficulty: string;
}

interface DataContextType {
  terms: Term[];
  edges: Edge[];
  loading: boolean;
  error: string | null;
  getEdgesForTerm: (termId: number) => Edge[];
  getTermsByTier: (tier: number | 'all') => Term[];
  refetch: () => Promise<void>;
  // CRUD helpers for local cache update
  addTerm: (term: Term) => void;
  updateTerm: (term: Term) => void;
  deleteTerm: (id: number) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (edge: Edge) => void;
  deleteEdge: (id: number) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [termsRes, edgesRes] = await Promise.all([
        fetch('/api/admin/terms/all'),
        fetch('/api/admin/edges/all'),
      ]);

      if (!termsRes.ok) throw new Error('Failed to fetch terms');
      if (!edgesRes.ok) throw new Error('Failed to fetch edges');

      const [termsData, edgesData] = await Promise.all([
        termsRes.json(),
        edgesRes.json(),
      ]);

      // Sort terms by tier (asc)
      termsData.sort((a: Term, b: Term) => a.tier - b.tier);

      setTerms(termsData);
      setEdges(edgesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Index edges by term_id for fast lookup
  const edgesByTermId = useMemo(() => {
    const map = new Map<number, Edge[]>();
    for (const edge of edges) {
      if (!map.has(edge.from_term_id)) {
        map.set(edge.from_term_id, []);
      }
      map.get(edge.from_term_id)!.push(edge);

      if (!map.has(edge.to_term_id)) {
        map.set(edge.to_term_id, []);
      }
      map.get(edge.to_term_id)!.push(edge);
    }
    return map;
  }, [edges]);

  // Index terms by tier
  const termsByTier = useMemo(() => {
    const map = new Map<number, Term[]>();
    map.set(1, []);
    map.set(2, []);
    map.set(3, []);
    for (const term of terms) {
      map.get(term.tier)?.push(term);
    }
    return map;
  }, [terms]);

  const getEdgesForTerm = (termId: number): Edge[] => {
    return edgesByTermId.get(termId) || [];
  };

  const getTermsByTier = (tier: number | 'all'): Term[] => {
    if (tier === 'all') return terms;
    return termsByTier.get(tier) || [];
  };

  // CRUD helpers
  const addTerm = (term: Term) => {
    setTerms(prev => [...prev, term].sort((a, b) => a.tier - b.tier));
  };

  const updateTerm = (term: Term) => {
    setTerms(prev => prev.map(t => t.id === term.id ? term : t).sort((a, b) => a.tier - b.tier));
  };

  const deleteTerm = (id: number) => {
    setTerms(prev => prev.filter(t => t.id !== id));
    // Also remove edges connected to this term
    setEdges(prev => prev.filter(e => e.from_term_id !== id && e.to_term_id !== id));
  };

  const addEdge = (edge: Edge) => {
    setEdges(prev => [...prev, edge]);
  };

  const updateEdge = (edge: Edge) => {
    setEdges(prev => prev.map(e => e.id === edge.id ? edge : e));
  };

  const deleteEdge = (id: number) => {
    setEdges(prev => prev.filter(e => e.id !== id));
  };

  return (
    <DataContext.Provider value={{
      terms, edges, loading, error,
      getEdgesForTerm, getTermsByTier, refetch: fetchData,
      addTerm, updateTerm, deleteTerm,
      addEdge, updateEdge, deleteEdge,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}

// Backward compatibility
export function useEdges() {
  const { edges, loading, error, getEdgesForTerm, refetch } = useData();
  return { edges, loading, error, getEdgesForTerm, refetch };
}
