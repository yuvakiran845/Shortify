import { useEffect, useState } from 'react';
import { getAppConfig } from '../lib/appConfig';

// Returns the public app settings ({ shortLinkBaseUrl }) or null until they load.
// If the request fails, callers simply work without them.
export default function useAppConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let active = true;
    getAppConfig()
      .then((value) => active && setConfig(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return config;
}
