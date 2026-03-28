import { getToken, getUser } from '../services/storageService';

function isAuthenticated() {
  const token = getToken();
  const user = getUser();

  return !!token && !!user;
}

export { isAuthenticated };