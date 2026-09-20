import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectsAPI, AuthAPI } from '../services/api';

const RoleContext = createContext();

export const ROLES = {
  CITIZEN: 'citizen',
  MP: 'mp',
  AUTHORITY: 'authority',
  SYSTEM_ADMIN: 'system_admin',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen / Public',
  [ROLES.MP]: 'Member of Parliament',
  [ROLES.AUTHORITY]: 'District Authority',
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

  const [viewRole, setViewRole] = useState(() => {
    try {
      const saved = localStorage.getItem('mplads_view_role');
      if (saved && Object.values(ROLES).includes(saved)) {
        return saved;
      }
      return ROLES.CITIZEN;
    } catch (e) {
      return ROLES.CITIZEN;
    }
  });

  const [constituencyList, setConstituencyList] = useState(DEFAULT_CONSTITUENCIES);

  const [selectedConstituency, setSelectedConstituency] = useState(() => {
    try {
      const savedUser = localStorage.getItem('mplads_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.constituency) return parsed.constituency;
      }
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

  // Validate session against /auth/me on mount if token exists
  useEffect(() => {
    if (authToken && currentUser) {
      AuthAPI.getMe()
        .then((res) => {
          if (res && res.username) {
            setCurrentUser(res);
            setViewRole(res.role);
            if (res.constituency) {
              setSelectedConstituency(res.constituency);
            }
          }
        })
        .catch((err) => {
          if (err.status === 401 || err.status === 403) {
            console.warn('Session expired or invalidated by server, clearing state.');
            logoutUser();
          }
        });
    }
  }, [authToken]);

  const loginUser = (authData) => {
    if (authData && authData.token && authData.user) {
      const user = authData.user;
      setAuthToken(authData.token);
      setCurrentUser(user);
      setViewRole(user.role);

      const assignedConstituency = user.constituency || 'Varanasi';
      if (user.role === ROLES.MP) {
        setSelectedConstituency(assignedConstituency);
      }

      try {
        localStorage.setItem('mplads_auth_token', authData.token);
        localStorage.setItem('mplads_current_user', JSON.stringify(user));
        localStorage.setItem('mplads_view_role', user.role);
        localStorage.setItem('mplads_user_id', user.username);
        if (user.district) {
          localStorage.setItem('mplads_user_district', user.district);
        } else {
          localStorage.removeItem('mplads_user_district');
        }
        if (user.role === ROLES.MP) {
          localStorage.setItem('mplads_mp_constituency', assignedConstituency);
        }
      } catch (e) {
        console.warn('Failed to persist auth data:', e);
      }
    }
  };

  const logoutUser = () => {
    if (authToken) {
      AuthAPI.logout().catch(() => {});
    }
    setAuthToken(null);
    setCurrentUser(null);
    setViewRole(ROLES.CITIZEN);
    try {
      localStorage.removeItem('mplads_auth_token');
      localStorage.removeItem('mplads_current_user');
      localStorage.removeItem('mplads_user_id');
      localStorage.removeItem('mplads_user_district');
      localStorage.removeItem('mplads_mp_constituency');
      localStorage.setItem('mplads_view_role', ROLES.CITIZEN);
    } catch (e) {
      console.warn('Failed to clear auth storage:', e);
    }
  };

  const changeConstituency = (newConst) => {
    // If authenticated MP, enforce locked constituency
    if (currentUser && currentUser.role === ROLES.MP && currentUser.constituency) {
      console.warn('MP constituency is locked to assigned parliamentary constituency:', currentUser.constituency);
      return;
    }
    if (newConst && newConst.trim()) {
      setSelectedConstituency(newConst);
      try {
        localStorage.setItem('mplads_mp_constituency', newConst);
      } catch (e) {
        console.warn('Failed to persist MP constituency:', e);
      }
    }
  };

  // Direct role switching is deprecated in production auth mode
  const changeRole = (newRole) => {
    console.warn('Direct changeRole() is deprecated. Users must authenticate through /login.');
  };

  const isAuthenticated = Boolean(currentUser && authToken);

  return (
    <RoleContext.Provider
      value={{
        viewRole,
        changeRole,
        currentUser,
        authToken,
        isAuthenticated,
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
