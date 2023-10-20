import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { addUrlParamsRequestInterceptor } from '~axios-helper';

import { User } from './persistence/models/dm/User';

import { app } from '~/stores/app';

axios.defaults.baseURL = import.meta.env.VITE_DM_API_URL;

export const createAxios = (baseURL: string): AxiosInstance => {
  const newInstance = axios.create({ baseURL });
  addUrlParamsRequestInterceptor(newInstance);

  return newInstance;
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response.status === 401) {
      await app().dbInstance.getRepository(User).delete(1);

      const router = useRouter();
      router.push('/');
    }
  },
);
