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
  setSortOrder: Dispatch<SetStateAction<SortOrder>>;
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
  favoriteIds: string[];
  toggleFavorite: (serverId: string, next?: boolean) => void;
  openDetails: (serverId: string) => void;
  closeDetails: () => void;
  isModalOpen: boolean;
  openAddModal: () => void;
  closeModal: () => void;
  addServer: (payload: Partial<DecayServer>) => DecayServer;
  updateServer: (serverId: string, payload: Partial<DecayServer>) => void;
}

export function useDecayState({ translate, searchParams, setSearchParams }: UseDecayStateArgs): UseDecayStateResult {
  const [servers, setServers] = useState<DecayServer[]>(() => normalizeServerList(loadJSON(STORAGE_KEYS.decayServers, [])));
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const stored = loadJSON<unknown>(STORAGE_KEYS.decayFavorites, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter((value): value is string => typeof value === 'string');
  });
  const [sortField, setSortField] = useState<SortField>(() => {
    const stored = loadJSON<unknown>(STORAGE_KEYS.decaySortField, 'server');
    if (typeof stored === 'string' && SORT_FIELDS.includes(stored as SortField)) {
      return stored as SortField;
    }
    return 'server';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const stored = loadJSON<unknown>(STORAGE_KEYS.decaySortOrder, 'asc');
    return stored === 'desc' ? 'desc' : 'asc';
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryServerId = searchParams.get('serverId');
  const [viewedServerId, setViewedServerId] = useState<string | null>(queryServerId);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decayServers, servers);
  }, [servers]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => servers.some((server) => server.id === id)));
  }, [servers]);

  useEffect(() => {
    setFavoriteIds((prev) => {
      const filtered = prev.filter((id) => servers.some((server) => server.id === id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [servers]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decayFavorites, favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decaySortField, sortField);
  }, [sortField]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decaySortOrder, sortOrder);
  }, [sortOrder]);

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
      const isFavorite = favoriteIds.includes(server.id);
      return { view, matches, isFavorite };
    });

    const filtered = mapped.filter((server) => server.matches);
    filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      let compare = 0;
      switch (sortField) {
        case 'map':
          compare = a.view.map.name.localeCompare(b.view.map.name);
          break;
        case 'structure':
          compare = a.view.structure.name.localeCompare(b.view.structure.name);
          break;
        case 'decay':
          compare = a.view.secondsRemaining - b.view.secondsRemaining;
          break;
        case 'server':
        default:
          compare = (a.view.serverNumber ?? 0) - (b.view.serverNumber ?? 0);
          break;
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

    return filtered.map((server) => ({ ...server.view, isFavorite: server.isFavorite }));
  }, [servers, translate, searchKeywords, sortField, sortOrder, favoriteIds]);

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

  const toggleFavorite = (serverId: string, next?: boolean) => {
    setFavoriteIds((prev) => {
      const isFavorite = prev.includes(serverId);
      const shouldFavorite = typeof next === 'boolean' ? next : !isFavorite;
      if (shouldFavorite) {
        if (isFavorite) return prev;
        return [...prev, serverId];
      }
      if (!isFavorite) return prev;
      return prev.filter((id) => id !== serverId);
    });
  };

  const handleRefreshAll = () => {
    const now = Date.now();
    setServers((prev) =>
      prev.map((server) => ({
        ...server,
        updatedAt: now,
        creatureUpdatedAt: server.creatureEnabled ? now : server.creatureUpdatedAt,
      })),
    );
  };

  const handleRefresh = (serverId: string) => {
    const now = Date.now();
    setServers((prev) =>
      prev.map((server) =>
        server.id === serverId
          ? {
              ...server,
              updatedAt: now,
              creatureUpdatedAt: server.creatureEnabled ? now : server.creatureUpdatedAt,
            }
          : server,
      ),
    );
    setSelectedIds((prev) => prev.filter((id) => id !== serverId));
  };

  const handleRefreshSelected = () => {
    if (!selectedIds.length) return;
    const now = Date.now();
    setServers((prev) =>
      prev.map((server) =>
        selectedIds.includes(server.id)
          ? {
              ...server,
              updatedAt: now,
              creatureUpdatedAt: server.creatureEnabled ? now : server.creatureUpdatedAt,
            }
          : server,
      ),
    );
    setSelectedIds([]);
  };

  const handleDelete = (serverId: string) => {
    setServers((prev) => prev.filter((server) => server.id !== serverId));
    setSelectedIds((prev) => prev.filter((id) => id !== serverId));
    setFavoriteIds((prev) => {
      if (!prev.includes(serverId)) return prev;
      return prev.filter((id) => id !== serverId);
    });
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
    setFavoriteIds((prev) => {
      const filtered = prev.filter((id) => !toRemove.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
    setSelectedIds([]);
  };

  const openAddModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

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
    return entry;
  };

  const updateServer = (serverId: string, payload: Partial<DecayServer>) => {
    const now = Date.now();
    setServers((prev) =>
      prev.map((server) => {
        if (server.id !== serverId) return server;
        const nextUpdatedAt = payload.updatedAt ?? now;
        const nextCreatureEnabled = typeof payload.creatureEnabled === 'boolean' ? payload.creatureEnabled : server.creatureEnabled;
        let nextCreatureUpdatedAt: number | null = server.creatureUpdatedAt ?? null;

        if (nextCreatureEnabled) {
          if (typeof payload.creatureUpdatedAt === 'number') {
            nextCreatureUpdatedAt = payload.creatureUpdatedAt;
          } else if (!server.creatureEnabled) {
            nextCreatureUpdatedAt = payload.updatedAt ?? nextUpdatedAt;
          } else if (payload.updatedAt) {
            nextCreatureUpdatedAt = payload.updatedAt;
          }
        } else {
          nextCreatureUpdatedAt = null;
        }

        return normalizeServer({
          ...server,
          ...payload,
          updatedAt: nextUpdatedAt,
          creatureEnabled: nextCreatureEnabled,
          creatureUpdatedAt: nextCreatureUpdatedAt ?? undefined,
        });
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
    setSortOrder,
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
    favoriteIds,
    toggleFavorite,
    openDetails,
    closeDetails,
    isModalOpen,
    openAddModal,
    closeModal,
    addServer,
    updateServer,
  };
}

export { SORT_FIELDS };
