// Toast text shown after logging in or signing up.
export function welcomeMessage(user, claimedLinks, { isNewAccount = false } = {}) {
  const firstName = user.name.split(' ')[0];
  const greeting = isNewAccount ? `Welcome to Shortify, ${firstName}!` : `Welcome back, ${firstName}!`;
  if (!claimedLinks) return greeting;
  const links = claimedLinks === 1 ? '1 link' : `${claimedLinks} links`;
  return `${greeting} ${links} you created on this browser ${claimedLinks === 1 ? 'was' : 'were'} added to your account.`;
}
