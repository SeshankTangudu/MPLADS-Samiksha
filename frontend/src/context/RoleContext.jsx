import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectsAPI } from '../services/api';

const RoleContext = createContext();

export const ROLES = {
  CITIZEN: 'citizen',
  MP: 'mp',
  AUTHORITY: 'authority',
  SYSTEM_ADMIN: 'system_admin',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.MP]: 'MP',
  [ROLES.AUTHORITY]: 'Authority',
  [ROLES.SYSTEM_ADMIN]: 'System Administrator',
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

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mplads_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('mplads_auth_token') || null;
    } catch (e) {
      return null;
    }
  });

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

  const loginUser = (authData) => {
    if (authData && authData.token && authData.user) {
      setAuthToken(authData.token);
      setCurrentUser(authData.user);
      setViewRole(authData.user.role);
      if (authData.user.constituency) {
        setSelectedConstituency(authData.user.constituency);
      }
      try {
        localStorage.setItem('mplads_auth_token', authData.token);
        localStorage.setItem('mplads_current_user', JSON.stringify(authData.user));
        localStorage.setItem('mplads_view_role', authData.user.role);
        localStorage.setItem('mplads_user_id', authData.user.username);
        if (authData.user.district) {
          localStorage.setItem('mplads_user_district', authData.user.district);
        }
        if (authData.user.constituency) {
          localStorage.setItem('mplads_mp_constituency', authData.user.constituency);
        }
      } catch (e) {
        console.warn('Failed to persist auth data:', e);
      }
    }
  };

  const logoutUser = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setViewRole(ROLES.CITIZEN);
    try {
      localStorage.removeItem('mplads_auth_token');
      localStorage.removeItem('mplads_current_user');
      localStorage.removeItem('mplads_user_id');
      localStorage.removeItem('mplads_user_district');
      localStorage.setItem('mplads_view_role', ROLES.CITIZEN);
    } catch (e) {
      console.warn('Failed to clear auth storage:', e);
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
        currentUser,
        authToken,
        loginUser,
        logoutUser,
        selectedConstituency,
        changeConstituency,
        constituencyList,
        PROTOTYPE_CONSTITUENCIES: constituencyList,
        ROLES,
        ROLE_LABELS,
        isCitizen: viewRole === ROLES.CITIZEN,
        isMP: viewRole === ROLES.MP,
        isAuthority: viewRole === ROLES.AUTHORITY,
        isSystemAdmin: viewRole === ROLES.SYSTEM_ADMIN,
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
