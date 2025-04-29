// Для изменения способа аутентификации с cookie на заголовок Authorization:

// 1. Изменения на сервере (server/src/controllers/auth.controller.ts):

// Вместо установки cookie:
/*
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000 
});
*/

// Отправляйте токен в ответе:
return res.status(200).json({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  token: token // Добавляем токен в ответ
});


// 2. Изменения в клиенте (client/src/utils/api.ts):

// Добавьте хранение токена в локальном хранилище:
const saveToken = (token) => {
  localStorage.setItem('auth_token', token);
};

const getToken = () => {
  return localStorage.getItem('auth_token');
};

const removeToken = () => {
  localStorage.removeItem('auth_token');
};

// Измените функцию fetch для использования токена:
/*
async fetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  
  // Добавляем токен в заголовок запроса, если он есть
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const config = {
    ...options,
    headers,
    credentials: 'include', // Можно оставить для обратной совместимости
  };
  
  // Остальной код функции остается без изменений
}
*/

// 3. Изменения в AuthContext (client/src/contexts/AuthContext.tsx):

// В функции login:
const login = useCallback(async (email, password) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    // Сохраняем токен
    if (response.token) {
      saveToken(response.token);
    }
    
    setUser(response);
    
    // После успешного входа подключаем WebSocket
    await socketService.connectAndWait();
    await socketService.authenticate(response.id);
  } catch (error) {
    setError(error.message || 'Ошибка при входе');
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

// В функции logout:
const logout = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    await api.post('/auth/logout', {});
    removeToken(); // Удаляем токен
    setUser(null);
    
    // Отключаем WebSocket при выходе
    socketService.disconnect();
  } catch (error) {
    setError(error.message || 'Ошибка при выходе');
    throw error;
  } finally {
    setLoading(false);
  }
}, []); 