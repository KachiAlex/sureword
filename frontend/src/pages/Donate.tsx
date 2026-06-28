import { useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { HandHeart, Copy, CheckCircle, Building2, Landmark, Hash } from 'lucide-react'

function DetailRow({ icon: Icon, label, value, copyable = false }: { icon: any, label: string, value: string, copyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(240,190,100,0.03)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,162,39,0.12)' }}>
        <Icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-0.5" style={{ color: 'var(--dim)' }}>{label}</p>
        <p className="text-sm font-medium text-white break-words">{value}</p>
      </div>
      {copyable && (
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="shrink-0 p-2 rounded-lg transition-colors"
          style={{ background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(240,190,100,0.05)', color: copied ? '#4ade80' : 'var(--gold)' }}
          title="Copy to clipboard"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}

export default function Donate() {
  usePageTitle('Give & Support')

  return (
    <div className="min-h-screen bg-[#0f1016] text-[#fff0d4]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.25)' }}>
            <HandHeart className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">Give & Support</h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--dim)' }}>
            Your partnership helps us spread the Gospel, support outreach, and keep SUREWORD RADIO reaching lives.
          </p>
        </div>

        {/* Bank transfer card */}
        <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            <h2 className="text-lg font-medium text-white">Bank Transfer Details</h2>
          </div>

          <div className="space-y-3 mb-5">
            <DetailRow icon={Building2} label="Account Name" value="Sure Word Media Ministries" />
            <DetailRow icon={Hash} label="Account Number" value="1312546374" copyable />
            <DetailRow icon={Landmark} label="Bank" value="Zenith Bank" />
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
            Please include your name or phone number in the transfer narration so we can acknowledge your gift.
            For receipts or partnership enquiries, contact the admin team through the app.
          </p>
        </div>

        {/* Giving impact */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <h2 className="text-lg font-medium text-white mb-4">Your giving supports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Gospel Broadcasting',
              'Outreach Programs',
              'Missions & Evangelism',
              'Ministry Operations',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--parchment)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--dim)' }}>
          Thank you for sowing into this ministry. God bless you.
        </p>
      </div>
    </div>
  )
}

