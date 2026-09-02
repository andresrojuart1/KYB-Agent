'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, MessageCircle, Mail, Calendar, Hash } from 'lucide-react'

interface Settings {
  max_follow_ups: string
  primary_channel: string
  cron_enabled: string
  cron_schedule: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    max_follow_ups: '3',
    primary_channel: 'whatsapp',
    cron_enabled: 'true',
    cron_schedule: 'every_monday',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="p-8 text-[#8b92a5]">Loading settings…</div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#8b92a5] mt-1">Configure follow-up behavior and automation.</p>
      </div>

      <div className="space-y-4">
        {/* Max follow-ups */}
        <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#1a1e28] flex items-center justify-center">
              <Hash size={16} className="text-[#6c63ff]" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Max Follow-ups per Client</p>
              <p className="text-[#8b92a5] text-xs">The agent will stop contacting a client after this many attempts.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['1', '2', '3', '4', '5'].map(n => (
              <button
                key={n}
                onClick={() => setSettings(s => ({ ...s, max_follow_ups: n }))}
                className={`w-10 h-10 rounded-xl font-semibold text-sm transition-colors ${
                  settings.max_follow_ups === n
                    ? 'bg-[#6c63ff] text-white'
                    : 'bg-[#1a1e28] text-[#8b92a5] hover:text-white border border-[#252836]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Primary channel */}
        <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#1a1e28] flex items-center justify-center">
              <MessageCircle size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Primary Channel</p>
              <p className="text-[#8b92a5] text-xs">The cron will use this channel first. Manual sends can override per message.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-400' },
              { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-400' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setSettings(s => ({ ...s, primary_channel: value }))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  settings.primary_channel === value
                    ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-[#a78bfa]'
                    : 'border-[#252836] text-[#8b92a5] hover:border-[#6c63ff]/50'
                }`}
              >
                <Icon size={16} className={settings.primary_channel === value ? undefined : color} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cron */}
        <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1e28] flex items-center justify-center">
                <Calendar size={16} className="text-[#6c63ff]" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Automated Cron</p>
                <p className="text-[#8b92a5] text-xs">Run follow-ups automatically on a schedule (Vercel Cron).</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, cron_enabled: s.cron_enabled === 'true' ? 'false' : 'true' }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.cron_enabled === 'true' ? 'bg-[#6c63ff]' : 'bg-[#252836]'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                settings.cron_enabled === 'true' ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {settings.cron_enabled === 'true' && (
            <div>
              <label className="block text-xs text-[#8b92a5] mb-2">Schedule</label>
              <select
                value={settings.cron_schedule}
                onChange={e => setSettings(s => ({ ...s, cron_schedule: e.target.value }))}
                className="w-full bg-[#1a1e28] border border-[#252836] rounded-xl text-sm text-[#f0f2f7] px-3 py-2.5 focus:outline-none focus:border-[#6c63ff]/50"
              >
                <option value="every_monday">Every Monday</option>
                <option value="every_tuesday">Every Tuesday</option>
                <option value="every_wednesday">Every Wednesday</option>
                <option value="every_thursday">Every Thursday</option>
                <option value="every_friday">Every Friday</option>
                <option value="twice_weekly">Twice a week (Mon + Thu)</option>
              </select>
              <p className="text-xs text-[#8b92a5] mt-2">
                Note: the actual cron trigger is defined in <code className="text-[#a78bfa]">vercel.json</code>. This setting controls whether the cron is processed when triggered.
              </p>
            </div>
          )}
        </div>

        {/* Redshift info */}
        <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1e28] flex items-center justify-center">
              <RefreshCw size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Redshift Connection</p>
              <p className="text-[#8b92a5] text-xs">Configured via environment variables.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#1a1e28] rounded-lg px-3 py-2">
              <span className="text-[#8b92a5]">Host: </span>
              <span className="text-[#f0f2f7]">{process.env.NEXT_PUBLIC_REDSHIFT_HOST_HINT ?? '(configured)'}</span>
            </div>
            <div className="bg-[#1a1e28] rounded-lg px-3 py-2">
              <span className="text-[#8b92a5]">Status: </span>
              <span className="text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6c63ff] hover:bg-[#7c74ff] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
