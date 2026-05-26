import { create } from 'zustand';

interface OutstandingUIState {
  search: string;
  companyFilter: string;
  selectedCustomerId: number | null;
  setSearch: (search: string) => void;
  setCompanyFilter: (companyFilter: string) => void;
  setSelectedCustomerId: (selectedCustomerId: number | null) => void;
}

export const useOutstandingStore = create<OutstandingUIState>((set) => ({
  search: '',
  companyFilter: 'all',
  selectedCustomerId: null,
  setSearch: (search) => set({ search }),
  setCompanyFilter: (companyFilter) => set({ companyFilter }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
}));
