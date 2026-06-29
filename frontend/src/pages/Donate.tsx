import { useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { api, useCampaigns } from '../lib/api'
import { HandHeart, Copy, CheckCircle, Building2, Landmark, Hash, Send, Loader2, Target } from 'lucide-react'

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

const AMOUNTS = [500, 1000, 2000, 5000, 10000]

export default function Donate() {
  usePageTitle('Give & Support')
  const { data: campaigns = [] } = useCampaigns()
  const [form, setForm] = useState({ name: '', email: '', amount: '', message: '', is_anonymous: false })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Please enter a valid amount'); return }
    setSubmitting(true); setError('')
    try {
      await api.post('/donations', {
        name: form.is_anonymous ? null : (form.name || null),
        email: form.email || null,
        amount: parseFloat(form.amount),
        message: form.message || null,
        is_anonymous: form.is_anonymous,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

        {/* Active Campaigns */}
        {campaigns.length > 0 && (
          <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <h2 className="text-lg font-medium text-white">Active Campaigns</h2>
            </div>
            <div className="space-y-4">
              {campaigns.map((c: any) => {
                const pct = c.goal_amount ? Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100)) : 0
                return (
                  <div key={c.id} className="p-4 rounded-xl" style={{ background: 'rgba(240,190,100,0.03)', border: '1px solid var(--line)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-white">{c.title}</p>
                      {c.goal_amount && <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{pct}%</span>}
                    </div>
                    {c.description && <p className="text-xs mb-3" style={{ color: 'var(--dim)' }}>{c.description}</p>}
                    {c.goal_amount && (
                      <>
                        <div className="w-full h-1.5 rounded-full mb-1" style={{ background: 'rgba(240,190,100,0.1)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--gold)' }} />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--dim)' }}>
                          ₦{(c.current_amount || 0).toLocaleString()} raised of ₦{c.goal_amount.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
          </p>
        </div>

        {/* Donation notification form */}
        <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            <h2 className="text-lg font-medium text-white">Notify Us of Your Gift</h2>
          </div>
          <p className="text-xs mb-5" style={{ color: 'var(--dim)' }}>
            After transferring, let us know below so we can acknowledge your donation and keep records updated.
          </p>

          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#4ade80' }} />
              <p className="text-sm font-medium text-white mb-1">Thank you! Your gift has been recorded.</p>
              <p className="text-xs" style={{ color: 'var(--dim)' }}>May God multiply it back to you pressed down and running over.</p>
              <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', amount: '', message: '', is_anonymous: false }) }}
                className="mt-4 text-xs px-4 py-2 rounded-lg" style={{ background: 'rgba(240,190,100,0.08)', color: 'var(--gold)', border: '1px solid var(--line)' }}>
                Submit another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick amounts */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--dim)' }}>Quick amount (₦)</p>
                <div className="flex flex-wrap gap-2">
                  {AMOUNTS.map(a => (
                    <button key={a} type="button" onClick={() => setForm({ ...form, amount: String(a) })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: form.amount === String(a) ? 'rgba(201,162,39,0.15)' : 'rgba(240,190,100,0.04)',
                        border: `1px solid ${form.amount === String(a) ? 'rgba(201,162,39,0.4)' : 'var(--line)'}`,
                        color: form.amount === String(a) ? 'var(--gold)' : 'var(--dim)'
                      }}>
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--dim)' }}>Amount (₦) *</label>
                  <input type="number" min="1" placeholder="e.g. 5000" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} required
                    className="input-dark w-full" style={{ borderRadius: 8 }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--dim)' }}>Your Name</label>
                  <input type="text" placeholder="Full name" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    disabled={form.is_anonymous} className="input-dark w-full" style={{ borderRadius: 8 }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--dim)' }}>Email (optional)</label>
                  <input type="email" placeholder="For receipt / acknowledgement" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-dark w-full" style={{ borderRadius: 8 }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--dim)' }}>Message (optional)</label>
                  <textarea placeholder="Any message for the admin team..." value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={2} className="input-dark w-full" style={{ borderRadius: 8, resize: 'vertical' }} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_anonymous}
                  onChange={e => setForm({ ...form, is_anonymous: e.target.checked })}
                  className="rounded" />
                <span className="text-xs" style={{ color: 'var(--dim)' }}>Give anonymously</span>
              </label>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button type="submit" disabled={submitting || !form.amount}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)', color: 'var(--gold)' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Notify Admin of My Gift'}
              </button>
            </form>
          )}
        </div>

        {/* Giving impact */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <h2 className="text-lg font-medium text-white mb-4">Your giving supports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Gospel Broadcasting', 'Outreach Programs', 'Missions & Evangelism', 'Ministry Operations'].map(item => (
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

