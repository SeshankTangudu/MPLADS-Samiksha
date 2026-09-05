import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectsAPI } from '../services/api';

const RoleContext = createContext();

export const ROLES = {
  CITIZEN: 'citizen',
  MP: 'mp',
  AUTHORITY: 'authority',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.MP]: 'MP',
  [ROLES.AUTHORITY]: 'Authority',
};

// Initial fallback authentic constituencies
export const DEFAULT_CONSTITUENCIES = [
  'Varanasi',
  'Bangalore South',
  'Thiruvananthapuram',
  'Mumbai North',
  'Kolkata Uttar',
  'Nagpur',
  'Gwalior',
  'Patna Sahib',
  'Jaipur',
  'Ahmedabad East',
  'Hamirpur',
  'Adilabad (St)',
  'Amritsar',
  'Gorakhpur',
  'Asansol'
];

export const RoleProvider = ({ children }) => {
  const [viewRole, setViewRole] = useState(() => {
    try {
      const saved = localStorage.getItem('mplads_view_role');
      return saved && Object.values(ROLES).includes(saved) ? saved : ROLES.CITIZEN;
    } catch (e) {
      return ROLES.CITIZEN;
    }
  });

  const [constituencyList, setConstituencyList] = useState(DEFAULT_CONSTITUENCIES);

  const [selectedConstituency, setSelectedConstituency] = useState(() => {
    try {
      const saved = localStorage.getItem('mplads_mp_constituency');
      return saved || 'Varanasi';
    } catch (e) {
      return 'Varanasi';
    }
  });

  // Fetch all authentic distinct constituencies from SQLite DB
  useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const data = await ProjectsAPI.getConstituencies();
        if (data && Array.isArray(data) && data.length > 0) {
          setConstituencyList(data);
        }
      } catch (err) {
        console.warn('Failed to load dynamic constituency list, using defaults:', err);
      }
    };
    fetchConstituencies();
  }, []);

  const changeRole = (newRole) => {
    if (Object.values(ROLES).includes(newRole)) {
      setViewRole(newRole);
      try {
        localStorage.setItem('mplads_view_role', newRole);
      } catch (e) {
        console.warn('Failed to persist view role:', e);
      }
    }
  };

  const changeConstituency = (newConst) => {
    if (newConst && newConst.trim()) {
      setSelectedConstituency(newConst);
      try {
        localStorage.setItem('mplads_mp_constituency', newConst);
      } catch (e) {
        console.warn('Failed to persist MP constituency:', e);
      }
    }
  };

  return (
    <RoleContext.Provider
      value={{
        viewRole,
        changeRole,
        selectedConstituency,
        changeConstituency,
        constituencyList,
        PROTOTYPE_CONSTITUENCIES: constituencyList,
        ROLES,
        ROLE_LABELS,
        isCitizen: viewRole === ROLES.CITIZEN,
        isMP: viewRole === ROLES.MP,
        isAuthority: viewRole === ROLES.AUTHORITY,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

export default RoleContext;
