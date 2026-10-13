import { useOutletContext } from 'react-router';

const OUTSIDE_APP_SHELL = { openCreateLink: null, linksVersion: 0 };

/**
 * Shared tools from the signed-in app layout (see AppLayout):
 * - openCreateLink(): opens the "Create link" dialog
 * - linksVersion: increases after a link is created, so pages can refresh
 */
export default function useAppShell() {
  return useOutletContext() ?? OUTSIDE_APP_SHELL;
}
