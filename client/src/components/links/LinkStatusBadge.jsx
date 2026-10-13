import Badge from '../ui/Badge';

const STATUS = {
  active: { tone: 'success', label: 'Active' },
  expired: { tone: 'warning', label: 'Expired' },
  disabled: { tone: 'neutral', label: 'Turned off' },
};

export default function LinkStatusBadge({ status }) {
  const { tone, label } = STATUS[status] ?? STATUS.active;
  return <Badge tone={tone}>{label}</Badge>;
}
