import { format } from "date-fns";
import { id } from "date-fns/locale";

interface StatusTimelineProps {
  status: string;
  createdAt: string;
  ownerReviewedAt?: string | null;
  headmasterApprovedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  requiresHeadmaster?: boolean;
}

export function StatusTimeline({
  status,
  createdAt,
  ownerReviewedAt,
  headmasterApprovedAt,
  startedAt,
  completedAt,
  requiresHeadmaster = false
}: StatusTimelineProps) {
  const steps = [
    {
      id: 'draft',
      label: 'Permintaan Dikirim',
      icon: '📝',
      timestamp: createdAt,
      active: true
    },
    {
      id: 'pending_owner',
      label: 'Ditinjau Pemilik',
      icon: '👨‍💼',
      timestamp: ownerReviewedAt,
      active: ['pending_owner', 'pending_headmaster', 'approved', 'active', 'completed'].includes(status)
    },
    ...(requiresHeadmaster ? [{
      id: 'pending_headmaster',
      label: 'Disetujui Kepsek',
      icon: '🏫',
      timestamp: headmasterApprovedAt,
      active: ['pending_headmaster', 'approved', 'active', 'completed'].includes(status)
    }] : []),
    {
      id: 'approved',
      label: 'Surat Siap',
      icon: '📜',
      timestamp: ownerReviewedAt || headmasterApprovedAt,
      active: ['approved', 'active', 'completed'].includes(status)
    },
    {
      id: 'active',
      label: 'Sedang Dipinjam',
      icon: '🚀',
      timestamp: startedAt,
      active: ['active', 'completed'].includes(status)
    },
    {
      id: 'completed',
      label: 'Selesai',
      icon: '✅',
      timestamp: completedAt,
      active: status === 'completed'
    }
  ];

  return (
    <div className="status-timeline">
      {steps.map((step, index) => (
        <div key={step.id} className={`step ${step.active ? 'active' : ''}`}>
          <div className="step-icon">
            {step.icon}
          </div>
          <div className="step-text">
            <div className="font-medium">{step.label}</div>
            {step.timestamp && step.active && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(step.timestamp), "dd MMM, HH:mm", { locale: id })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}