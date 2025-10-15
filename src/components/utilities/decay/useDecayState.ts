import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { DecayServer, DecayServerView, SortField } from './decayTypes';
import {
  CREATURE_DEFAULT_DECAY_SECONDS,
  SORT_FIELDS,
  buildServerView,
  generateServerId,
  normalizeServer,
  normalizeServerList,
  normalizeText,
} from './decayUtils';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../../../utils/storage';

export type SortOrder = 'asc' | 'desc';

interface UseDecayStateArgs {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  searchParams: URLSearchParams;
  setSearchParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void;
}

interface UseDecayStateResult {
  servers: DecayServer[];
  setServers: Dispatch<SetStateAction<DecayServer[]>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  sortField: SortField;
  setSortField: Dispatch<SetStateAction<SortField>>;
  sortOrder: SortOrder;
  toggleSortOrder: () => void;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  handleToggleSelectAll: (checked: boolean) => void;
  toggleSelection: (serverId: string, checked: boolean) => void;
  handleRefreshAll: () => void;
  handleRefresh: (serverId: string) => void;
  handleRefreshSelected: () => void;
  handleDelete: (serverId: string) => void;
  handleDeleteSelected: () => void;
  enrichedServers: DecayServerView[];
  activeServer: DecayServerView | null;
  openDetails: (serverId: string) => void;
  closeDetails: () => void;
  isModalOpen: boolean;
  openAddModal: () => void;
  openEditModal: (serverId: string) => void;
  closeModal: () => void;
  modalMode: 'add' | 'edit';
  editingServer: DecayServer | null;
  addServer: (payload: Partial<DecayServer>) => DecayServer;
  updateServer: (serverId: string, payload: Partial<DecayServer>) => void;
}

export function useDecayState({ translate, searchParams, setSearchParams }: UseDecayStateArgs): UseDecayStateResult {
  const [servers, setServers] = useState<DecayServer[]>(() => normalizeServerList(loadJSON(STORAGE_KEYS.decayServers, [])));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('server');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  const queryServerId = searchParams.get('serverId');
  const [viewedServerId, setViewedServerId] = useState<string | null>(queryServerId);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decayServers, servers);
  }, [servers]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => servers.some((server) => server.id === id)));
  }, [servers]);

  useEffect(() => {
    if (queryServerId && servers.some((server) => server.id === queryServerId)) {
      setViewedServerId(queryServerId);
    } else {
      if (queryServerId) {
        const next = new URLSearchParams(searchParams);
        next.delete('serverId');
        setSearchParams(next, { replace: true });
      }
      setViewedServerId(null);
    }
  }, [queryServerId, searchParams, servers, setSearchParams]);

  const setServerParam = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) {
      next.set('serverId', id);
    } else {
      next.delete('serverId');
    }
    setSearchParams(next, { replace: true });
  };

  const openDetails = (serverId: string) => setServerParam(serverId);
  const closeDetails = () => setServerParam(null);

  const normalizedSearch = normalizeText(searchTerm);
  const searchKeywords = useMemo(() => normalizedSearch.split(/\s+/).filter(Boolean), [normalizedSearch]);

  const enrichedServers = useMemo(() => {
    const mapped = servers.map((server) => {
      const view = buildServerView(server, translate);
      const haystack = normalizeText(`${view.map.name} ${view.structure.name} ${view.serverNumber ?? ''} ${view.note ?? ''}`);
      const matches = searchKeywords.length === 0 || searchKeywords.every((keyword) => haystack.includes(keyword));
      return { ...view, matches } as DecayServerView & { matches: boolean };
    });

    const filtered = mapped.filter((server) => server.matches);
    return filtered.sort((a, b) => {
      let compare = 0;
      switch (sortField) {
        case 'map':
          compare = a.map.name.localeCompare(b.map.name);
          break;
        case 'structure':
          compare = a.structure.name.localeCompare(b.structure.name);
          break;
        case 'server':
        default:
          compare = (a.serverNumber ?? 0) - (b.serverNumber ?? 0);
          break;
      }
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [servers, translate, searchKeywords, sortField, sortOrder]);

  const activeServer = useMemo(() => enrichedServers.find((server) => server.id === viewedServerId) ?? null, [enrichedServers, viewedServerId]);

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === enrichedServers.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < enrichedServers.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(enrichedServers.map((server) => server.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelection = (serverId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(serverId)) return prev;
        return [...prev, serverId];
      }
      return prev.filter((id) => id !== serverId);
    });
  };

  const handleRefreshAll = () => {
    const now = Date.now();
    setServers((prev) => prev.map((server) => ({ ...server, updatedAt: now })));
  };

  const handleRefresh = (serverId: string) => {
    const now = Date.now();
    setServers((prev) => prev.map((server) => (server.id === serverId ? { ...server, updatedAt: now } : server)));
    setSelectedIds((prev) => prev.filter((id) => id !== serverId));
  };

  const handleRefreshSelected = () => {
    if (!selectedIds.length) return;
    const now = Date.now();
    setServers((prev) => prev.map((server) => (selectedIds.includes(server.id) ? { ...server, updatedAt: now } : server)));
    setSelectedIds([]);
  };

  const handleDelete = (serverId: string) => {
    setServers((prev) => prev.filter((server) => server.id !== serverId));
    setSelectedIds((prev) => prev.filter((id) => id !== serverId));
    if (viewedServerId === serverId) {
      closeDetails();
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    const toRemove = new Set(selectedIds);
    setServers((prev) => prev.filter((server) => !toRemove.has(server.id)));
    if (viewedServerId && toRemove.has(viewedServerId)) {
      closeDetails();
    }
    setSelectedIds([]);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingServerId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (serverId: string) => {
    setModalMode('edit');
    setEditingServerId(serverId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingServerId(null);
    setModalMode('add');
  };

  const editingServer = editingServerId ? (servers.find((server) => server.id === editingServerId) ?? null) : null;

  const addServer = (payload: Partial<DecayServer>): DecayServer => {
    const now = Date.now();
    const entry = normalizeServer({
      ...payload,
      id: generateServerId(),
      createdAt: now,
      updatedAt: now,
      creatureDecaySeconds: CREATURE_DEFAULT_DECAY_SECONDS,
    });
    setServers((prev) => [...prev, entry]);
    openDetails(entry.id);
    return entry;
  };

  const updateServer = (serverId: string, payload: Partial<DecayServer>) => {
    const now = Date.now();
    setServers((prev) =>
      prev.map((server) => {
        if (server.id !== serverId) return server;
        return normalizeServer({ ...server, ...payload, updatedAt: now });
      }),
    );
  };

  return {
    servers,
    setServers,
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    toggleSortOrder,
    selectedIds,
    setSelectedIds,
    isAllSelected,
    isSomeSelected,
    handleToggleSelectAll,
    toggleSelection,
    handleRefreshAll,
    handleRefresh,
    handleRefreshSelected,
    handleDelete,
    handleDeleteSelected,
    enrichedServers,
    activeServer,
    openDetails,
    closeDetails,
    isModalOpen,
    openAddModal,
    openEditModal,
    closeModal,
    modalMode,
    editingServer,
    addServer,
    updateServer,
  };
}

export { SORT_FIELDS };
